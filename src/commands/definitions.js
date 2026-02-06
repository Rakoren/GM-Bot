import { SlashCommandBuilder } from 'discord.js';

export const commandData = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show bot status'),
  new SlashCommandBuilder()
    .setName('ai')
    .setDescription('AI control')
    .addSubcommand(sub =>
      sub
        .setName('mode')
        .setDescription('Set AI mode')
        .addStringOption(opt =>
          opt
            .setName('value')
            .setDescription('AI mode')
            .setRequired(true)
            .addChoices(
              { name: 'active', value: 'active' },
              { name: 'passive', value: 'passive' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Show AI mode')
    ),
  new SlashCommandBuilder()
    .setName('mode')
    .setDescription('Set DM mode')
    .addStringOption(opt =>
      opt
        .setName('type')
        .setDescription('Mode type')
        .setRequired(true)
        .addChoices(
          { name: 'free', value: 'free' },
          { name: 'structured', value: 'structured' }
        )
    ),
  new SlashCommandBuilder()
    .setName('setchar')
    .setDescription('Link your Discord user to a character name')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Character name').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('bank_id').setDescription('Character ID from /bank list').setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('turn')
    .setDescription('Set the active turn to a user (structured mode)')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Active player').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice (e.g., 1d20+5, 2d6, d8, 1d20 adv)')
    .addStringOption(opt =>
      opt.setName('expression').setDescription('Dice expression').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('check')
    .setDescription('Roll an ability/skill check')
    .addStringOption(opt =>
      opt
        .setName('ability')
        .setDescription('Ability score')
        .setRequired(true)
        .addChoices(
          { name: 'STR', value: 'str' },
          { name: 'DEX', value: 'dex' },
          { name: 'CON', value: 'con' },
          { name: 'INT', value: 'int' },
          { name: 'WIS', value: 'wis' },
          { name: 'CHA', value: 'cha' }
        )
    )
    .addStringOption(opt =>
      opt
        .setName('skill')
        .setDescription('Skill (optional)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('dc').setDescription('Difficulty Class').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('adv').setDescription('Advantage').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('dis').setDescription('Disadvantage').setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('percent')
    .setDescription('Roll a percentile check')
    .addIntegerOption(opt =>
      opt.setName('chance').setDescription('Percent chance (1-100)').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('rolltable')
    .setDescription('Roll a random table die')
    .addStringOption(opt =>
      opt
        .setName('die')
        .setDescription('Die to roll')
        .setRequired(true)
        .addChoices(
          { name: 'd4', value: '4' },
          { name: 'd6', value: '6' },
          { name: 'd8', value: '8' },
          { name: 'd10', value: '10' },
          { name: 'd12', value: '12' },
          { name: 'd20', value: '20' },
          { name: 'd100', value: '100' }
        )
    ),
  new SlashCommandBuilder()
    .setName('combat')
    .setDescription('Combat controls')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start a combat in this channel')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Combat name').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('join')
        .setDescription('Join combat with your linked character')
    )
    .addSubcommand(sub =>
      sub
        .setName('add-npc')
        .setDescription('Add an NPC combatant')
        .addStringOption(opt =>
          opt.setName('name').setDescription('NPC name').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('hp').setDescription('HP').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('ac').setDescription('AC').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('initiative').setDescription('Initiative').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('init')
        .setDescription('Roll or set initiative for yourself')
        .addIntegerOption(opt =>
          opt.setName('value').setDescription('Set initiative directly').setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('adv').setDescription('Advantage').setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('dis').setDescription('Disadvantage').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('begin')
        .setDescription('Begin combat (sort initiative)')
    )
    .addSubcommand(sub =>
      sub
        .setName('next')
        .setDescription('Advance to the next turn')
    )
    .addSubcommand(sub =>
      sub
        .setName('use')
        .setDescription('Mark an action/bonus/reaction as used')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Which resource to spend')
            .setRequired(true)
            .addChoices(
              { name: 'action', value: 'action' },
              { name: 'bonus', value: 'bonus' },
              { name: 'reaction', value: 'reaction' }
            )
        )
        .addUserOption(opt =>
          opt.setName('user').setDescription('Target player (DM only)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('resource')
        .setDescription('Spend or restore a class resource')
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('How to update the resource')
            .setRequired(true)
            .addChoices(
              { name: 'spend', value: 'spend' },
              { name: 'restore', value: 'restore' },
              { name: 'set', value: 'set' }
            )
        )
        .addStringOption(opt =>
          opt.setName('resource').setDescription('Resource name or id').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('amount').setDescription('Amount to change/set').setRequired(false)
        )
        .addUserOption(opt =>
          opt.setName('user').setDescription('Target player (DM only)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('phase')
        .setDescription('Set combat phase')
        .addStringOption(opt =>
          opt
            .setName('value')
            .setDescription('turn-start, action, bonus-reaction, turn-end')
            .setRequired(true)
            .addChoices(
              { name: 'turn-start', value: 'turn-start' },
              { name: 'action', value: 'action' },
              { name: 'bonus-reaction', value: 'bonus-reaction' },
              { name: 'turn-end', value: 'turn-end' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('next-phase')
        .setDescription('Advance to the next phase')
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Show combat status')
    )
    .addSubcommand(sub =>
      sub
        .setName('attack')
        .setDescription('Attack a target')
        .addStringOption(opt =>
          opt.setName('target').setDescription('Target name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('weapon').setDescription('Weapon name').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('attacker').setDescription('Attacker name (DM only)').setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('adv').setDescription('Advantage').setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('dis').setDescription('Disadvantage').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('damage').setDescription('Override damage dice (e.g. 1d6+3)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('damage')
        .setDescription('Apply damage to a target')
        .addStringOption(opt =>
          opt.setName('target').setDescription('Target name').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('amount').setDescription('Damage amount').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('condition')
        .setDescription('Add or remove a condition')
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Add or remove')
            .setRequired(true)
            .addChoices(
              { name: 'add', value: 'add' },
              { name: 'remove', value: 'remove' }
            )
        )
        .addStringOption(opt =>
          opt.setName('target').setDescription('Target name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('condition').setDescription('Condition name').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('cast')
        .setDescription('Spend a spell slot and log a cast')
        .addIntegerOption(opt =>
          opt.setName('level').setDescription('Spell level').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('spell').setDescription('Spell name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('target').setDescription('Target name').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('save')
        .setDescription('Roll a saving throw')
        .addStringOption(opt =>
          opt
            .setName('ability')
            .setDescription('Ability (str/dex/con/int/wis/cha)')
            .setRequired(true)
            .addChoices(
              { name: 'STR', value: 'str' },
              { name: 'DEX', value: 'dex' },
              { name: 'CON', value: 'con' },
              { name: 'INT', value: 'int' },
              { name: 'WIS', value: 'wis' },
              { name: 'CHA', value: 'cha' }
            )
        )
        .addIntegerOption(opt =>
          opt.setName('dc').setDescription('Save DC').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('target').setDescription('Target name').setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('adv').setDescription('Advantage').setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('dis').setDescription('Disadvantage').setRequired(false)
        )
    ),
  new SlashCommandBuilder()
    .setName('roster')
    .setDescription('Roster tools')
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('Show roster status')
    )
    .addSubcommand(sub =>
      sub
        .setName('sync')
        .setDescription('Sync roster/voice presence')
    ),
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Create required channels and save IDs')
    .addBooleanOption(opt =>
      opt
        .setName('overwrite')
        .setDescription('Create new channels even if ones exist')
        .setRequired(false)
    ),
    new SlashCommandBuilder()
      .setName('campaign')
      .setDescription('Manage campaigns')
      .addSubcommand(sub =>
        sub
          .setName('create')
          .setDescription('Create and activate a campaign')
          .addStringOption(opt =>
            opt.setName('name').setDescription('Campaign name').setRequired(true)
          )
      )
      .addSubcommand(sub =>
        sub
          .setName('select')
          .setDescription('Load and activate a saved campaign')
          .addStringOption(opt =>
            opt.setName('name').setDescription('Campaign name').setRequired(true)
          )
      )
      .addSubcommand(sub =>
        sub
          .setName('status')
          .setDescription('Show active campaign status')
      ),
    new SlashCommandBuilder()
      .setName('session')
      .setDescription('Control the live session')
      .addSubcommand(sub =>
        sub
          .setName('start')
          .setDescription('Start the session in this channel')
      )
      .addSubcommand(sub =>
        sub
          .setName('end')
          .setDescription('End the session in this channel')
      )
      .addSubcommand(sub =>
        sub
          .setName('pause')
          .setDescription('Pause AI responses in this channel')
      )
      .addSubcommand(sub =>
        sub
          .setName('resume')
          .setDescription('Resume AI responses in this channel')
      )
      .addSubcommand(sub =>
        sub
          .setName('status')
          .setDescription('Show session status')
      ),
  new SlashCommandBuilder()
    .setName('lookup')
    .setDescription('Search rules reference data')
    .addSubcommand(sub =>
      sub
        .setName('class')
        .setDescription('Lookup a class')
        .addStringOption(opt =>
          opt.setName('query').setDescription('Name to search').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('subclass')
        .setDescription('Lookup a subclass')
        .addStringOption(opt =>
          opt.setName('query').setDescription('Name to search').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('species')
        .setDescription('Lookup a species')
        .addStringOption(opt =>
          opt.setName('query').setDescription('Name to search').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('background')
        .setDescription('Lookup a background')
        .addStringOption(opt =>
          opt.setName('query').setDescription('Name to search').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('feat')
        .setDescription('Lookup a feat')
        .addStringOption(opt =>
          opt.setName('query').setDescription('Name to search').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('spell')
        .setDescription('Lookup a spell')
        .addStringOption(opt =>
          opt.setName('query').setDescription('Name to search').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('item')
        .setDescription('Lookup an item')
        .addStringOption(opt =>
          opt.setName('query').setDescription('Name to search').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('monster')
        .setDescription('Lookup a monster')
        .addStringOption(opt =>
          opt.setName('query').setDescription('Name to search').setRequired(true)
        )
    ),
  new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Rules registry commands')
    .addSubcommand(sub =>
      sub
        .setName('reload')
        .setDescription('Reload rules registry (and combat indexes)')
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Show rules registry counts by type')
    ),
  new SlashCommandBuilder()
    .setName('homebrew')
    .setDescription('Add homebrew reference data')
    .addSubcommand(sub =>
      sub
        .setName('class')
        .setDescription('Add a class')
        .addStringOption(opt => opt.setName('name').setDescription('Class name').setRequired(true))
        .addStringOption(opt => opt.setName('primary_ability').setDescription('Primary ability').setRequired(false))
        .addStringOption(opt => opt.setName('hit_die').setDescription('Hit die').setRequired(false))
        .addStringOption(opt => opt.setName('armor').setDescription('Armor proficiencies').setRequired(false))
        .addStringOption(opt => opt.setName('weapons').setDescription('Weapon proficiencies').setRequired(false))
        .addStringOption(opt => opt.setName('saving_throws').setDescription('Saving throws').setRequired(false))
        .addStringOption(opt => opt.setName('skills').setDescription('Skill choices').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('species')
        .setDescription('Add a species')
        .addStringOption(opt => opt.setName('name').setDescription('Species name').setRequired(true))
        .addStringOption(opt => opt.setName('size').setDescription('Size').setRequired(false))
        .addStringOption(opt => opt.setName('speed').setDescription('Speed').setRequired(false))
        .addStringOption(opt => opt.setName('languages').setDescription('Languages').setRequired(false))
        .addStringOption(opt => opt.setName('traits').setDescription('Special traits').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('background')
        .setDescription('Add a background')
        .addStringOption(opt => opt.setName('name').setDescription('Background name').setRequired(true))
        .addStringOption(opt => opt.setName('skills').setDescription('Skill proficiencies').setRequired(false))
        .addStringOption(opt => opt.setName('tools').setDescription('Tool proficiencies').setRequired(false))
        .addStringOption(opt => opt.setName('languages').setDescription('Languages').setRequired(false))
        .addStringOption(opt => opt.setName('equipment').setDescription('Equipment').setRequired(false))
        .addStringOption(opt => opt.setName('feat').setDescription('Feat granted').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('subclass')
        .setDescription('Add a subclass')
        .addStringOption(opt => opt.setName('name').setDescription('Subclass name').setRequired(true))
        .addStringOption(opt => opt.setName('class').setDescription('Parent class name').setRequired(false))
        .addStringOption(opt => opt.setName('level').setDescription('Level gained').setRequired(false))
        .addStringOption(opt => opt.setName('summary').setDescription('Short summary').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('feat')
        .setDescription('Add a feat')
        .addStringOption(opt => opt.setName('name').setDescription('Feat name').setRequired(true))
        .addStringOption(opt => opt.setName('prereq').setDescription('Prerequisites').setRequired(false))
        .addStringOption(opt => opt.setName('summary').setDescription('Benefit summary').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('spell')
        .setDescription('Add a spell')
        .addStringOption(opt => opt.setName('name').setDescription('Spell name').setRequired(true))
        .addIntegerOption(opt => opt.setName('level').setDescription('Spell level').setRequired(false))
        .addStringOption(opt => opt.setName('school').setDescription('School').setRequired(false))
        .addStringOption(opt => opt.setName('casting_time').setDescription('Casting time').setRequired(false))
        .addStringOption(opt => opt.setName('range').setDescription('Range').setRequired(false))
        .addStringOption(opt => opt.setName('components').setDescription('Components').setRequired(false))
        .addStringOption(opt => opt.setName('duration').setDescription('Duration').setRequired(false))
        .addStringOption(opt => opt.setName('concentration').setDescription('Concentration?').setRequired(false))
        .addStringOption(opt => opt.setName('ritual').setDescription('Ritual?').setRequired(false))
        .addStringOption(opt => opt.setName('attack_save').setDescription('Attack/Save').setRequired(false))
        .addStringOption(opt => opt.setName('damage_type').setDescription('Damage type').setRequired(false))
        .addStringOption(opt => opt.setName('effect').setDescription('Short effect').setRequired(false))
    ),
  new SlashCommandBuilder()
    .setName('sheet')
    .setDescription('Show a character sheet summary')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Player to view').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('bank_id').setDescription('Character ID from /bank list').setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('save')
    .setDescription('Save campaign by name')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Campaign name').setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reset in-memory campaign state (keeps character bank)'),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear current campaign (in-memory only, bank preserved)'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),
  new SlashCommandBuilder()
    .setName('load')
    .setDescription('Load campaign by name')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Campaign name').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Delete a saved campaign by name')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Campaign name').setRequired(true)
    ),
    new SlashCommandBuilder()
      .setName('bank')
      .setDescription('Character bank')
      .addSubcommand(sub =>
        sub
          .setName('list')
          .setDescription('List characters in the bank')
      )
    .addSubcommand(sub =>
      sub
        .setName('take')
        .setDescription('Take a character from the bank')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Character ID from /bank list').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Show full details for a banked character')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Character ID from /bank list').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a character from the bank')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Character ID from /bank list').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('name').setDescription('Character name to delete').setRequired(false)
        )
    ),
  new SlashCommandBuilder()
    .setName('npc')
    .setDescription('NPC manager')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create an NPC')
        .addStringOption(opt => opt.setName('name').setDescription('NPC name').setRequired(true))
        .addStringOption(opt => opt.setName('role').setDescription('Role or archetype').setRequired(false))
        .addStringOption(opt => opt.setName('personality').setDescription('Personality summary').setRequired(false))
        .addStringOption(opt => opt.setName('motive').setDescription('Core motive or goal').setRequired(false))
        .addStringOption(opt => opt.setName('voice').setDescription('Voice or dialogue style').setRequired(false))
        .addStringOption(opt => opt.setName('quirk').setDescription('Distinctive quirk').setRequired(false))
        .addStringOption(opt => opt.setName('appearance').setDescription('Appearance cues').setRequired(false))
        .addStringOption(opt => opt.setName('stats').setDescription('Stat block or summary').setRequired(false))
        .addStringOption(opt => opt.setName('notes').setDescription('Notes').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('quick')
        .setDescription('Quick save an NPC')
        .addStringOption(opt => opt.setName('name').setDescription('NPC name').setRequired(true))
        .addStringOption(opt => opt.setName('role').setDescription('Role or archetype').setRequired(false))
        .addStringOption(opt => opt.setName('personality').setDescription('Personality summary').setRequired(false))
        .addStringOption(opt => opt.setName('motive').setDescription('Core motive or goal').setRequired(false))
        .addStringOption(opt => opt.setName('voice').setDescription('Voice or dialogue style').setRequired(false))
        .addStringOption(opt => opt.setName('quirk').setDescription('Distinctive quirk').setRequired(false))
        .addStringOption(opt => opt.setName('appearance').setDescription('Appearance cues').setRequired(false))
        .addStringOption(opt => opt.setName('notes').setDescription('Notes').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List recent NPCs')
    )
    .addSubcommand(sub =>
      sub
        .setName('generate')
        .setDescription('Generate NPC name and lore seeds')
        .addStringOption(opt => opt.setName('culture').setDescription('Culture or region').setRequired(false))
        .addStringOption(opt => opt.setName('role').setDescription('Role or archetype').setRequired(false))
        .addIntegerOption(opt => opt.setName('count').setDescription('How many').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('sheet')
        .setDescription('Show an NPC sheet')
        .addIntegerOption(opt =>
          opt.setName('id').setDescription('NPC ID from /npc list').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete an NPC')
        .addIntegerOption(opt =>
          opt.setName('id').setDescription('NPC ID from /npc list').setRequired(true)
        )
    ),
  new SlashCommandBuilder()
    .setName('log-in')
    .setDescription('Mark yourself as logged in (without voice)'),
  new SlashCommandBuilder()
    .setName('log-out')
    .setDescription('Remove your manual logged-in status'),
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Speak a test line in the voice channel')
    .addStringOption(opt =>
      opt.setName('text').setDescription('Text to speak').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show your character profile card'),
  new SlashCommandBuilder()
    .setName('profile-clear')
    .setDescription('Clear your saved character profile'),
  new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Set your XP (testing only)')
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('XP amount').setRequired(true)
    ),
    new SlashCommandBuilder()
      .setName('wizard')
      .setDescription('Open the web character creation wizard'),
].map(cmd => cmd.toJSON());

export const COMMAND_NAMES = commandData.map(cmd => cmd.name);
