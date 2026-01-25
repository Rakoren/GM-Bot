export async function handleMessageCreate({ msg, ctx }) {
  const {
    pendingPasteImports,
    importPastedDataToCsv,
    isFeatureEnabled,
    handleCharacterCreatorMessage,
    isGameTableMessage,
    getSessionIdFromMessage,
    getOrCreateLastSeenMap,
    getOrCreateSession,
    isOocMessage,
    handleOocMessage,
    handleCampaignSetupMessage,
    handleSession0Message,
    buildRosterBlock,
    characterByUserId,
    getOrCreateNotifySet,
    isMessageCommandEnabled,
    isCommandAllowedForMember,
    saveNamedCampaign,
    loadNamedCampaign,
    deleteNamedCampaign,
    saveCampaignState,
    parseDiceExpression,
    rollDice,
    formatDiceResult,
    setMode,
    setCharacter,
    setProfile,
    getCharacterName,
    enqueueMessage,
    now,
    path,
  } = ctx;

  try {
    if (msg.author.bot) {
      return;
    }

    const pending = pendingPasteImports.get(msg.author.id);
    if (pending && pending.channelId === msg.channel.id) {
      if (!isFeatureEnabled('enableImports')) {
        pendingPasteImports.delete(msg.author.id);
        await msg.channel.send('Imports are disabled by the admin.');
        return;
      }
      pendingPasteImports.delete(msg.author.id);
      const result = importPastedDataToCsv(pending.type, msg.content);
      if (!result.ok) {
        await msg.channel.send(`Import failed: ${result.message || 'Unknown error.'}`);
        return;
      }
      const label = result.id ? `${result.name || 'Imported'} (${result.id})` : (result.name || 'Imported');
      await msg.channel.send(`Imported ${pending.type}: ${label}`);
      return;
    }

    const handledCreator = await handleCharacterCreatorMessage(msg);
    if (handledCreator) return;

    if (!isGameTableMessage(msg)) return;

    const sessionId = getSessionIdFromMessage(msg);
    const seenMap = getOrCreateLastSeenMap(sessionId);
    seenMap.set(msg.author.id, now());

    const session = getOrCreateSession(sessionId);

    if (isOocMessage(msg.content)) {
      if (!isFeatureEnabled('enableAutoReplies')) {
        await msg.channel.send('DM replies are disabled by the admin.');
        return;
      }
      await handleOocMessage(session, msg);
      return;
    }

    const handledCampaignSetup = await handleCampaignSetupMessage(session, msg);
    if (handledCampaignSetup) return;
    const handledSession0 = await handleSession0Message(session, msg);
    if (handledSession0) return;

    if (msg.content.trim().toLowerCase() === '.roster') {
      const rosterBlock = buildRosterBlock(session.sessionId, msg.guild);
      await msg.channel.send(rosterBlock);
      return;
    }

    const hasSession0Data = session.session0Responses.some(r => r.userId === msg.author.id);
    const hasCharacter = characterByUserId.has(msg.author.id);
    if (!session.session0Active && !hasSession0Data && !hasCharacter) {
      const notified = getOrCreateNotifySet(sessionId);
      if (!notified.has(msg.author.id)) {
        notified.add(msg.author.id);
        await msg.channel.send(
          `${msg.author}, game in session. Please choose a character:\n` +
          `1) /bank list then /bank take <id>\n` +
          `2) Go to #character-creator and use /bank create\n` +
          `I'll add you once you have a character.`
        );
      }
      return;
    }

    if (msg.content.startsWith('/save:')) {
      if (!isMessageCommandEnabled('save')) {
        await msg.channel.send('Command disabled by the admin.');
        return;
      }
      if (
        !isCommandAllowedForMember({
          name: 'save',
          member: msg.member,
          userId: msg.author.id,
          guild: msg.guild,
        })
      ) {
        await msg.channel.send('You do not have access to this command.');
        return;
      }
      const name = msg.content.slice('/save:'.length).trim();
      if (!name) {
        await msg.channel.send('Usage: /save:<name>');
        return;
      }
      const filePath = saveNamedCampaign(name);
      if (!filePath) {
        await msg.channel.send('Provide a valid campaign name.');
        return;
      }
      await msg.channel.send(`Campaign saved: ${path.basename(filePath)}`);
      return;
    }

    if (msg.content.startsWith('/load:')) {
      if (!isMessageCommandEnabled('load')) {
        await msg.channel.send('Command disabled by the admin.');
        return;
      }
      if (
        !isCommandAllowedForMember({
          name: 'load',
          member: msg.member,
          userId: msg.author.id,
          guild: msg.guild,
        })
      ) {
        await msg.channel.send('You do not have access to this command.');
        return;
      }
      const name = msg.content.slice('/load:'.length).trim();
      if (!name) {
        await msg.channel.send('Usage: /load:<name>');
        return;
      }
      const filePath = loadNamedCampaign(name);
      if (!filePath) {
        await msg.channel.send(`No campaign found for "${name}".`);
        return;
      }
      saveCampaignState();
      await msg.channel.send(`Campaign loaded: ${path.basename(filePath)}`);
      return;
    }

    if (msg.content.startsWith('/delete:')) {
      if (!isMessageCommandEnabled('delete')) {
        await msg.channel.send('Command disabled by the admin.');
        return;
      }
      if (
        !isCommandAllowedForMember({
          name: 'delete',
          member: msg.member,
          userId: msg.author.id,
          guild: msg.guild,
        })
      ) {
        await msg.channel.send('You do not have access to this command.');
        return;
      }
      const name = msg.content.slice('/delete:'.length).trim();
      if (!name) {
        await msg.channel.send('Usage: /delete:<name>');
        return;
      }
      const ok = deleteNamedCampaign(name);
      if (!ok) {
        await msg.channel.send(`No campaign found for "${name}".`);
        return;
      }
      await msg.channel.send(`Campaign deleted: ${name}`);
      return;
    }

    if (msg.content.startsWith('/roll:')) {
      if (!isMessageCommandEnabled('roll')) {
        await msg.channel.send('Command disabled by the admin.');
        return;
      }
      if (
        !isCommandAllowedForMember({
          name: 'roll',
          member: msg.member,
          userId: msg.author.id,
          guild: msg.guild,
        })
      ) {
        await msg.channel.send('You do not have access to this command.');
        return;
      }
      const expr = msg.content.slice('/roll:'.length).trim();
      if (!expr) {
        await msg.channel.send('Usage: /roll:<NdM[+/-K]> (e.g., /roll:1d20+5)');
        return;
      }
      const parsed = parseDiceExpression(expr);
      if (!parsed.ok) {
        await msg.channel.send(parsed.error || 'Invalid dice expression.');
        return;
      }
      const result = rollDice(parsed.value);
      await msg.channel.send(formatDiceResult(result));
      return;
    }

    if (msg.content.startsWith('/mode')) {
      if (!isMessageCommandEnabled('mode')) {
        await msg.channel.send('Command disabled by the admin.');
        return;
      }
      if (
        !isCommandAllowedForMember({
          name: 'mode',
          member: msg.member,
          userId: msg.author.id,
          guild: msg.guild,
        })
      ) {
        await msg.channel.send('You do not have access to this command.');
        return;
      }
      const arg = msg.content.split(/\s+/)[1]?.toLowerCase();
      if (arg === 'free' || arg === 'structured') {
        setMode(session, arg);
        await msg.channel.send(`Mode set to ${arg.toUpperCase()}.`);
      } else {
        await msg.channel.send('Usage: /mode free OR /mode structured');
      }
      return;
    }

    if (msg.content.startsWith('/setchar')) {
      if (!isMessageCommandEnabled('setchar')) {
        await msg.channel.send('Command disabled by the admin.');
        return;
      }
      if (
        !isCommandAllowedForMember({
          name: 'setchar',
          member: msg.member,
          userId: msg.author.id,
          guild: msg.guild,
        })
      ) {
        await msg.channel.send('You do not have access to this command.');
        return;
      }
      const name = msg.content.replace('/setchar', '').trim();
      if (!name) {
        await msg.channel.send('Usage: /setchar <CharacterName>');
        return;
      }
      setCharacter(msg.author.id, name);
      setProfile(msg.author.id, { name });
      await msg.channel.send(`Character linked: ${msg.author} -> ${name}`);
      return;
    }

    if (msg.content.startsWith('/turn')) {
      if (!isMessageCommandEnabled('turn')) {
        await msg.channel.send('Command disabled by the admin.');
        return;
      }
      if (
        !isCommandAllowedForMember({
          name: 'turn',
          member: msg.member,
          userId: msg.author.id,
          guild: msg.guild,
        })
      ) {
        await msg.channel.send('You do not have access to this command.');
        return;
      }
      const mention = msg.mentions.users.first();
      if (!mention) {
        await msg.channel.send('Usage: /turn @User');
        return;
      }
      session.activePlayerId = mention.id;
      setMode(session, 'structured');
      await msg.channel.send(`Structured turn set. Next: ${getCharacterName(mention.id, mention.username)}, you're up.`);
      return;
    }

    if (!isFeatureEnabled('enableAutoReplies')) {
      await msg.channel.send('DM replies are disabled by the admin.');
      return;
    }
    await enqueueMessage(session, msg);
  } catch (err) {
    console.error(err);
    try {
      await msg.channel.send('Something went wrong on my end. Try again.');
    } catch {}
  }
}
