export async function handleMessageCreate({ msg, ctx }) {
  const {
    pendingPasteImports,
    importPastedDataToCsv,
    isFeatureEnabled,
    isGameTableMessage,
    getSessionIdFromMessage,
    getOrCreateLastSeenMap,
    getOrCreateSession,
    isOocMessage,
    handleOocMessage,
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
    openai,
    CONFIG,
    isAiActive,
    combatEngine,
    profileByUserId,
    reloadProfileStore,
    saveCombatState,
    saveLootState,
    buildNpcPersonaBlock,
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

    if (msg.content.trim().toLowerCase() === '.roster') {
      const rosterBlock = buildRosterBlock(session.sessionId, msg.guild);
      await msg.channel.send(rosterBlock);
      return;
    }

    const resolvePendingCombat = async () => {
      const pending = session.pendingCombatAction;
      if (!pending || pending.userId !== msg.author.id) return false;
      const combat = combatEngine?.getCombat(session);
      if (!combat) {
        session.pendingCombatAction = null;
        return false;
      }
      const text = String(msg.content || '').toLowerCase();
      if (pending.type === 'cast') {
        if (text.includes('miss') || text.includes('fail')) {
          await msg.channel.send('Got it - spell missed or failed.');
          session.pendingCombatAction = null;
          return true;
        }
        if (text.includes('hit') || text.includes('success')) {
          await msg.channel.send('Got it - spell hits or succeeds.');
          session.pendingCombatAction = null;
          return true;
        }
        const nums = text.match(/\d+/g)?.map(n => Number(n)) || [];
        if (!nums.length) return false;
        await msg.channel.send(`Got it - spell results recorded (${nums.join(', ')}).`);
        session.pendingCombatAction = null;
        return true;
      }
      if (text.includes('miss') || text.includes('fail')) {
        await msg.channel.send('Got it - miss.');
        session.pendingCombatAction = null;
        return true;
      }
      const nums = text.match(/\d+/g)?.map(n => Number(n)) || [];
      if (!nums.length) return false;
      const toHit = nums[0];
      const dmg = nums.length > 1 ? nums[1] : null;
      const target = combat.combatants?.[pending.targetId];
      if (!target) {
        session.pendingCombatAction = null;
        await msg.channel.send('Target not found anymore.');
        return true;
      }
      let hit = true;
      if (Number.isFinite(target.ac)) {
        hit = toHit >= target.ac;
      }
      if (!hit) {
        await msg.channel.send(`Attack total ${toHit} - miss.`);
        session.pendingCombatAction = null;
        return true;
      }
      if (dmg === null) {
        await msg.channel.send(`Hit with ${toHit}. What is the damage total?`);
        return true;
      }
      combatEngine.applyDamage(combat, target.id, dmg);
      await msg.channel.send(
        `Hit (${toHit}). Damage ${dmg}. ${target.name} HP: ${target.hp}/${target.maxHp ?? '?'}`
      );
      if (typeof saveCombatState === 'function') saveCombatState(session);
      session.pendingCombatAction = null;
      return true;
    };

    const detectCombatIntent = (text) => {
      const t = String(text || '').toLowerCase();
      return (
        /\battack\b/.test(t) ||
        /\bstrike\b/.test(t) ||
        /\bswing\b/.test(t) ||
        /\bshoot\b/.test(t) ||
        /\bstab\b/.test(t) ||
        /\bbite\b/.test(t) ||
        /\bcast\b/.test(t) ||
        /\bsmite\b/.test(t)
      );
    };

    if (session.aiPaused) {
      return;
    }

    if (combatEngine && (await resolvePendingCombat())) {
      return;
    }

    if (combatEngine && detectCombatIntent(msg.content)) {
      const existing = combatEngine.getCombat(session);
      if (!existing || existing.status !== 'active') {
        if (typeof reloadProfileStore === 'function') {
          reloadProfileStore();
        }
        const profile = profileByUserId.get(msg.author.id);
        if (!profile) {
          await msg.channel.send('Link a character first with /setchar or /bank take.');
          return;
        }
        const combat = existing || combatEngine.createCombat(session, {
          name: 'Combat',
          channelId: msg.channel.id,
          createdBy: msg.author.id,
        });
        const combatant = combatEngine.buildCombatantFromProfile(msg.author.id, profile);
        combat.combatants[combatant.id] = combatant;
        combatEngine.rollInitiative(combat, combatant.id, {});
        combatEngine.beginCombat(combat);
        if (typeof saveCombatState === 'function') saveCombatState(session);
        if (typeof saveLootState === 'function') saveLootState(session);
        await msg.channel.send(combatEngine.formatCombatStatus(combat));
        return;
      }

      if (existing.channelId && existing.channelId !== msg.channel.id) {
        return;
      }

      const active = combatEngine.getActiveCombatant(existing);
      if (active?.userId && active.userId !== msg.author.id) {
        await msg.channel.send(`It is ${active.name}'s turn. Use /combat next if you are the DM.`);
        return;
      }

      const lowered = String(msg.content || '').toLowerCase();
      let targets = Object.values(existing.combatants || {});
      if (!targets.some(t => t.type === 'npc')) {
        if (lowered.includes('goblin')) {
          const a = combatEngine.addNpc(existing, { name: 'Goblin A', hp: 7, ac: 13 });
          const b = combatEngine.addNpc(existing, { name: 'Goblin B', hp: 7, ac: 13 });
          if (a && b) {
            await msg.channel.send('Goblins appear: Goblin A and Goblin B.');
          }
        }
      }
      targets = Object.values(existing.combatants || {});
      const attacker = active || targets.find(t => t?.userId === msg.author.id);
      if (!attacker) {
        await msg.channel.send('No active combatant found for you. Use /combat join.');
        return;
      }

      if (!isAiActive?.() || !openai) {
        await msg.channel.send('AI is passive or unavailable. Please be explicit about your target.');
        return;
      }

      const context = {
        attacker: {
          name: attacker.name,
          weapons: Array.isArray(attacker.weapons) ? attacker.weapons : [],
        },
        targets: targets.map(t => ({
          id: t.id,
          name: t.name,
          type: t.type,
        })),
        phase: existing.phase,
      };

      const prompt = [
        'Interpret the player intent and return JSON only.',
        'If target or action is unclear, return: {"type":"ask","question":"..."}',
        'Otherwise return one of:',
        '{"type":"attack","target":"<name>","weapon":"<optional>","adv":true|false,"dis":true|false}',
        '{"type":"cast","spell":"<name>","actionType":"action|bonus","target":"<optional>","level":<optional number>}',
        '{"type":"sequence","steps":[{...},{...}]} (steps use attack/cast types)',
        `Player intent: "${msg.content}"`,
        `Context: ${JSON.stringify(context)}`,
      ].join('\n');

      try {
        const response = await openai.chat.completions.create({
          model: CONFIG.openaiModel,
          messages: [
            { role: 'system', content: 'You are a combat intent parser.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_completion_tokens: 120,
        });
        const text = response.choices?.[0]?.message?.content?.trim() || '';
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        if (!parsed) {
          await msg.channel.send('I need a clearer target or action. Who are you attacking?');
          return;
        }
        if (parsed.type === 'ask' && parsed.question) {
          await msg.channel.send(parsed.question);
          return;
        }
        if (parsed.type === 'attack') {
          const targetName = String(parsed.target || '').toLowerCase();
          const target = targets.find(t => String(t.name || '').toLowerCase() === targetName);
          if (!target) {
            await msg.channel.send('Who are you attacking?');
            return;
          }
          const weaponText = parsed.weapon ? ` with ${parsed.weapon}` : '';
          const advText = parsed.adv ? ' (advantage)' : parsed.dis ? ' (disadvantage)' : '';
          await msg.channel.send(
            `${attacker.name} attacks ${target.name}${weaponText}.${advText}\n` +
            `Please roll to hit and damage, then tell me the totals.`
          );
          session.pendingCombatAction = {
            type: 'attack',
            userId: msg.author.id,
            attackerId: attacker.id,
            targetId: target.id,
          };
          return;
        }
        if (parsed.type === 'cast') {
          const actionType = parsed.actionType === 'bonus' ? 'bonus' : 'action';
          await msg.channel.send(
            `${attacker.name} casts ${parsed.spell || 'a spell'}${parsed.target ? ` on ${parsed.target}` : ''} (${actionType}).\n` +
            `Please roll any required attack or save and damage, then tell me the results.`
          );
          session.pendingCombatAction = {
            type: 'cast',
            userId: msg.author.id,
            attackerId: attacker.id,
          };
          return;
        }
        if (parsed.type === 'sequence' && Array.isArray(parsed.steps)) {
          for (const step of parsed.steps) {
            if (step.type === 'cast') {
              const actionType = step.actionType === 'bonus' ? 'bonus' : 'action';
              await msg.channel.send(
                `${attacker.name} casts ${step.spell || 'a spell'}${step.target ? ` on ${step.target}` : ''} (${actionType}).\n` +
                `Please roll any required attack/save and damage, then tell me the results.`
              );
              session.pendingCombatAction = {
                type: 'cast',
                userId: msg.author.id,
                attackerId: attacker.id,
              };
            }
            if (step.type === 'attack') {
              const targetName = String(step.target || '').toLowerCase();
              const target = targets.find(t => String(t.name || '').toLowerCase() === targetName);
              if (!target) {
                await msg.channel.send('Who are you attacking?');
                return;
              }
              await msg.channel.send(
                `${attacker.name} attacks ${target.name}${step.weapon ? ` with ${step.weapon}` : ''}.\n` +
                `Please roll to hit and damage, then tell me the totals.`
              );
              session.pendingCombatAction = {
                type: 'attack',
                userId: msg.author.id,
                attackerId: attacker.id,
                targetId: target.id,
              };
            }
          }
          return;
        }
      } catch (err) {
        console.error('Combat intent parsing failed:', err);
        await msg.channel.send('I need a clearer target or action. Who are you attacking?');
        return;
      }
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
    // If a message explicitly addresses a known NPC by name, route with persona context.
    if (typeof buildNpcPersonaBlock === 'function') {
      const npcBlock = buildNpcPersonaBlock([
        {
          content: msg.content,
        },
      ]);
      if (npcBlock) {
        const original = session.systemPrompt;
        session.systemPrompt = `${original}\n\nNPC PERSONAS:\n${npcBlock}`;
        await enqueueMessage(session, msg);
        session.systemPrompt = original;
        return;
      }
    }

    await enqueueMessage(session, msg);
  } catch (err) {
    console.error(err);
    try {
      await msg.channel.send('Something went wrong on my end. Try again.');
    } catch {}
  }
}
