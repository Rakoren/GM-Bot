import { SlashCommandBuilder } from 'discord.js';

export const commandData = [
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
    .addIntegerOption(opt =>
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
    .setName('campaign-setup')
    .setDescription('Set campaign name, theme, and setting')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start campaign setup')
    )
    .addSubcommand(sub =>
      sub
        .setName('cancel')
        .setDescription('Cancel campaign setup')
    ),
  new SlashCommandBuilder()
    .setName('character-setup')
    .setDescription('Start character intake for players')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start character setup')
        .addIntegerOption(opt =>
          opt
            .setName('players')
            .setDescription('Number of players')
            .setMinValue(1)
            .setMaxValue(12)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('cancel')
        .setDescription('Cancel character setup')
    ),
  new SlashCommandBuilder()
    .setName('start')
    .setDescription('Start full campaign and character setup flow'),
  new SlashCommandBuilder()
    .setName('test')
    .setDescription('Jump to a setup step (testing)')
    .addSubcommand(sub =>
      sub
        .setName('campaign')
        .setDescription('Start campaign setup')
    )
    .addSubcommand(sub =>
      sub
        .setName('character')
        .setDescription('Start character setup (1 player)')
    )
    .addSubcommand(sub =>
      sub
        .setName('stats')
        .setDescription('Start stats intake (testing)')
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
    .addIntegerOption(opt =>
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
        .setName('create')
        .setDescription('Start character creator in #character-creator')
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List characters in the bank')
    )
    .addSubcommand(sub =>
      sub
        .setName('take')
        .setDescription('Take a character from the bank')
        .addIntegerOption(opt =>
          opt.setName('id').setDescription('Character ID from /bank list').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Show full details for a banked character')
        .addIntegerOption(opt =>
          opt.setName('id').setDescription('Character ID from /bank list').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a character from the bank')
        .addIntegerOption(opt =>
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
        .addStringOption(opt => opt.setName('stats').setDescription('Stat block or summary').setRequired(false))
        .addStringOption(opt => opt.setName('notes').setDescription('Notes').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List recent NPCs')
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
].map(cmd => cmd.toJSON());

export const COMMAND_NAMES = commandData.map(cmd => cmd.name);
