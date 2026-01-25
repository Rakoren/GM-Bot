import fs from 'fs';
import path from 'path';

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function parseStats(text) {
  const stats = {};
  const raw = String(text || '');
  const matches = raw.match(/(STR|DEX|CON|INT|WIS|CHA)\s*(\d+)/gi) || [];
  matches.forEach(match => {
    const parts = match.trim().split(/\s+/);
    if (parts.length >= 2) {
      stats[parts[0].toLowerCase()] = Number(parts[1]);
    }
  });
  return stats;
}

function getModifier(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 0;
  return Math.floor((value - 10) / 2);
}

function parseWeaponDamage(text) {
  const raw = String(text || '');
  const match = raw.match(/([0-9]+d[0-9]+)(?:\s*\+\s*([0-9]+))?/i);
  if (!match) return null;
  return {
    dice: match[1],
    flat: Number(match[2] || 0),
  };
}

function parseArmorAc(text) {
  const raw = String(text || '');
  const baseMatch = raw.match(/([0-9]+)/);
  const maxMatch = raw.match(/max\s*([0-9]+)/i);
  return {
    base: baseMatch ? Number(baseMatch[1]) : null,
    maxDex: maxMatch ? Number(maxMatch[1]) : null,
  };
}

function buildWeaponIndex(rows) {
  const map = new Map();
  rows.forEach(row => {
    const name = String(row.name || '').trim();
    if (!name) return;
    map.set(normalizeName(name), row);
  });
  return map;
}

function buildArmorIndex(rows) {
  const map = new Map();
  rows.forEach(row => {
    const name = String(row.name || '').trim();
    if (!name) return;
    map.set(normalizeName(name), row);
  });
  return map;
}

function parseEquipmentList(text) {
  return String(text || '')
    .split(/[+,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function getWeaponProficiencyFlags(raw) {
  const text = String(raw || '').toLowerCase();
  return {
    simple: text.includes('simple'),
    martial: text.includes('martial'),
  };
}

function weaponIsProficient(weaponRow, profFlags) {
  if (!weaponRow) return false;
  const category = String(weaponRow.category || '').toLowerCase();
  if (category.includes('simple')) return !!profFlags.simple;
  if (category.includes('martial')) return !!profFlags.martial;
  return false;
}

function getWeaponAbilityMod(weaponRow, stats) {
  const props = [
    weaponRow.properties,
    weaponRow.properties_1,
    weaponRow.properties_2,
    weaponRow.properties_3,
    weaponRow.properties_4,
  ]
    .filter(Boolean)
    .join(', ')
    .toLowerCase();
  const dex = getModifier(stats.dex);
  const str = getModifier(stats.str);
  const category = String(weaponRow.category || '').toLowerCase();
  if (props.includes('finesse')) return Math.max(dex, str);
  if (category.includes('ranged')) return dex;
  return str;
}

function computeArmorClass({ stats, equipmentList, armorIndex }) {
  const dexMod = getModifier(stats.dex);
  const items = equipmentList.map(name => armorIndex.get(normalizeName(name))).filter(Boolean);
  const shields = items.filter(item => String(item.category || '').toLowerCase().includes('shield'));
  const armors = items.filter(item => String(item.category || '').toLowerCase().includes('armor'));
  let ac = 10 + dexMod;
  if (armors.length) {
    const best = armors.reduce((acc, row) => {
      const parsed = parseArmorAc(row.ac);
      const base = Number.isFinite(parsed.base) ? parsed.base : 0;
      const maxDex = Number.isFinite(parsed.maxDex) ? parsed.maxDex : null;
      const dex = maxDex === null ? dexMod : Math.min(dexMod, maxDex);
      const value = base + dex;
      if (!acc || value > acc.value) return { row, value };
      return acc;
    }, null);
    if (best) ac = best.value;
  }
  if (shields.length) ac += 2;
  return ac;
}

function computeMaxHp({ hitDie, level, conMod }) {
  const die = Number(String(hitDie || '').replace(/[^\d]/g, ''));
  if (!Number.isFinite(die) || die <= 0 || !Number.isFinite(level)) return null;
  const avg = Math.floor(die / 2) + 1;
  if (level <= 1) return die + conMod;
  return die + conMod + (level - 1) * (avg + conMod);
}

function parseSpellSlots(row) {
  const slots = {};
  if (!row) return slots;
  for (let level = 1; level <= 9; level += 1) {
    const key = `spell_slots_level_${level}`;
    const total = Number(row[key]);
    if (Number.isFinite(total) && total > 0) {
      slots[level] = { total, spent: 0 };
    }
  }
  return slots;
}

function buildCombatantId(prefix, value) {
  return `${prefix}_${String(value || '').replace(/\s+/g, '_').toLowerCase()}`;
}

export function createCombatEngine({
  datasetRoot,
  parseCsv,
  lookupReferenceByName,
  lookupClassById,
  getClassProgressionRow,
  parseDiceExpression,
  rollDice,
  formatDiceResult,
}) {
  const weaponsPath = path.join(datasetRoot, 'weapons.csv');
  const armorPath = path.join(datasetRoot, 'armor.csv');
  const weaponsCsv = fs.existsSync(weaponsPath) ? fs.readFileSync(weaponsPath, 'utf8') : '';
  const armorCsv = fs.existsSync(armorPath) ? fs.readFileSync(armorPath, 'utf8') : '';
  const weapons = buildWeaponIndex(parseCsv(weaponsCsv).rows || []);
  const armor = buildArmorIndex(parseCsv(armorCsv).rows || []);

  function buildCombatantFromProfile(userId, profile) {
    const stats = parseStats(profile?.stats);
    const classInput = profile?.class || profile?.class_id || '';
    const classRow = String(classInput || '').startsWith('CLS_')
      ? lookupClassById(classInput)
      : lookupReferenceByName('classes', classInput);
    const level = Number(profile?.level || 1);
    const hitDie = classRow?.hit_die || '';
    const conMod = getModifier(stats.con);
    const savedMaxHp = Number(profile?.combat_max_hp);
    const savedCurrentHp = Number(profile?.combat_current_hp);
    const maxHp = Number.isFinite(savedMaxHp) ? savedMaxHp : computeMaxHp({ hitDie, level, conMod });
    const equipmentList = parseEquipmentList(profile?.equipment);
    let inventoryItems = [];
    if (profile?.inventory_items) {
      try {
        const parsed = JSON.parse(profile.inventory_items);
        if (Array.isArray(parsed)) inventoryItems = parsed;
      } catch (err) {
        inventoryItems = [];
      }
    }
    const inventoryNames = inventoryItems.map(item => String(item.name || '')).filter(Boolean);
    const acOverride = Number(profile?.combat_ac);
    const ac = Number.isFinite(acOverride)
      ? acOverride
      : computeArmorClass({
          stats,
          equipmentList: inventoryNames.length ? inventoryNames : equipmentList,
          armorIndex: armor,
        });
    const progression = classRow ? getClassProgressionRow(classRow.class_id, level) : null;
    const profText = progression?.proficiency_bonus || '+2';
    const prof = Number(String(profText).replace(/[^\d-]/g, '')) || 2;
    const profFlags = getWeaponProficiencyFlags(classRow?.weapon_proficiencies);
    const spellSlots = parseSpellSlots(progression);
    const savingThrows = String(classRow?.saving_throws || '')
      .split(/[,/]/)
      .map(item => item.trim().toLowerCase())
      .filter(Boolean);
    let weaponsOwned = [];
    if (inventoryItems.length) {
      let handEquip = null;
      if (profile?.hand_equip) {
        try {
          const parsed = JSON.parse(profile.hand_equip);
          if (parsed && typeof parsed === 'object') handEquip = parsed;
        } catch (err) {
          handEquip = null;
        }
      }
      const byKey = new Map(
        inventoryItems.map(item => [String(item.key || '').toLowerCase(), String(item.name || '')])
      );
      const equippedWeaponNames = [];
      if (handEquip?.left) {
        const name = byKey.get(String(handEquip.left).toLowerCase());
        if (name) equippedWeaponNames.push(name);
      }
      if (handEquip?.right) {
        const name = byKey.get(String(handEquip.right).toLowerCase());
        if (name) equippedWeaponNames.push(name);
      }
      const uniqueEquipped = Array.from(new Set(equippedWeaponNames));
      weaponsOwned = uniqueEquipped.length
        ? uniqueEquipped
        : inventoryNames
            .map(name => weapons.get(normalizeName(name)))
            .filter(Boolean)
            .map(row => row.name);
    } else {
      weaponsOwned = equipmentList
        .map(name => weapons.get(normalizeName(name)))
        .filter(Boolean)
        .map(row => row.name);
    }
    return {
      id: buildCombatantId('player', userId),
      type: 'player',
      userId,
      name: profile?.name || `Player ${userId}`,
      classId: classRow?.class_id || profile?.class_id || null,
      level,
      stats,
      maxHp: Number.isFinite(maxHp) ? maxHp : null,
      hp: Number.isFinite(savedCurrentHp) ? savedCurrentHp : (Number.isFinite(maxHp) ? maxHp : null),
      ac: Number.isFinite(ac) ? ac : null,
      prof,
      profFlags,
      savingThrows,
      equipment: inventoryNames.length ? inventoryNames : equipmentList,
      weapons: weaponsOwned,
      conditions: [],
      spellSlots,
    };
  }

  function createCombat(session, { name, channelId, createdBy }) {
    const combat = {
      id: `combat_${Date.now()}`,
      name: name || 'Combat',
      channelId,
      createdBy,
      status: 'setup',
      round: 0,
      turnIndex: 0,
      initiativeOrder: [],
      combatants: {},
      log: [],
    };
    session.combat = combat;
    return combat;
  }

  function getCombat(session) {
    return session?.combat || null;
  }

  function addCombatant(combat, combatant) {
    if (!combat || !combatant) return null;
    combat.combatants[combatant.id] = combatant;
    return combatant;
  }

  function addNpc(combat, { name, hp, ac, initiative }) {
    if (!combat) return null;
    const id = buildCombatantId('npc', name || Date.now());
    const combatant = {
      id,
      type: 'npc',
      name: name || 'NPC',
      maxHp: Number.isFinite(hp) ? hp : null,
      hp: Number.isFinite(hp) ? hp : null,
      ac: Number.isFinite(ac) ? ac : null,
      initiative: Number.isFinite(initiative) ? initiative : null,
      conditions: [],
      stats: {},
      prof: 2,
      profFlags: {},
      savingThrows: [],
      equipment: [],
      weapons: [],
      spellSlots: {},
    };
    combat.combatants[id] = combatant;
    return combatant;
  }

  function setInitiative(combat, combatantId, value) {
    if (!combat) return null;
    const combatant = combat.combatants[combatantId];
    if (!combatant) return null;
    combatant.initiative = Number(value);
    return combatant;
  }

  function rollInitiative(combat, combatantId, { advantage = false, disadvantage = false } = {}) {
    const combatant = combat?.combatants?.[combatantId];
    if (!combatant) return null;
    const dexMod = getModifier(combatant.stats?.dex);
    const result = rollDice({ count: 1, sides: 20, mod: dexMod, advantage, disadvantage });
    combatant.initiative = result.total;
    return result;
  }

  function beginCombat(combat) {
    if (!combat) return null;
    combat.initiativeOrder = Object.values(combat.combatants)
      .filter(c => Number.isFinite(c.initiative))
      .sort((a, b) => b.initiative - a.initiative)
      .map(c => c.id);
    combat.round = 1;
    combat.turnIndex = 0;
    combat.status = 'active';
    return combat;
  }

  function getActiveCombatant(combat) {
    if (!combat || combat.status !== 'active') return null;
    const id = combat.initiativeOrder[combat.turnIndex];
    return combat.combatants[id] || null;
  }

  function nextTurn(combat) {
    if (!combat || combat.status !== 'active') return null;
    if (!combat.initiativeOrder.length) return null;
    combat.turnIndex = (combat.turnIndex + 1) % combat.initiativeOrder.length;
    if (combat.turnIndex === 0) combat.round += 1;
    return getActiveCombatant(combat);
  }

  function attack({
    combat,
    attackerId,
    targetId,
    weaponName,
    advantage = false,
    disadvantage = false,
    overrideDamage = null,
  }) {
    const attacker = combat?.combatants?.[attackerId];
    const target = combat?.combatants?.[targetId];
    if (!attacker || !target) return { error: 'Invalid attacker or target.' };
    const weaponRow = weaponName ? weapons.get(normalizeName(weaponName)) : null;
    const abilityMod = weaponRow ? getWeaponAbilityMod(weaponRow, attacker.stats) : 0;
    const proficient = weaponIsProficient(weaponRow, attacker.profFlags);
    const toHitMod = abilityMod + (proficient ? attacker.prof : 0);
    const roll = rollDice({ count: 1, sides: 20, mod: toHitMod, advantage, disadvantage });
    const hit = Number.isFinite(target.ac) ? roll.total >= target.ac : true;
    let damageResult = null;
    let damageTotal = 0;
    if (hit) {
      if (overrideDamage) {
        const parsed = parseDiceExpression(String(overrideDamage));
        if (parsed.ok) {
          damageResult = rollDice(parsed.value);
          damageTotal = damageResult.total;
        }
      } else if (weaponRow) {
        const parsed = parseWeaponDamage(weaponRow.damage);
        if (parsed) {
          const totalMod = abilityMod + parsed.flat;
          const modText = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;
          const expr = `${parsed.dice}${modText}`;
          const parsedExpr = parseDiceExpression(expr);
          if (parsedExpr.ok) {
            damageResult = rollDice(parsedExpr.value);
            damageTotal = damageResult.total;
          }
        }
      }
      if (Number.isFinite(target.hp)) {
        target.hp = Math.max(0, target.hp - damageTotal);
      }
    }
    return {
      hit,
      roll,
      damageResult,
      damageTotal,
      target,
      attacker,
      weapon: weaponRow?.name || weaponName || 'Unarmed',
    };
  }

  function applyDamage(combat, targetId, amount) {
    const target = combat?.combatants?.[targetId];
    if (!target || !Number.isFinite(amount)) return null;
    if (!Number.isFinite(target.hp)) target.hp = 0;
    target.hp = Math.max(0, target.hp - amount);
    return target;
  }

  function addCondition(combat, targetId, condition) {
    const target = combat?.combatants?.[targetId];
    if (!target) return null;
    const clean = String(condition || '').trim();
    if (!clean) return null;
    if (!target.conditions.includes(clean)) target.conditions.push(clean);
    return target;
  }

  function removeCondition(combat, targetId, condition) {
    const target = combat?.combatants?.[targetId];
    if (!target) return null;
    const clean = String(condition || '').trim();
    if (!clean) return null;
    target.conditions = target.conditions.filter(item => item !== clean);
    return target;
  }

  function spendSpellSlot(combat, casterId, level) {
    const caster = combat?.combatants?.[casterId];
    if (!caster) return { ok: false, message: 'Caster not found.' };
    const slots = caster.spellSlots?.[level];
    if (!slots) return { ok: false, message: 'No slots for that level.' };
    if (slots.spent >= slots.total) return { ok: false, message: 'No spell slots left.' };
    slots.spent += 1;
    return { ok: true, remaining: slots.total - slots.spent };
  }

  function rollSavingThrow(combat, targetId, ability, dc, { advantage = false, disadvantage = false } = {}) {
    const target = combat?.combatants?.[targetId];
    if (!target) return { error: 'Target not found.' };
    const key = String(ability || '').toLowerCase().slice(0, 3);
    const mod = getModifier(target.stats?.[key]);
    const proficient = target.savingThrows?.includes(
      key === 'con' ? 'constitution' :
      key === 'dex' ? 'dexterity' :
      key === 'str' ? 'strength' :
      key === 'int' ? 'intelligence' :
      key === 'wis' ? 'wisdom' :
      key === 'cha' ? 'charisma' : key
    );
    const totalMod = mod + (proficient ? target.prof : 0);
    const result = rollDice({ count: 1, sides: 20, mod: totalMod, advantage, disadvantage });
    const success = Number.isFinite(dc) ? result.total >= dc : null;
    return { result, success };
  }

  function formatCombatStatus(combat) {
    if (!combat) return 'No active combat.';
    const lines = [`${combat.name} (${combat.status})`];
    lines.push(`Round: ${combat.round || 0}`);
    if (combat.status === 'active') {
      const active = getActiveCombatant(combat);
      if (active) lines.push(`Turn: ${active.name}`);
    }
    const order = combat.initiativeOrder.map(id => {
      const c = combat.combatants[id];
      return c ? `${c.name} (${c.initiative ?? '?'})` : '';
    }).filter(Boolean);
    if (order.length) lines.push(`Order: ${order.join(' -> ')}`);
    const roster = Object.values(combat.combatants).map(c => {
      const hp = Number.isFinite(c.hp) ? `${c.hp}/${c.maxHp ?? '?'}` : '?';
      const ac = Number.isFinite(c.ac) ? c.ac : '?';
      const cond = c.conditions?.length ? ` [${c.conditions.join(', ')}]` : '';
      return `- ${c.name} (AC ${ac}, HP ${hp})${cond}`;
    });
    if (roster.length) lines.push(...roster);
    return lines.join('\n');
  }

  return {
    buildCombatantFromProfile,
    createCombat,
    getCombat,
    addCombatant,
    addNpc,
    setInitiative,
    rollInitiative,
    beginCombat,
    nextTurn,
    getActiveCombatant,
    attack,
    applyDamage,
    addCondition,
    removeCondition,
    spendSpellSlot,
    rollSavingThrow,
    formatCombatStatus,
  };
}
