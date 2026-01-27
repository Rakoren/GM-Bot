import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } from 'discord.js';

export async function handleChatInputCommand({
  interaction,
  session,
  sessionId,
  isGameChannel,
  isCreatorChannel,
  ctx,
}) {
  const abilityKey = (value) => String(value || '').toLowerCase().slice(0, 3);
  const abilityMod = (score) => {
    const num = Number(score);
    if (!Number.isFinite(num)) return 0;
    return Math.floor((num - 10) / 2);
  };
  const parseStatLine = (content) => {
    const text = String(content || '').toUpperCase();
    const map = {};
    const matches = text.match(/(STR|DEX|CON|INT|WIS|CHA)[^0-9]*([0-9]{1,2})/g);
    if (!matches) return null;
    for (const m of matches) {
      const parts = m.match(/(STR|DEX|CON|INT|WIS|CHA)[^0-9]*([0-9]{1,2})/);
      if (!parts) continue;
      map[parts[1].toLowerCase()] = Number(parts[2]);
    }
    return map;
  };
  const proficiencyBonus = (level) => {
    const lvl = Number(level);
    if (!Number.isFinite(lvl) || lvl < 1) return 2;
    if (lvl <= 4) return 2;
    if (lvl <= 8) return 3;
    if (lvl <= 12) return 4;
    if (lvl <= 16) return 5;
    return 6;
  };
  const skillToAbility = {
    acrobatics: 'dex',
    'animal handling': 'wis',
    arcana: 'int',
    athletics: 'str',
    deception: 'cha',
    history: 'int',
    insight: 'wis',
    intimidation: 'cha',
    investigation: 'int',
    medicine: 'wis',
    nature: 'int',
    perception: 'wis',
    performance: 'cha',
    persuasion: 'cha',
    religion: 'int',
    'sleight of hand': 'dex',
    stealth: 'dex',
    survival: 'wis',
  };
  const normalizeSkill = (value) =>
    String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const {
    CONFIG,
    campaignState,
    characterByUserId,
    userIdByCharacter,
    profileByUserId,
    xpByUserId,
    pendingPasteImports,
    isFeatureEnabled,
    isCommandEnabled,
    isCommandAllowedForMember,
    setMode,
    parseDiceExpression,
    rollDice,
    formatDiceResult,
    isCampaignInSession,
    getOrCreateManualLoginSet,
    startCampaignSetup,
    startCharacterSetup,
    startSession0StatsTest,
    isSetupActive,
    searchReference,
    formatLookupResults,
    insertHomebrew,
    lookupReferenceByName,
    getCharacterById,
    buildCharacterSheet,
    listCharacters,
    formatBankList,
    createNpc,
    listNpcs,
    getNpcById,
    deleteNpcById,
    buildNpcSheet,
    formatNpcList,
    startCharacterCreator,
    setCharacter,
    setProfile,
    deleteCharacterById,
    deleteCharactersByName,
    saveNamedCampaign,
    saveCampaignState,
    resetCampaignState,
    loadNamedCampaign,
    deleteNamedCampaign,
    getCharacterName,
    resolveProfileFields,
    buildProfileEmbed,
    saveProfileStore,
    ttsSpeak,
    saveCombatState,
    saveLootState,
    openai,
    updateChannelConfig,
    getLoginVoiceChannelId,
    getOrCreateVoiceConnection,
    getOrCreateAudioPlayer,
    voiceActive,
    voiceConnections,
    voicePlayers,
    path,
  } = ctx;

  if (interaction.commandName === 'mode') {
    if (!isGameChannel) {
      await interaction.editReply('Use /mode in the game channel or its threads.');
      return;
    }
    const arg = interaction.options.getString('type', true);
    setMode(session, arg);
    await interaction.editReply(`Mode set to ${arg.toUpperCase()}.`);
    return;
  }

  if (interaction.commandName === 'setup') {
    if (!interaction.guild) {
      await interaction.editReply('Run /setup inside a server.');
      return;
    }
    const perms = interaction.memberPermissions;
    if (!perms?.has(PermissionsBitField.Flags.ManageGuild) && !perms?.has(PermissionsBitField.Flags.Administrator)) {
      await interaction.editReply('You need Manage Server or Administrator to run /setup.');
      return;
    }
    const overwrite = interaction.options.getBoolean('overwrite', false);
    const guild = interaction.guild;

    const existingGame = guild.channels.cache.find(
      ch => ch.type === ChannelType.GuildText && ch.name === 'game-table'
    );
    const existingCreator = guild.channels.cache.find(
      ch => ch.type === ChannelType.GuildText && ch.name === 'character-creator'
    );

    const created = [];
    const reused = [];

    let gameChannel = existingGame;
    if (!gameChannel || overwrite) {
      gameChannel = await guild.channels.create({
        name: 'game-table',
        type: ChannelType.GuildText,
        topic: 'Main play table for the DM Bot.',
      });
      created.push(`#${gameChannel.name}`);
    } else {
      reused.push(`#${gameChannel.name}`);
    }

    let creatorChannel = existingCreator;
    if (!creatorChannel || overwrite) {
      creatorChannel = await guild.channels.create({
        name: 'character-creator',
        type: ChannelType.GuildText,
        topic: 'Character intake channel for the DM Bot.',
      });
      created.push(`#${creatorChannel.name}`);
    } else {
      reused.push(`#${creatorChannel.name}`);
    }

    updateChannelConfig({
      gameTableChannelId: gameChannel?.id || null,
      characterCreatorChannelId: creatorChannel?.id || null,
    });

    const lines = [];
    if (created.length) lines.push(`Created: ${created.join(', ')}`);
    if (reused.length) lines.push(`Using existing: ${reused.join(', ')}`);
    lines.push('Saved channel IDs. You can now run /campaign-setup or /start in #game-table.');
    await interaction.editReply(lines.join('\n'));
    return;
  }

  if (interaction.commandName === 'setchar') {
    if (!isGameChannel) {
      await interaction.editReply('Use /setchar in the game channel or its threads.');
      return;
    }
    const bankId = interaction.options.getString('bank_id', false);
    if (bankId) {
      const cleanedId = String(bankId).trim().replace(/^#/, '');
      if (!cleanedId) {
        await interaction.editReply('Provide a valid bank_id.');
        return;
      }
      const isDm = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)
        || interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator);
      const row = getCharacterById(cleanedId, { userId: interaction.user.id, isDm });
      if (!row) {
        await interaction.editReply(`No character found for ID ${cleanedId}.`);
        return;
      }
      setCharacter(interaction.user.id, row.name || interaction.user.username);
      setProfile(interaction.user.id, row);
      await interaction.editReply(`Character linked: ${interaction.user} -> ${row.name || interaction.user.username}`);
      return;
    }
    const name = interaction.options.getString('name', false);
    if (!name) {
      await interaction.editReply('Provide a name or a bank_id.');
      return;
    }
    setCharacter(interaction.user.id, name);
    setProfile(interaction.user.id, { name });
    await interaction.editReply(`Character linked: ${interaction.user} -> ${name}`);
    return;
  }

  if (interaction.commandName === 'turn') {
    if (!isGameChannel) {
      await interaction.editReply('Use /turn in the game channel or its threads.');
      return;
    }
    const user = interaction.options.getUser('user', true);
    session.activePlayerId = user.id;
    setMode(session, 'structured');
    await interaction.editReply(`Structured turn set. Next: ${getCharacterName(user.id, user.username)}, you're up.`);
    return;
  }

  if (interaction.commandName === 'roll') {
    if (!isGameChannel) {
      await interaction.editReply('Use /roll in the game channel or its threads.');
      return;
    }
    const expr = interaction.options.getString('expression', true);
    const parsed = parseDiceExpression(expr);
    if (!parsed.ok) {
      await interaction.editReply(parsed.error || 'Invalid dice expression.');
      return;
    }
    const result = rollDice(parsed.value);
    await interaction.editReply(formatDiceResult(result));
    return;
  }

  if (interaction.commandName === 'check') {
    if (!isGameChannel) {
      await interaction.editReply('Use /check in the game channel or its threads.');
      return;
    }
    const ability = interaction.options.getString('ability', true);
    const skill = interaction.options.getString('skill', false);
    const dc = interaction.options.getInteger('dc', false);
    const adv = interaction.options.getBoolean('adv', false);
    const dis = interaction.options.getBoolean('dis', false);

    const profile = ctx.profileByUserId?.get(interaction.user.id) || null;
    const statsMap = parseStatLine(profile?.stats || '');
    const level = profile?.level || 1;
    const prof = proficiencyBonus(level);

    const skillKey = normalizeSkill(skill);
    const abilityFromSkill = skillKey ? skillToAbility[skillKey] : null;
    const abilityUsed = abilityFromSkill || abilityKey(ability);
    const abilityScore = statsMap?.[abilityUsed];
    const mod = abilityMod(abilityScore);

    const profSkills = profile?.skills || profile?.skill_proficiencies || profile?.skillProficiencies || [];
    const hasSkillProf =
      Array.isArray(profSkills) && skillKey
        ? profSkills.map(s => normalizeSkill(s)).includes(skillKey)
        : false;
    const totalMod = mod + (hasSkillProf ? prof : 0);

    const result = ctx.rollDice({
      count: 1,
      sides: 20,
      mod: totalMod,
      advantage: !!adv,
      disadvantage: !!dis,
    });
    const rollText = result.advantage || result.disadvantage
      ? `${result.rolls.join(', ')} -> ${result.chosen}`
      : result.rolls.join(', ');
    const skillLabel = skillKey ? ` (${skillKey})` : '';
    const dcText = Number.isFinite(dc) ? ` vs DC ${dc}` : '';
    const success = Number.isFinite(dc) ? (result.total >= dc ? 'SUCCESS' : 'FAIL') : 'ROLLED';

    await interaction.editReply(
      `${interaction.user.username}: ${abilityUsed.toUpperCase()}${skillLabel} check${dcText}\n` +
      `Roll: ${rollText} ${totalMod >= 0 ? '+' : ''}${totalMod} = ${result.total} — ${success}`
    );
    return;
  }

  if (interaction.commandName === 'percent') {
    const chance = interaction.options.getInteger('chance', true);
    const clamped = Math.min(100, Math.max(1, Number(chance)));
    const result = ctx.rollDice({ count: 1, sides: 100, mod: 0 });
    const roll = result.total;
    const success = roll <= clamped ? 'SUCCESS' : 'FAIL';
    await interaction.editReply(`Percentile: ${roll} vs ${clamped}% — ${success}`);
    return;
  }

  if (interaction.commandName === 'rolltable') {
    const die = interaction.options.getString('die', true);
    const sides = Number(die);
    if (!Number.isFinite(sides) || sides < 2) {
      await interaction.editReply('Invalid die.');
      return;
    }
    const result = ctx.rollDice({ count: 1, sides, mod: 0 });
    await interaction.editReply(`Rolled d${sides}: ${result.total}`);
    return;
  }

  if (interaction.commandName === 'status') {
    const aiMode = typeof ctx.getAiMode === 'function' ? ctx.getAiMode() : 'active';
    const lines = [
      `AI mode: ${aiMode === 'passive' ? 'AI-Passive' : 'AI-Active'}`,
      `Session mode: ${session.mode || 'free'}`,
      `Auto replies: ${ctx.isFeatureEnabled?.('enableAutoReplies') ? 'on' : 'off'}`,
      `TTS: ${ctx.isFeatureEnabled?.('enableTts') ? 'on' : 'off'}`,
      `Voice features: ${ctx.isFeatureEnabled?.('enableVoice') ? 'on' : 'off'}`,
    ];
    await interaction.editReply(lines.join('\n'));
    return;
  }

  if (interaction.commandName === 'combat') {
    if (!isGameChannel) {
      await interaction.editReply('Use /combat in the game channel or its threads.');
      return;
    }
    const {
      combatEngine,
      profileByUserId,
      reloadProfileStore,
      isCommandAllowedForMember,
    } = ctx;
    const sub = interaction.options.getSubcommand();
    const isDm = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)
      || interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator);
    const dmOnly = ['start', 'add-npc', 'begin', 'next', 'damage', 'condition', 'phase', 'next-phase'];
    if (dmOnly.includes(sub) && !isDm) {
      await interaction.editReply('DM only.');
      return;
    }
    const combat = combatEngine.getCombat(session);
    const persistCombat = () => saveCombatState?.(session);
    const persistLoot = () => saveLootState?.(session);
    const sendCombatHud = async () => {
      if (!combat) return;
      const active = combatEngine.getActiveCombatant(combat);
      const round = combat.round || 0;
      const phase = combat.phase || '—';
      const turn = active ? ` · Turn: ${active.name}` : '';
      const line = `HUD — ${combat.name} · Round ${round} · Phase ${phase}${turn}`;
      try {
        await interaction.followUp({ content: line });
      } catch {}
    };

    const findCombatantByName = (name) => {
      const cleaned = String(name || '').trim().toLowerCase();
      if (!combat || !cleaned) return null;
      return Object.values(combat.combatants).find(c =>
        String(c.name || '').trim().toLowerCase() === cleaned
      ) || null;
    };

    if (sub === 'start') {
      const name = interaction.options.getString('name', false);
      const created = combatEngine.createCombat(session, {
        name,
        channelId: interaction.channelId,
        createdBy: interaction.user.id,
      });
      persistCombat();
      persistLoot();
      await interaction.editReply(`Combat started: ${created.name}. Players can /combat join.`);
      await sendCombatHud();
      return;
    }

    if (!combat) {
      await interaction.editReply('No active combat. Use /combat start first.');
      return;
    }

    if (sub === 'join') {
      if (typeof reloadProfileStore === 'function') {
        reloadProfileStore();
      }
      const profile = profileByUserId.get(interaction.user.id);
      if (!profile) {
        await interaction.editReply('No linked character. Use /setchar first.');
        return;
      }
      const combatant = combatEngine.buildCombatantFromProfile(interaction.user.id, profile);
      combat.combatants[combatant.id] = combatant;
      persistCombat();
      await interaction.editReply(`${combatant.name} joined combat.`);
      await sendCombatHud();
      return;
    }

    if (sub === 'add-npc') {
      const name = interaction.options.getString('name', true);
      const hp = interaction.options.getInteger('hp', true);
      const ac = interaction.options.getInteger('ac', true);
      const init = interaction.options.getInteger('initiative', false);
      const npc = combatEngine.addNpc(combat, { name, hp, ac, initiative: init });
      persistCombat();
      await interaction.editReply(`NPC added: ${npc.name} (HP ${npc.hp}, AC ${npc.ac}).`);
      await sendCombatHud();
      return;
    }

    if (sub === 'init') {
      const value = interaction.options.getInteger('value', false);
      const adv = interaction.options.getBoolean('adv', false);
      const dis = interaction.options.getBoolean('dis', false);
      const combatantId = `player_${interaction.user.id}`;
      if (!combat.combatants[combatantId]) {
        await interaction.editReply('Join combat first with /combat join.');
        return;
      }
      if (Number.isFinite(value)) {
        combatEngine.setInitiative(combat, combatantId, value);
        persistCombat();
        await interaction.editReply(`Initiative set to ${value}.`);
        await sendCombatHud();
        return;
      }
      const result = combatEngine.rollInitiative(combat, combatantId, { advantage: adv, disadvantage: dis });
      persistCombat();
      await interaction.editReply(`Initiative: ${result.total} (${result.rolls.join(', ')})`);
      await sendCombatHud();
      return;
    }

    if (sub === 'begin') {
      combatEngine.beginCombat(combat);
      persistCombat();
      await interaction.editReply(combatEngine.formatCombatStatus(combat));
      await sendCombatHud();
      return;
    }

    if (sub === 'next') {
      const active = combatEngine.nextTurn(combat);
      persistCombat();
      await interaction.editReply(active ? `Turn: ${active.name}` : 'No active combatants.');
      await sendCombatHud();
      return;
    }

    if (sub === 'use') {
      const type = interaction.options.getString('type', true);
      const targetUser = interaction.options.getUser('user', false);
      const active = combatEngine.getActiveCombatant(combat);
      if (!active) {
        await interaction.editReply('No active combatant.');
        return;
      }
      if (!isDm && targetUser && targetUser.id !== interaction.user.id) {
        await interaction.editReply('Only the DM can spend resources for another player.');
        return;
      }
      if (!isDm && active.userId && active.userId !== interaction.user.id) {
        await interaction.editReply(`It is ${active.name}'s turn.`);
        return;
      }
      const combatantId = targetUser
        ? `player_${targetUser.id}`
        : active.userId
          ? `player_${interaction.user.id}`
          : active.id;
      let state = null;
      if (type === 'action') state = combatEngine.useAction(combat, combatantId);
      if (type === 'bonus') state = combatEngine.useBonusAction(combat, combatantId);
      if (type === 'reaction') state = combatEngine.useReaction(combat, combatantId);
      persistCombat();
      if (!state) {
        await interaction.editReply('Unable to update turn resources.');
        return;
      }
      const targetName = targetUser?.username || active.name;
      await interaction.editReply(`Marked ${type} used for ${targetName}.`);
      await sendCombatHud();
      return;
    }

    if (sub === 'phase') {
      const value = interaction.options.getString('value', true);
      const phase = combatEngine.setPhase(combat, value);
      persistCombat();
      await interaction.editReply(phase ? `Phase set: ${phase}` : 'Unable to set phase.');
      if (phase) await sendCombatHud();
      return;
    }

    if (sub === 'next-phase') {
      const phase = combatEngine.advancePhase(combat);
      persistCombat();
      await interaction.editReply(phase ? `Phase: ${phase}` : 'Unable to advance phase.');
      if (phase) await sendCombatHud();
      return;
    }

    if (sub === 'status') {
      await interaction.editReply(combatEngine.formatCombatStatus(combat));
      return;
    }

    if (sub === 'attack') {
      const attackerName = interaction.options.getString('attacker', false);
      const targetName = interaction.options.getString('target', true);
      const weapon = interaction.options.getString('weapon', false);
      const adv = interaction.options.getBoolean('adv', false);
      const dis = interaction.options.getBoolean('dis', false);
      const dmgOverride = interaction.options.getString('damage', false);
      let attacker = null;
      if (attackerName) {
        if (!isDm) {
          await interaction.editReply('Only the DM can pick an attacker.');
          return;
        }
        attacker = findCombatantByName(attackerName);
      } else {
        attacker = combat.combatants[`player_${interaction.user.id}`];
      }
      if (!attacker) {
        await interaction.editReply('Attacker not found.');
        return;
      }
      if (combat.status === 'active') {
        const active = combatEngine.getActiveCombatant(combat);
        if (active?.id && active.id !== attacker.id && !isDm) {
          await interaction.editReply(`It is ${active?.name}'s turn.`);
          return;
        }
      }
      const target = findCombatantByName(targetName);
      if (!target) {
        await interaction.editReply('Target not found.');
        return;
      }
      const result = combatEngine.attack({
        combat,
        attackerId: attacker.id,
        targetId: target.id,
        weaponName: weapon,
        advantage: adv,
        disadvantage: dis,
        overrideDamage: dmgOverride,
      });
      combatEngine.useAction(combat, attacker.id);
      persistCombat();
      if (result.error) {
        await interaction.editReply(result.error);
        return;
      }
      const hitText = result.hit ? 'HIT' : 'MISS';
      const rollText = result.roll ? `${result.roll.total} (${result.roll.rolls.join(', ')})` : '?';
      const dmgText = result.hit
        ? `Damage: ${result.damageTotal || 0} (${result.damageResult?.rolls?.join(', ') || ''})`
        : '';
      const hpText = Number.isFinite(target.hp) ? `HP: ${target.hp}/${target.maxHp ?? '?'}` : 'HP: ?';
      await interaction.editReply(
        `${attacker.name} attacks ${target.name} with ${result.weapon} — ${hitText}\n` +
        `Attack roll: ${rollText}\n` +
        `${dmgText}\n${hpText}`.trim()
      );
      await sendCombatHud();
      return;
    }

    if (sub === 'damage') {
      const targetName = interaction.options.getString('target', true);
      const amount = interaction.options.getInteger('amount', true);
      const target = findCombatantByName(targetName);
      if (!target) {
        await interaction.editReply('Target not found.');
        return;
      }
      combatEngine.applyDamage(combat, target.id, amount);
      persistCombat();
      const hpText = Number.isFinite(target.hp) ? `${target.hp}/${target.maxHp ?? '?'}` : '?';
      await interaction.editReply(`${target.name} takes ${amount} damage. HP ${hpText}.`);
      await sendCombatHud();
      return;
    }

    if (sub === 'condition') {
      const action = interaction.options.getString('action', true);
      const targetName = interaction.options.getString('target', true);
      const condition = interaction.options.getString('condition', true);
      const target = findCombatantByName(targetName);
      if (!target) {
        await interaction.editReply('Target not found.');
        return;
      }
      if (action === 'add') {
        combatEngine.addCondition(combat, target.id, condition);
        persistCombat();
        await interaction.editReply(`${target.name} gains ${condition}.`);
        await sendCombatHud();
      } else {
        combatEngine.removeCondition(combat, target.id, condition);
        persistCombat();
        await interaction.editReply(`${target.name} loses ${condition}.`);
        await sendCombatHud();
      }
      return;
    }

    if (sub === 'cast') {
      const level = interaction.options.getInteger('level', true);
      const spell = interaction.options.getString('spell', true);
      const targetName = interaction.options.getString('target', false);
      const caster = combat.combatants[`player_${interaction.user.id}`];
      if (!caster) {
        await interaction.editReply('Join combat first with /combat join.');
        return;
      }
      const result = combatEngine.spendSpellSlot(combat, caster.id, level);
      combatEngine.useAction(combat, caster.id);
      persistCombat();
      if (!result.ok) {
        await interaction.editReply(result.message);
        return;
      }
      const targetText = targetName ? ` on ${targetName}` : '';
      await interaction.editReply(`${caster.name} casts ${spell}${targetText}. Slots left: ${result.remaining}.`);
      await sendCombatHud();
      return;
    }

    if (sub === 'save') {
      const ability = interaction.options.getString('ability', true);
      const dc = interaction.options.getInteger('dc', false);
      const targetName = interaction.options.getString('target', false);
      const adv = interaction.options.getBoolean('adv', false);
      const dis = interaction.options.getBoolean('dis', false);
      let target = null;
      if (targetName) {
        if (!isDm) {
          await interaction.editReply('Only the DM can pick a target.');
          return;
        }
        target = findCombatantByName(targetName);
      } else {
        target = combat.combatants[`player_${interaction.user.id}`];
      }
      if (!target) {
        await interaction.editReply('Target not found.');
        return;
      }
      const result = combatEngine.rollSavingThrow(combat, target.id, ability, dc, { advantage: adv, disadvantage: dis });
      if (result.error) {
        await interaction.editReply(result.error);
        return;
      }
      const success = Number.isFinite(dc) ? (result.success ? 'SUCCESS' : 'FAIL') : 'ROLLED';
      await interaction.editReply(
        `${target.name} ${ability.toUpperCase()} save: ${result.result.total} (${result.result.rolls.join(', ')}) — ${success}`
      );
      persistCombat();
      await sendCombatHud();
      return;
    }
  }

  if (interaction.commandName === 'campaign-setup') {
    if (!isGameChannel) {
      await interaction.editReply('Use /campaign-setup in the game channel or its threads.');
      return;
    }
    const sub = interaction.options.getSubcommand();
    if (sub === 'cancel') {
      session.campaignSetupActive = false;
      session.campaignSetupStep = null;
      session.campaignSetupAutoStartCharacters = false;
      await interaction.editReply('Campaign setup canceled.');
      return;
    }
    if (isSetupActive(session)) {
      await interaction.editReply('Setup is already running. Use /campaign-setup cancel or /character-setup cancel.');
      return;
    }
    await startCampaignSetup(session, interaction.channel);
    await interaction.editReply('Campaign setup started.');
    return;
  }

  if (interaction.commandName === 'character-setup') {
    if (!isGameChannel) {
      await interaction.editReply('Use /character-setup in the game channel or its threads.');
      return;
    }
    const sub = interaction.options.getSubcommand();
    if (sub === 'cancel') {
      session.session0Active = false;
      session.session0Step = null;
      await interaction.editReply('Character setup canceled.');
      return;
    }
    if (isSetupActive(session)) {
      await interaction.editReply('Setup is already running. Use /campaign-setup cancel or /character-setup cancel.');
      return;
    }
    const players = interaction.options.getInteger('players', false);
    await startCharacterSetup(session, interaction.channel, players || null);
    await interaction.editReply('Character setup started.');
    return;
  }

  if (interaction.commandName === 'start') {
    if (!isGameChannel) {
      await interaction.editReply('Use /start in the game channel or its threads.');
      return;
    }
    if (isSetupActive(session)) {
      await interaction.editReply('Setup already in progress. Use /campaign-setup cancel or /character-setup cancel.');
      return;
    }
    if (isCampaignInSession()) {
      await interaction.editReply('Game already in session. /save before starting a new game.');
      return;
    }
    await startCampaignSetup(session, interaction.channel, { autoStartCharacters: true });
    await interaction.editReply('Start flow initiated.');
    return;
  }

  if (interaction.commandName === 'test') {
    if (!isGameChannel) {
      await interaction.editReply('Use /test in the game channel or its threads.');
      return;
    }
    if (isSetupActive(session)) {
      await interaction.editReply('Setup already in progress. Use /campaign-setup cancel or /character-setup cancel.');
      return;
    }
    const sub = interaction.options.getSubcommand();
    if (sub === 'campaign') {
      await startCampaignSetup(session, interaction.channel);
      await interaction.editReply('Campaign setup (test) started.');
      return;
    }
    if (sub === 'character') {
      await startCharacterSetup(session, interaction.channel, 1);
      await interaction.editReply('Character setup (test) started for 1 player.');
      return;
    }
    if (sub === 'stats') {
      await startSession0StatsTest(session, interaction.channel, interaction.user);
      await interaction.editReply('Stats intake (test) started.');
      return;
    }
  }

  if (interaction.commandName === 'lookup') {
    if (!isGameChannel) {
      await interaction.editReply('Use /lookup in the game channel or its threads.');
      return;
    }
    const sub = interaction.options.getSubcommand();
    const query = interaction.options.getString('query', true);
    const tableMap = {
      class: 'classes',
      subclass: 'subclasses',
      species: 'species',
      background: 'backgrounds',
      feat: 'feats',
      spell: 'spells',
    };
    const tableName = tableMap[sub];
    if (!tableName) {
      await interaction.editReply('Unknown lookup type.');
      return;
    }
    const rows = searchReference(tableName, query, 10);
    const title = `Lookup results (${sub}):`;
    await interaction.editReply([title, formatLookupResults(tableName, rows)].join('\n'));
    return;
  }

  if (interaction.commandName === 'homebrew') {
    if (!isFeatureEnabled('enableHomebrew')) {
      await interaction.editReply('Homebrew is disabled by the admin.');
      return;
    }
    const sub = interaction.options.getSubcommand();
    if (sub === 'class') {
      const name = interaction.options.getString('name', true);
      const result = insertHomebrew('classes', 'class_id', 'HB_CLS_', {
        name,
        primary_ability: interaction.options.getString('primary_ability', false),
        hit_die: interaction.options.getString('hit_die', false),
        armor_proficiencies: interaction.options.getString('armor', false),
        weapon_proficiencies: interaction.options.getString('weapons', false),
        saving_throws: interaction.options.getString('saving_throws', false),
        skill_choices: interaction.options.getString('skills', false),
      });
      await interaction.editReply(
        result.ok
          ? `Homebrew class saved: ${name} (${result.id})${result.existing ? ' (already existed)' : ''}`
          : `Homebrew class failed: ${result.message}`
      );
      return;
    }
    if (sub === 'species') {
      const name = interaction.options.getString('name', true);
      const result = insertHomebrew('species', 'species_id', 'HB_SPC_', {
        name,
        size: interaction.options.getString('size', false),
        speed: interaction.options.getString('speed', false),
        languages: interaction.options.getString('languages', false),
        special_traits: interaction.options.getString('traits', false),
      });
      await interaction.editReply(
        result.ok
          ? `Homebrew species saved: ${name} (${result.id})${result.existing ? ' (already existed)' : ''}`
          : `Homebrew species failed: ${result.message}`
      );
      return;
    }
    if (sub === 'background') {
      const name = interaction.options.getString('name', true);
      const result = insertHomebrew('backgrounds', 'background_id', 'HB_BKG_', {
        name,
        skill_proficiencies: interaction.options.getString('skills', false),
        tool_proficiencies: interaction.options.getString('tools', false),
        languages: interaction.options.getString('languages', false),
        equipment: interaction.options.getString('equipment', false),
        feat_granted: interaction.options.getString('feat', false),
      });
      await interaction.editReply(
        result.ok
          ? `Homebrew background saved: ${name} (${result.id})${result.existing ? ' (already existed)' : ''}`
          : `Homebrew background failed: ${result.message}`
      );
      return;
    }
    if (sub === 'subclass') {
      const name = interaction.options.getString('name', true);
      const className = interaction.options.getString('class', false);
      const classRow = className ? lookupReferenceByName('classes', className) : null;
      const result = insertHomebrew('subclasses', 'subclass_id', 'HB_SUB_', {
        name,
        class_id: classRow?.class_id || '',
        level_gained: interaction.options.getString('level', false),
        summary: interaction.options.getString('summary', false),
      });
      await interaction.editReply(
        result.ok
          ? `Homebrew subclass saved: ${name} (${result.id})${result.existing ? ' (already existed)' : ''}`
          : `Homebrew subclass failed: ${result.message}`
      );
      return;
    }
    if (sub === 'feat') {
      const name = interaction.options.getString('name', true);
      const result = insertHomebrew('feats', 'feat_id', 'HB_FEAT_', {
        name,
        prerequisites: interaction.options.getString('prereq', false),
        benefit_summary: interaction.options.getString('summary', false),
      });
      await interaction.editReply(
        result.ok
          ? `Homebrew feat saved: ${name} (${result.id})${result.existing ? ' (already existed)' : ''}`
          : `Homebrew feat failed: ${result.message}`
      );
      return;
    }
    if (sub === 'spell') {
      const name = interaction.options.getString('name', true);
      const level = interaction.options.getInteger('level', false);
      const result = insertHomebrew('spells', 'spell_id', 'HB_SPL_', {
        name,
        level: Number.isFinite(level) ? String(level) : '',
        school: interaction.options.getString('school', false),
        casting_time: interaction.options.getString('casting_time', false),
        range: interaction.options.getString('range', false),
        components: interaction.options.getString('components', false),
        duration: interaction.options.getString('duration', false),
        concentration: interaction.options.getString('concentration', false),
        ritual: interaction.options.getString('ritual', false),
        attack_save: interaction.options.getString('attack_save', false),
        damage_type: interaction.options.getString('damage_type', false),
        short_effect: interaction.options.getString('effect', false),
      });
      await interaction.editReply(
        result.ok
          ? `Homebrew spell saved: ${name} (${result.id})${result.existing ? ' (already existed)' : ''}`
          : `Homebrew spell failed: ${result.message}`
      );
      return;
    }
  }

  if (interaction.commandName === 'sheet') {
    const bankId = interaction.options.getString('bank_id', false);
    if (bankId) {
      const cleanedId = String(bankId).trim().replace(/^#/, '');
      if (!cleanedId) {
        await interaction.editReply('Provide a valid bank_id.');
        return;
      }
      const isDm = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)
        || interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator);
      const row = getCharacterById(cleanedId, { userId: interaction.user.id, isDm });
      if (!row) {
        await interaction.editReply(`No character found for ID ${cleanedId}.`);
        return;
      }
      await interaction.editReply(buildCharacterSheet({ fields: row }, row.name || `#${bankId}`));
      return;
    }

    const user = interaction.options.getUser('user', false) || interaction.user;
    const entry = session.session0Responses.find(r => r.userId === user.id);
    if (entry) {
      const label = entry.fields?.name || user.username;
      await interaction.editReply(buildCharacterSheet(entry, label));
      return;
    }

    const linkedName = characterByUserId.get(user.id);
    if (linkedName) {
      await interaction.editReply(
        `Character linked: ${linkedName}. Use /sheet bank_id:<id> to view a full sheet, or run character setup for details.`
      );
      return;
    }

    await interaction.editReply(`No character setup data found for ${user}.`);
    return;
  }

  if (interaction.commandName === 'bank') {
    const sub = interaction.options.getSubcommand();
    const isDm = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)
      || interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator);
    if (sub === 'create') {
      if (!isCreatorChannel) {
        await interaction.editReply('Use /bank create in #character-creator.');
        return;
      }
      startCharacterCreator(interaction.user, interaction.channel);
      await interaction.editReply('Character creator started.');
      return;
    }
    if (sub === 'list') {
      if (!isGameChannel && !isCreatorChannel) {
        await interaction.editReply('Use /bank list in the game or character-creator channel.');
        return;
      }
      const rows = listCharacters({ userId: interaction.user.id, isDm });
      await interaction.editReply(formatBankList(rows));
      return;
    }
    if (sub === 'take') {
      if (!isGameChannel) {
        await interaction.editReply('Use /bank take in the game channel.');
        return;
      }
      const id = interaction.options.getString('id', true);
      const cleanedId = String(id).trim().replace(/^#/, '');
      const row = getCharacterById(cleanedId, { userId: interaction.user.id, isDm });
      if (!row) {
        await interaction.editReply(`No character found for ID ${cleanedId}.`);
        return;
      }
      setCharacter(interaction.user.id, row.name || interaction.user.username);
      setProfile(interaction.user.id, row);
      await interaction.editReply(buildCharacterSheet({ fields: row }, row.name || interaction.user.username));
      return;
    }
    if (sub === 'info') {
      const id = interaction.options.getString('id', true);
      const cleanedId = String(id).trim().replace(/^#/, '');
      const row = getCharacterById(cleanedId, { userId: interaction.user.id, isDm });
      if (!row) {
        await interaction.editReply(`No character found for ID ${cleanedId}.`);
        return;
      }
      await interaction.editReply(buildCharacterSheet({ fields: row }, row.name || `#${cleanedId}`));
      return;
    }
    if (sub === 'delete') {
      const id = interaction.options.getString('id', false);
      const name = interaction.options.getString('name', false);
      if (!id && !name) {
        await interaction.editReply('Provide either id or name to delete.');
        return;
      }
      if (id) {
        const cleanedId = String(id).trim().replace(/^#/, '');
        const row = getCharacterById(cleanedId, { userId: interaction.user.id, isDm });
        if (!row) {
          await interaction.editReply(`No character found for ID ${cleanedId}.`);
          return;
        }
        const deleted = deleteCharacterById(cleanedId, { userId: interaction.user.id, isDm });
        if (!deleted) {
          await interaction.editReply('Unable to delete that character.');
          return;
        }
        await interaction.editReply(`Deleted character #${cleanedId} (${row.name || 'Unknown'}).`);
        return;
      }
      const count = deleteCharactersByName(name, { userId: interaction.user.id, isDm });
      if (!count) {
        await interaction.editReply(`No characters found with name "${name}".`);
        return;
      }
      await interaction.editReply(`Deleted ${count} character(s) named "${name}".`);
      return;
    }
  }

  if (interaction.commandName === 'npc') {
    const sub = interaction.options.getSubcommand();
    if (sub === 'create') {
      const name = interaction.options.getString('name', true);
      const role = interaction.options.getString('role', false);
      const stats = interaction.options.getString('stats', false);
      const notes = interaction.options.getString('notes', false);
      const id = createNpc({
        name,
        role,
        statBlock: stats,
        notes,
        createdBy: interaction.user.id,
      });
      await interaction.editReply(`NPC created: #${id} ${name}`);
      return;
    }
    if (sub === 'list') {
      const rows = listNpcs();
      await interaction.editReply(formatNpcList(rows));
      return;
    }
    if (sub === 'sheet') {
      const id = interaction.options.getInteger('id', true);
      const npc = getNpcById(id);
      if (!npc) {
        await interaction.editReply(`No NPC found for ID ${id}.`);
        return;
      }
      await interaction.editReply(buildNpcSheet(npc));
      return;
    }
    if (sub === 'delete') {
      const id = interaction.options.getInteger('id', true);
      const npc = getNpcById(id);
      if (!npc) {
        await interaction.editReply(`No NPC found for ID ${id}.`);
        return;
      }
      deleteNpcById(id);
      await interaction.editReply(`Deleted NPC #${id} (${npc.name || 'Unknown'}).`);
    }
    return;
  }

  if (interaction.commandName === 'save') {
    if (!isGameChannel) {
      await interaction.editReply('Use /save in the game channel or its threads.');
      return;
    }
    const name =
      interaction.options.getString('name', false) ||
      campaignState.currentCampaignName;
    if (!name) {
      await interaction.editReply('Provide a campaign name or set one during campaign setup.');
      return;
    }
    const filePath = saveNamedCampaign(name);
    if (!filePath) {
      await interaction.editReply('Provide a valid campaign name.');
      return;
    }
    campaignState.currentCampaignName = String(name).trim();
    saveCampaignState();
    await interaction.editReply(`Campaign saved: ${path.basename(filePath)}`);
    return;
  }

  if (interaction.commandName === 'reset') {
    if (!isGameChannel) {
      await interaction.editReply('Use /reset in the game channel or its threads.');
      return;
    }
    resetCampaignState();
    saveCampaignState();
    await interaction.editReply('Campaign reset. In-memory session state cleared (bank preserved).');
    return;
  }

  if (interaction.commandName === 'clear') {
    if (!isGameChannel) {
      await interaction.editReply('Use /clear in the game channel or its threads.');
      return;
    }
    resetCampaignState();
    saveCampaignState();
    await interaction.editReply('Campaign cleared. In-memory session state cleared (bank preserved).');
    return;
  }

  if (interaction.commandName === 'load') {
    if (!isGameChannel) {
      await interaction.editReply('Use /load in the game channel or its threads.');
      return;
    }
    const name = interaction.options.getString('name', true);
    const filePath = loadNamedCampaign(name);
    if (!filePath) {
      await interaction.editReply(`No campaign found for "${name}".`);
      return;
    }
    campaignState.currentCampaignName = String(name).trim();
    saveCampaignState();
    await interaction.editReply(`Campaign loaded: ${path.basename(filePath)}`);
    return;
  }

  if (interaction.commandName === 'delete') {
    if (!isGameChannel) {
      await interaction.editReply('Use /delete in the game channel or its threads.');
      return;
    }
    const name = interaction.options.getString('name', true);
    const ok = deleteNamedCampaign(name);
    if (!ok) {
      await interaction.editReply(`No campaign found for "${name}".`);
      return;
    }
    await interaction.editReply(`Campaign deleted: ${name}`);
    return;
  }

  if (interaction.commandName === 'log-in') {
    if (!isGameChannel) {
      await interaction.editReply('Use /log-in in the game channel or its threads.');
      return;
    }
    const manualSet = getOrCreateManualLoginSet(sessionId);
    manualSet.add(interaction.user.id);
    await interaction.editReply('You are logged in (manual).');
    return;
  }

  if (interaction.commandName === 'log-out') {
    if (!isGameChannel) {
      await interaction.editReply('Use /log-out in the game channel or its threads.');
      return;
    }
    const manualSet = getOrCreateManualLoginSet(sessionId);
    manualSet.delete(interaction.user.id);
    await interaction.editReply('You are logged out (manual).');
    return;
  }

  if (interaction.commandName === 'say') {
    if (!isFeatureEnabled('enableTts') || !isFeatureEnabled('enableVoice')) {
      await interaction.editReply('Voice narration is disabled by the admin.');
      return;
    }
    const text = interaction.options.getString('text', true);
    if (!interaction.guild) {
      await interaction.editReply('Use /say in a server channel.');
      return;
    }
    await ttsSpeak({
      session,
      channel: interaction.channel,
      text,
      openai,
      config: CONFIG,
      isFeatureEnabled,
      getLoginVoiceChannelId,
      getOrCreateVoiceConnection,
      getOrCreateAudioPlayer,
      voiceActive,
      voiceConnections,
      voicePlayers,
    });
    await interaction.editReply('Speaking.');
    return;
  }

  if (interaction.commandName === 'profile') {
    if (!isGameChannel) {
      await interaction.editReply('Use /profile in the game channel or its threads.');
      return;
    }
    const entry = session.session0Responses.find(r => r.userId === interaction.user.id);
    const displayName = interaction.member?.displayName || interaction.user.username;
    const fields = resolveProfileFields(interaction.user.id, entry);
    const embed = buildProfileEmbed(interaction.user, fields, displayName);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`profile_share:${interaction.user.id}`)
        .setLabel('Share to channel')
        .setStyle(ButtonStyle.Secondary)
    );
    if (CONFIG.adminBaseUrl) {
      const base = String(CONFIG.adminBaseUrl).replace(/\/+$/, '');
      const portalUrl = `${base}/player.html`;
      row.addComponents(
        new ButtonBuilder()
          .setLabel('Open Player Portal')
          .setStyle(ButtonStyle.Link)
          .setURL(portalUrl)
      );
    }
    await interaction.editReply({ embeds: [embed], components: [row] });
    return;
  }

  if (interaction.commandName === 'wizard') {
    if (!CONFIG.adminBaseUrl) {
      await interaction.editReply('Wizard URL not configured. Set ADMIN_BASE_URL.');
      return;
    }
    const base = String(CONFIG.adminBaseUrl).replace(/\/+$/, '');
    const wizardUrl = `${base}/wizard.html`;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Open Character Wizard')
        .setStyle(ButtonStyle.Link)
        .setURL(wizardUrl)
    );
    await interaction.editReply({ content: 'Open the character wizard:', components: [row] });
    return;
  }

  if (interaction.commandName === 'profile-clear') {
    const userId = interaction.user.id;
    const existingName = characterByUserId.get(userId);
    if (existingName) userIdByCharacter.delete(existingName.toLowerCase());
    characterByUserId.delete(userId);
    profileByUserId.delete(userId);
    xpByUserId.delete(userId);
    saveProfileStore();
    saveCampaignState();
    await interaction.editReply('Your profile has been cleared.');
    return;
  }

  if (interaction.commandName === 'xp') {
    if (!isGameChannel) {
      await interaction.editReply('Use /xp in the game channel or its threads.');
      return;
    }
    const amount = interaction.options.getInteger('amount', true);
    xpByUserId.set(interaction.user.id, Math.max(0, amount));
    await interaction.editReply(`XP set to ${Math.max(0, amount)}.`);
    return;
  }

  if (interaction.commandName === 'help') {
    const helpEntries = [
      { name: 'setup', line: '/setup [overwrite:true]' },
      { name: 'mode', line: '/mode type:<free|structured>' },
      { name: 'check', line: '/check ability:<str|dex|con|int|wis|cha> [skill:<name>] [dc:<n>] [adv|dis]' },
      { name: 'percent', line: '/percent chance:<1-100>' },
      { name: 'rolltable', line: '/rolltable die:<d4|d6|d8|d10|d12|d20|d100>' },
      { name: 'setchar', line: '/setchar name:<name> OR /setchar bank_id:<id>' },
      { name: 'turn', line: '/turn user:@Player' },
      { name: 'roll', line: '/roll expression:<NdM[+/-K]> [adv|dis]' },
      { name: 'campaign-setup', line: '/campaign-setup start | /campaign-setup cancel' },
      { name: 'character-setup', line: '/character-setup start players:<n> | /character-setup cancel' },
      { name: 'start', line: '/start' },
      { name: 'test', line: '/test campaign | /test character | /test stats' },
      { name: 'lookup', line: '/lookup class|subclass|species|background|feat|spell query:<name>' },
      { name: 'homebrew', line: '/homebrew class|species|background|subclass|feat|spell ...' },
      { name: 'sheet', line: '/sheet [user:@Player] [bank_id:<id>]' },
      { name: 'bank', line: '/bank create | /bank list | /bank take id:<id> | /bank info id:<id> | /bank delete id:<id> | /bank delete name:<name>' },
      { name: 'npc', line: '/npc create | /npc list | /npc sheet id:<id> | /npc delete id:<id>' },
      { name: 'log-in', line: '/log-in' },
      { name: 'log-out', line: '/log-out' },
      { name: 'say', line: '/say text:<message>' },
      { name: 'profile', line: '/profile' },
      { name: 'profile-clear', line: '/profile-clear' },
      { name: 'xp', line: '/xp amount:<number>' },
      { name: 'save', line: '/save [name:<campaign>]' },
      { name: 'load', line: '/load name:<campaign>' },
      { name: 'delete', line: '/delete name:<campaign>' },
      { name: 'reset', line: '/reset' },
      { name: 'clear', line: '/clear' },
      { name: 'help', line: '/help' },
    ];
    const lines = ['Available commands:'];
    for (const entry of helpEntries) {
      if (
        isCommandEnabled(entry.name) &&
        isCommandAllowedForMember({
          name: entry.name,
          member: interaction.member,
          userId: interaction.user.id,
          guild: interaction.guild,
        })
      ) {
        lines.push(entry.line);
      }
    }
    if (isFeatureEnabled('enableMessageCommands')) {
      lines.push('Message shortcuts (game channel): /save:<name>, /load:<name>, /delete:<name>, /roll:<expr>');
    }
    await interaction.editReply(lines.join('\n'));
  }
}
