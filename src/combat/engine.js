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
  const bonusMatch = raw.match(/^\s*\+(\d+)/);
  if (bonusMatch) {
    return { base: 0, maxDex: 0, bonus: Number(bonusMatch[1]) };
  }
  const baseMatch = raw.match(/([0-9]+)/);
  const maxMatch = raw.match(/max\s*([0-9]+)/i);
  const hasDex = /dex/i.test(raw);
  return {
    base: baseMatch ? Number(baseMatch[1]) : null,
    maxDex: maxMatch ? Number(maxMatch[1]) : (hasDex ? null : 0),
    bonus: 0,
  };
}

function mapWeaponRow(row) {
  const name = String(row?.name || '').trim();
  if (!name) return null;
  const properties = Array.isArray(row.properties)
    ? row.properties.join(', ')
    : String(row.properties || row.properties_1 || '').trim();
  return {
    name,
    weapon_category: row.weapon_category || row.category || '',
    weapon_type: row.weapon_type || row.type || '',
    properties,
    damage: row.damage || '',
  };
}

function mapArmorRow(row) {
  const name = String(row?.name || '').trim();
  if (!name) return null;
  return {
    name,
    item_type: row.item_type || 'armor',
    armor_category: row.armor_category || row.category || '',
    armor_class: row.armor_class || row.ac || '',
  };
}

function buildWeaponIndex(rows) {
  const map = new Map();
  rows.forEach(row => {
    const mapped = mapWeaponRow(row);
    if (!mapped) return;
    map.set(normalizeName(mapped.name), mapped);
  });
  return map;
}

function buildArmorIndex(rows) {
  const map = new Map();
  rows.forEach(row => {
    const mapped = mapArmorRow(row);
    if (!mapped) return;
    map.set(normalizeName(mapped.name), mapped);
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
  const category = String(weaponRow.weapon_category || weaponRow.category || '').toLowerCase();
  if (category.includes('simple')) return !!profFlags.simple;
  if (category.includes('martial')) return !!profFlags.martial;
  return false;
}

function getWeaponAbilityMod(weaponRow, stats) {
  const props = String(weaponRow.properties || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
    .join(', ');
  const dex = getModifier(stats.dex);
  const str = getModifier(stats.str);
  const category = String(weaponRow.weapon_type || weaponRow.category || '').toLowerCase();
  if (props.includes('finesse')) return Math.max(dex, str);
  if (category.includes('ranged')) return dex;
  return str;
}

function computeArmorClass({ stats, equipmentList, armorIndex }) {
  const dexMod = getModifier(stats.dex);
  const items = equipmentList.map(name => armorIndex.get(normalizeName(name))).filter(Boolean);
  const shields = items.filter(item => /shield/i.test(String(item.armor_category || item.category || '')));
  const armors = items.filter(item => !/shield/i.test(String(item.armor_category || item.category || '')));
  let ac = 10 + dexMod;
  if (armors.length) {
    const best = armors.reduce((acc, row) => {
      const parsed = parseArmorAc(row.armor_class || row.ac);
      const base = Number.isFinite(parsed.base) ? parsed.base : 0;
      const maxDex = Number.isFinite(parsed.maxDex) ? parsed.maxDex : null;
      const dex = maxDex === null ? dexMod : Math.min(dexMod, maxDex);
      const value = base + dex;
      if (!acc || value > acc.value) return { row, value };
      return acc;
    }, null);
    if (best) ac = best.value;
  }
  if (shields.length) {
    const bonus = shields.reduce((sum, row) => {
      const parsed = parseArmorAc(row.armor_class || row.ac);
      return sum + (Number.isFinite(parsed.bonus) ? parsed.bonus : 2);
    }, 0);
    ac += bonus;
  }
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

function parseSpellSlotsFromObject(obj) {
  const slots = {};
  if (!obj || typeof obj !== 'object') return slots;
  for (let level = 1; level <= 9; level += 1) {
    const val = obj[String(level)] ?? obj[level];
    const total = Number(val);
    if (Number.isFinite(total) && total > 0) {
      slots[level] = { total, spent: 0 };
    }
  }
  return slots;
}

function normalizeResourceKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getSubclassResourceTableRow(rulesRegistry, subclassData, level) {
  if (!rulesRegistry?.lookupById || !subclassData || !level) return null;
  const tables = Array.isArray(subclassData.tables) ? subclassData.tables : [];
  for (const tableId of tables) {
    const tableEntry = rulesRegistry.lookupById(tableId);
    const tableData = tableEntry?.data;
    if (!tableData?.entry_schema || tableData.entry_schema.type !== 'subclass_resource_table') continue;
    const fields = Array.isArray(tableData.entry_schema.fields) ? tableData.entry_schema.fields : [];
    const levelField = fields.find(field => String(field).endsWith('_level')) || fields.find(field => field === 'level');
    if (!levelField) continue;
    const entries = Array.isArray(tableData.entries) ? tableData.entries : [];
    const best = entries
      .filter(entry => Number(entry[levelField]) <= Number(level))
      .sort((a, b) => Number(b[levelField]) - Number(a[levelField]))[0];
    if (best) return best;
  }
  return null;
}

function getSubclassSpellcastingRow(rulesRegistry, subclassData, level) {
  if (!rulesRegistry?.lookupById || !subclassData || !level) return null;
  const tables = Array.isArray(subclassData.tables) ? subclassData.tables : [];
  for (const tableId of tables) {
    const tableEntry = rulesRegistry.lookupById(tableId);
    const tableData = tableEntry?.data;
    if (!tableData?.entry_schema || tableData.entry_schema.type !== 'subclass_spellcasting_table') continue;
    const fields = Array.isArray(tableData.entry_schema.fields) ? tableData.entry_schema.fields : [];
    const levelField = fields.find(field => String(field).endsWith('_level')) || fields.find(field => field === 'level');
    if (!levelField) continue;
    const entries = Array.isArray(tableData.entries) ? tableData.entries : [];
    const best = entries
      .filter(entry => Number(entry[levelField]) <= Number(level))
      .sort((a, b) => Number(b[levelField]) - Number(a[levelField]))[0];
    if (best) return best;
  }
  return null;
}

function getClassTableRow(rulesRegistry, classId, level) {
  if (!rulesRegistry?.lookupById || !classId || !level) return null;
  const classEntry = rulesRegistry.lookupById(classId);
  const classData = classEntry?.data;
  const tables = Array.isArray(classData?.tables) ? classData.tables : [];
  for (const tableId of tables) {
    const tableEntry = rulesRegistry.lookupById(tableId);
    const tableData = tableEntry?.data;
    if (!tableData?.entry_schema || tableData.entry_schema.type !== 'class_features_table') continue;
    const row = (tableData.entries || []).find(e => Number(e.level) === Number(level));
    if (row) return row;
  }
  return null;
}

function computeResourceMax(resource, { level, tableRow, stats, prof }) {
  if (!resource) return null;
  const poolType = resource.pool_type || '';
  const pool = resource.pool;
  const chaMod = stats ? getModifier(stats.cha) : null;
  const profBonus = Number.isFinite(prof) ? prof : null;

  if (poolType === 'fixed') {
    const value = Number(pool);
    return Number.isFinite(value) ? value : null;
  }

  if (poolType === 'by_level') {
    if (typeof pool === 'number') return pool;
    const poolText = String(pool || '').toLowerCase();
    const match = poolText.match(/_level_x(\d+)/);
    if (match) return Number(level) * Number(match[1]);
    if (poolText.includes('level')) return Number(level);
    if (poolText.includes('cha') && Number.isFinite(chaMod)) return chaMod;
    if ((poolText.includes('prof') || poolText.includes('proficiency')) && Number.isFinite(profBonus)) {
      return profBonus;
    }
    const value = Number(poolText);
    return Number.isFinite(value) ? value : null;
  }

  if (poolType === 'see_class_table') {
    if (resource.id === 'res.bardic_inspiration') {
      if (!Number.isFinite(chaMod)) return null;
      return Math.max(1, chaMod);
    }
    if (resource.id === 'res.action_surge') {
      if (Number(level) >= 17) return 2;
      if (Number(level) >= 2) return 1;
      return 0;
    }
    const tableFieldByResource = {
      'res.rage': 'rages',
      'res.second_wind': 'second_wind',
      'res.channel_divinity.cleric': 'channel_divinity',
      'res.channel_divinity.paladin': 'channel_divinity',
      'res.wild_shape': 'wild_shape',
      'res.sorcery_points': 'sorcery_points',
      'res.pact_magic_slots': 'spell_slots',
    };
    const field = tableFieldByResource[resource.id];
    if (field && tableRow && tableRow[field] != null) {
      const value = Number(tableRow[field]);
      return Number.isFinite(value) ? value : null;
    }
    return null;
  }

  return null;
}

function buildCombatResources({ rulesRegistry, classId, level, stats, prof }) {
  if (!rulesRegistry?.lookupById || !classId || !level) return {};
  const classEntry = rulesRegistry.lookupById(classId);
  const classData = classEntry?.data;
  const resourceIds = Array.isArray(classData?.resources) ? classData.resources : [];
  if (!resourceIds.length) return {};
  const tableRow = getClassTableRow(rulesRegistry, classId, level);
  const resources = {};

  for (const resourceId of resourceIds) {
    const resourceEntry = rulesRegistry.lookupById(resourceId);
    const resource = resourceEntry?.data;
    if (!resource) continue;
    let max = computeResourceMax(resource, { level, tableRow, stats, prof });
    if (!Number.isFinite(max)) max = null;
    if (max == null && Number.isFinite(resource.uses_initial)) {
      max = Number(resource.uses_initial);
    }
    resources[resourceId] = {
      id: resourceId,
      name: resource.name || resourceId,
      current: Number.isFinite(max) ? max : null,
      max: Number.isFinite(max) ? max : null,
      recharge: resource.recharge || null,
      activation: resource.activation || null,
      pool_type: resource.pool_type || null,
      notes: Array.isArray(resource.notes) ? resource.notes : [],
    };
    if (resourceId === 'res.pact_magic_slots' && tableRow?.slot_level != null) {
      resources[resourceId].slot_level = tableRow.slot_level;
    }
  }

  if (classId === 'class.warlock' && tableRow?.eldritch_invocations != null) {
    const max = Number(tableRow.eldritch_invocations);
    if (Number.isFinite(max)) {
      resources['res.eldritch_invocations'] = {
        id: 'res.eldritch_invocations',
        name: 'Eldritch Invocations (Known)',
        current: max,
        max,
        recharge: null,
        activation: null,
        pool_type: 'see_class_table',
        notes: ['warlock_only', 'tracks_known_invocations'],
      };
    }
  }

  return resources;
}

function getDieSizeAtLevel(dieMap, level) {
  if (!dieMap || typeof dieMap !== 'object') return null;
  const thresholds = Object.keys(dieMap)
    .map(key => Number(key))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  let current = null;
  for (const threshold of thresholds) {
    if (Number(level) >= threshold) current = dieMap[threshold];
  }
  return current || dieMap[thresholds[0]] || null;
}

function buildSubclassResources({ rulesRegistry, subclassId, level }) {
  if (!rulesRegistry?.lookupById || !subclassId || !level) return {};
  const subclassEntry = rulesRegistry.lookupById(subclassId);
  const subclassData = subclassEntry?.data;
  if (!subclassData) return {};
  const resources = {};

  const subclassResourceMap = {
    'fighter.battle_master': 'res.superiority_dice',
    'fighter.psi_warrior': 'res.psionic_energy_dice.fighter',
    'rogue.soulknife': 'res.psionic_energy_dice.soulknife',
  };

  const resourceId = subclassResourceMap[subclassId];
  if (!resourceId) return resources;
  const resourceEntry = rulesRegistry.lookupById(resourceId);
  const resource = resourceEntry?.data;
  if (!resource) return resources;

  let max = null;
  let dieSize = null;

  if (resourceId === 'res.superiority_dice') {
    if (Number(level) >= 3) {
      max = 4;
      if (Number(level) >= 7) max += 1;
      if (Number(level) >= 15) max += 1;
      dieSize = getDieSizeAtLevel(resource.die, level);
    }
  } else {
    const row = getSubclassResourceTableRow(rulesRegistry, subclassData, level);
    if (row) {
      max = Number(row.dice_count);
      dieSize = row.die_size || null;
    }
  }

  if (!Number.isFinite(max)) max = null;
  resources[resourceId] = {
    id: resourceId,
    name: resource.name || resourceId,
    current: Number.isFinite(max) ? max : null,
    max: Number.isFinite(max) ? max : null,
    recharge: resource.recharge || null,
    activation: resource.activation || null,
    pool_type: resource.pool_type || null,
    notes: Array.isArray(resource.notes) ? resource.notes : [],
    die_size: dieSize || null,
  };

  return resources;
}

function parseInvocationList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
  const raw = String(value || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(v => String(v || '').trim()).filter(Boolean);
    }
  } catch {
    // ignore JSON parse errors
  }
  return raw
    .split(/[,;\n]/g)
    .map(item => item.trim())
    .filter(Boolean);
}

function extractInvocationUsage(invocation) {
  if (!invocation) return null;
  const text = [
    ...(Array.isArray(invocation.effects) ? invocation.effects : []),
    ...(Array.isArray(invocation.notes) ? invocation.notes : []),
  ]
    .join(' ')
    .toLowerCase();
  if (!text.includes('once')) return null;
  if (text.includes('long rest')) return { max: 1, recharge: 'long_rest' };
  if (text.includes('short rest')) return { max: 1, recharge: 'short_or_long_rest' };
  return null;
}

function buildInvocationResources({ rulesRegistry, invocationList }) {
  if (!rulesRegistry?.lookupById || !rulesRegistry?.lookupByName) return {};
  const resources = {};
  const list = parseInvocationList(invocationList);
  if (!list.length) return resources;
  for (const entry of list) {
    const byId = rulesRegistry.lookupById(entry);
    const byName = byId || rulesRegistry.lookupByName('invocation', entry);
    const inv = byName?.data;
    if (!inv) continue;
    const usage = extractInvocationUsage(inv);
    if (!usage) continue;
    const resourceId = `res.invocation.${inv.id || normalizeResourceKey(inv.name)}`;
    resources[resourceId] = {
      id: resourceId,
      name: inv.name || entry,
      current: usage.max,
      max: usage.max,
      recharge: usage.recharge,
      activation: null,
      pool_type: 'invocation',
      notes: ['invocation_usage'],
    };
  }
  return resources;
}

function buildCombatantId(prefix, value) {
  return `${prefix}_${String(value || '').replace(/\s+/g, '_').toLowerCase()}`;
}

export function createCombatEngine({
  datasetRoot,
  parseCsv,
  rulesRegistry,
  lookupReferenceByName,
  lookupClassById,
  getClassProgressionRow,
  parseDiceExpression,
  rollDice,
  formatDiceResult,
}) {
  let weapons = new Map();
  let armor = new Map();
  if (rulesRegistry?.byType) {
    const itemEntries = rulesRegistry.byType.get('item') || [];
    const weaponItems = itemEntries
      .map(entry => entry.data)
      .filter(item => item?.item_type === 'weapon');
    const armorItems = itemEntries
      .map(entry => entry.data)
      .filter(item => item?.item_type === 'armor');
    weapons = buildWeaponIndex(weaponItems);
    armor = buildArmorIndex(armorItems);
  } else {
    const weaponsPath = path.join(datasetRoot, 'weapons.csv');
    const armorPath = path.join(datasetRoot, 'armor.csv');
    const weaponsCsv = fs.existsSync(weaponsPath) ? fs.readFileSync(weaponsPath, 'utf8') : '';
    const armorCsv = fs.existsSync(armorPath) ? fs.readFileSync(armorPath, 'utf8') : '';
    weapons = buildWeaponIndex(parseCsv(weaponsCsv).rows || []);
    armor = buildArmorIndex(parseCsv(armorCsv).rows || []);
  }

  const resolveItemByName = (name) => {
    if (!name) return null;
    const aliasEntry = rulesRegistry?.getItemByAlias
      ? rulesRegistry.getItemByAlias(name)
      : null;
    if (aliasEntry?.data) return aliasEntry.data;
    if (aliasEntry && aliasEntry.item_type) return aliasEntry;
    const norm = normalizeName(name);
    return armor.get(norm) || weapons.get(norm) || null;
  };

  function buildCombatantFromProfile(userId, profile) {
    const stats = parseStats(profile?.stats);
    const classInput = profile?.class || profile?.class_id || '';
    const classRow = String(classInput || '').startsWith('CLS_')
      ? lookupClassById(classInput)
      : lookupReferenceByName('classes', classInput);
    const subclassInput = profile?.subclass_id || profile?.subclass || '';
    const subclassEntry = rulesRegistry?.lookupById && subclassInput
      ? (rulesRegistry.lookupById(subclassInput) || null)
      : null;
    const subclassByName = !subclassEntry && rulesRegistry?.lookupByName
      ? rulesRegistry.lookupByName('subclasses', subclassInput)
      : null;
    const subclassId = subclassEntry?.id || subclassByName?.id || null;
    const subclassData = subclassEntry?.data || subclassByName?.data || null;
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
          equipmentList: (inventoryNames.length ? inventoryNames : equipmentList)
            .map(name => resolveItemByName(name)?.name || name),
          armorIndex: armor,
        });
    const progression = classRow ? getClassProgressionRow(classRow.class_id, level) : null;
    const profText = progression?.proficiency_bonus || '+2';
    const prof = Number(String(profText).replace(/[^\d-]/g, '')) || 2;
    const resources = classRow?.class_id
      ? buildCombatResources({
          rulesRegistry,
          classId: classRow.class_id,
          level,
          stats,
          prof,
        })
      : {};
    const subclassResources = subclassId
      ? buildSubclassResources({
          rulesRegistry,
          subclassId,
          level,
        })
      : {};
    const invocationResources = buildInvocationResources({
      rulesRegistry,
      invocationList: profile?.invocations || profile?.invocation_refs || null,
    });
    const mergedResources = { ...resources, ...subclassResources, ...invocationResources };
    const profFlags = getWeaponProficiencyFlags(classRow?.weapon_proficiencies);
    let spellSlots = parseSpellSlots(progression);
    if (subclassData) {
      const subclassSpellRow = getSubclassSpellcastingRow(rulesRegistry, subclassData, level);
      if (subclassSpellRow?.spell_slots) {
        spellSlots = parseSpellSlotsFromObject(subclassSpellRow.spell_slots);
      }
    }
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
        .map(name => resolveItemByName(name))
        .filter(item => item && item.item_type === 'weapon')
        .map(item => item.name);
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
      resources: mergedResources,
    };
  }

  function createCombat(session, { name, channelId, createdBy }) {
    const combat = {
      id: `combat_${Date.now()}`,
      name: name || 'Combat',
      channelId,
      createdBy,
      status: 'setup',
      phase: 'initiative',
      round: 0,
      turnIndex: 0,
      initiativeOrder: [],
      combatants: {},
      turnState: {},
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
      resources: {},
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
    combat.phase = 'turn-start';
    const activeId = combat.initiativeOrder[combat.turnIndex];
    if (activeId) resetTurnState(combat, activeId);
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
    combat.phase = 'turn-start';
    const activeId = combat.initiativeOrder[combat.turnIndex];
    if (activeId) resetTurnState(combat, activeId);
    return getActiveCombatant(combat);
  }

  function resetTurnState(combat, combatantId) {
    if (!combat || !combatantId) return null;
    combat.turnState[combatantId] = {
      actionUsed: false,
      bonusUsed: false,
      reactionUsed: false,
    };
    return combat.turnState[combatantId];
  }

  function getTurnState(combat, combatantId) {
    if (!combat || !combatantId) return null;
    return combat.turnState[combatantId] || resetTurnState(combat, combatantId);
  }

  function useAction(combat, combatantId) {
    const state = getTurnState(combat, combatantId);
    if (!state) return null;
    state.actionUsed = true;
    return state;
  }

  function useBonusAction(combat, combatantId) {
    const state = getTurnState(combat, combatantId);
    if (!state) return null;
    state.bonusUsed = true;
    return state;
  }

  function useReaction(combat, combatantId) {
    const state = getTurnState(combat, combatantId);
    if (!state) return null;
    state.reactionUsed = true;
    return state;
  }

  function setPhase(combat, phase) {
    if (!combat || combat.status !== 'active') return null;
    const next = String(phase || '').trim().toLowerCase();
    const allowed = ['turn-start', 'action', 'bonus-reaction', 'turn-end'];
    if (!allowed.includes(next)) return null;
    combat.phase = next;
    return combat.phase;
  }

  function advancePhase(combat) {
    if (!combat || combat.status !== 'active') return null;
    const order = ['turn-start', 'action', 'bonus-reaction', 'turn-end'];
    const current = order.includes(combat.phase) ? combat.phase : 'turn-start';
    const idx = order.indexOf(current);
    const next = order[(idx + 1) % order.length];
    combat.phase = next;
    return combat.phase;
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

  function findResource(combatant, resourceKey) {
    if (!combatant?.resources || !resourceKey) return null;
    const direct = combatant.resources[resourceKey];
    if (direct) return direct;
    const needle = normalizeResourceKey(resourceKey);
    return Object.values(combatant.resources).find(item =>
      normalizeResourceKey(item.id) === needle ||
      normalizeResourceKey(item.name) === needle
    ) || null;
  }

  function spendResource(combat, combatantId, resourceKey, amount = 1) {
    const combatant = combat?.combatants?.[combatantId];
    if (!combatant) return { ok: false, message: 'Combatant not found.' };
    const resource = findResource(combatant, resourceKey);
    if (!resource) return { ok: false, message: 'Resource not found.' };
    if (!Number.isFinite(resource.current)) return { ok: false, message: 'Resource tracking not available.' };
    const cost = Number(amount) || 1;
    if (resource.current < cost) return { ok: false, message: 'Not enough uses remaining.' };
    resource.current -= cost;
    return { ok: true, resource };
  }

  function restoreResource(combat, combatantId, resourceKey, amount = 1) {
    const combatant = combat?.combatants?.[combatantId];
    if (!combatant) return { ok: false, message: 'Combatant not found.' };
    const resource = findResource(combatant, resourceKey);
    if (!resource) return { ok: false, message: 'Resource not found.' };
    if (!Number.isFinite(resource.current)) return { ok: false, message: 'Resource tracking not available.' };
    const gain = Number(amount) || 1;
    if (Number.isFinite(resource.max)) {
      resource.current = Math.min(resource.max, resource.current + gain);
    } else {
      resource.current += gain;
    }
    return { ok: true, resource };
  }

  function setResourceValue(combat, combatantId, resourceKey, value) {
    const combatant = combat?.combatants?.[combatantId];
    if (!combatant) return { ok: false, message: 'Combatant not found.' };
    let resource = findResource(combatant, resourceKey);
    const next = Number(value);
    if (!Number.isFinite(next)) return { ok: false, message: 'Invalid value.' };
    if (!resource) {
      const key = `custom.${normalizeResourceKey(resourceKey)}`;
      resource = {
        id: key,
        name: String(resourceKey || 'Resource').trim() || key,
        current: next,
        max: next,
        recharge: null,
        activation: null,
        pool_type: 'custom',
        notes: ['manual_entry'],
      };
      if (!combatant.resources) combatant.resources = {};
      combatant.resources[key] = resource;
      return { ok: true, resource };
    }
    if (Number.isFinite(resource.max)) {
      resource.current = Math.max(0, Math.min(resource.max, next));
    } else {
      resource.current = Math.max(0, next);
    }
    return { ok: true, resource };
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
    if (combat.phase) lines.push(`Phase: ${combat.phase}`);
    if (combat.status === 'active') {
      const active = getActiveCombatant(combat);
      if (active) {
        lines.push(`Turn: ${active.name}`);
        const state = getTurnState(combat, active.id);
        if (state) {
          const flags = [
            state.actionUsed ? 'Action: used' : 'Action: open',
            state.bonusUsed ? 'Bonus: used' : 'Bonus: open',
            state.reactionUsed ? 'Reaction: used' : 'Reaction: open',
          ];
          lines.push(`Turn state: ${flags.join(' | ')}`);
        }
      }
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
      const resourceList = Object.values(c.resources || {})
        .filter(item => Number.isFinite(item.max) && item.max > 0)
        .map(item => {
          const count = `${item.current ?? '?'}${Number.isFinite(item.max) ? `/${item.max}` : ''}`;
          const die = item.die_size ? ` ${item.die_size}` : '';
          const slot = item.slot_level ? ` (slot lvl ${item.slot_level})` : '';
          return `${item.name}: ${count}${die}${slot}`;
        });
      const resourceText = resourceList.length ? ` | Resources: ${resourceList.join(', ')}` : '';
      return `- ${c.name} (AC ${ac}, HP ${hp})${cond}${resourceText}`;
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
    spendResource,
    restoreResource,
    setResourceValue,
    rollSavingThrow,
    setPhase,
    advancePhase,
    getTurnState,
    useAction,
    useBonusAction,
    useReaction,
    formatCombatStatus,
  };
}
