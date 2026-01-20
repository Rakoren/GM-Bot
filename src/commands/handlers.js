import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export async function handleChatInputCommand({
  interaction,
  session,
  sessionId,
  isGameChannel,
  isCreatorChannel,
  ctx,
}) {
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
    openai,
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

  if (interaction.commandName === 'setchar') {
    if (!isGameChannel) {
      await interaction.editReply('Use /setchar in the game channel or its threads.');
      return;
    }
    const bankId = interaction.options.getInteger('bank_id', false);
    if (bankId) {
      const row = getCharacterById(bankId);
      if (!row) {
        await interaction.editReply(`No character found for ID ${bankId}.`);
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
    const bankId = interaction.options.getInteger('bank_id', false);
    if (bankId) {
      const row = getCharacterById(bankId);
      if (!row) {
        await interaction.editReply(`No character found for ID ${bankId}.`);
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
      const rows = listCharacters();
      await interaction.editReply(formatBankList(rows));
      return;
    }
    if (sub === 'take') {
      if (!isGameChannel) {
        await interaction.editReply('Use /bank take in the game channel.');
        return;
      }
      const id = interaction.options.getInteger('id', true);
      const row = getCharacterById(id);
      if (!row) {
        await interaction.editReply(`No character found for ID ${id}.`);
        return;
      }
      setCharacter(interaction.user.id, row.name || interaction.user.username);
      setProfile(interaction.user.id, row);
      await interaction.editReply(buildCharacterSheet({ fields: row }, row.name || interaction.user.username));
      return;
    }
    if (sub === 'info') {
      const id = interaction.options.getInteger('id', true);
      const row = getCharacterById(id);
      if (!row) {
        await interaction.editReply(`No character found for ID ${id}.`);
        return;
      }
      await interaction.editReply(buildCharacterSheet({ fields: row }, row.name || `#${id}`));
      return;
    }
    if (sub === 'delete') {
      const id = interaction.options.getInteger('id', false);
      const name = interaction.options.getString('name', false);
      if (!id && !name) {
        await interaction.editReply('Provide either id or name to delete.');
        return;
      }
      if (id) {
        const row = getCharacterById(id);
        if (!row) {
          await interaction.editReply(`No character found for ID ${id}.`);
          return;
        }
        deleteCharacterById(id);
        await interaction.editReply(`Deleted character #${id} (${row.name || 'Unknown'}).`);
        return;
      }
      const count = deleteCharactersByName(name);
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
    await interaction.editReply({ embeds: [embed], components: [row] });
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
      { name: 'mode', line: '/mode type:<free|structured>' },
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
