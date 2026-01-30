const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const chapterDir = path.join(repoRoot, 'docs', 'chapter-04');
const backgroundsDir = path.join(chapterDir, 'backgrounds');
const speciesDir = path.join(chapterDir, 'species');
const originFeatsDir = path.join(chapterDir, 'origin_feats');
const tablesDir = path.join(chapterDir, 'tables');
const listsDir = path.join(chapterDir, 'lists');

const sourceFile =
  'docs/sources/phb2024/05-chapter 4/06-Character Origins - Player’s Handbook - Dungeons & Dragons - Sources - D&D Beyond.pdf';

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
};

ensureDir(chapterDir);
ensureDir(backgroundsDir);
ensureDir(speciesDir);
ensureDir(originFeatsDir);
ensureDir(tablesDir);
ensureDir(listsDir);

const backgrounds = [
  {
    id: 'background.acolyte',
    name: 'Acolyte',
    pages: [2],
    ability_scores: ['Intelligence', 'Wisdom', 'Charisma'],
    origin_feat_ref: 'origin_feat.magic_initiate_cleric',
    skill_proficiencies: ['Insight', 'Religion'],
    tool_proficiency: { type: 'specific', options: ["Calligrapher's Supplies"] },
    equipment_options: [
      {
        option: 'A',
        items: [
          "Calligrapher's Supplies",
          'Book (prayers)',
          'Holy Symbol',
          'Parchment (10 sheets)',
          'Robe'
        ],
        gp: 8
      },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You devoted yourself to service in a temple, performing rites and studying religion. Your devotion and training taught you to channel a small measure of divine power.'
  },
  {
    id: 'background.artisan',
    name: 'Artisan',
    pages: [2, 3],
    ability_scores: ['Strength', 'Dexterity', 'Intelligence'],
    origin_feat_ref: 'origin_feat.crafter',
    skill_proficiencies: ['Investigation', 'Persuasion'],
    tool_proficiency: { type: 'category', category: "Artisan's Tools", choose: 1 },
    equipment_options: [
      {
        option: 'A',
        items: ["Artisan's Tools (same as chosen)", '2 Pouches', "Traveler's Clothes"],
        gp: 32
      },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You apprenticed in an artisan shop, learning to craft goods and handle demanding customers. Your trade gave you a keen eye for detail.'
  },
  {
    id: 'background.charlatan',
    name: 'Charlatan',
    pages: [3],
    ability_scores: ['Dexterity', 'Constitution', 'Charisma'],
    origin_feat_ref: 'origin_feat.skilled',
    skill_proficiencies: ['Deception', 'Sleight of Hand'],
    tool_proficiency: { type: 'specific', options: ['Forgery Kit'] },
    equipment_options: [
      { option: 'A', items: ['Forgery Kit', 'Costume', 'Fine Clothes'], gp: 15 },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You learned to con and swindle by preying on those seeking a comforting lie. You hawked sham goods and forged records in taverns and markets.'
  },
  {
    id: 'background.criminal',
    name: 'Criminal',
    pages: [3, 4],
    ability_scores: ['Dexterity', 'Constitution', 'Intelligence'],
    origin_feat_ref: 'origin_feat.alert',
    skill_proficiencies: ['Sleight of Hand', 'Stealth'],
    tool_proficiency: { type: 'specific', options: ["Thieves' Tools"] },
    equipment_options: [
      {
        option: 'A',
        items: ['2 Daggers', "Thieves' Tools", 'Crowbar', '2 Pouches', "Traveler's Clothes"],
        gp: 16
      },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You lived by theft and burglary, whether as part of a small gang or as a lone operator. You learned to survive among thieves and worse.'
  },
  {
    id: 'background.entertainer',
    name: 'Entertainer',
    pages: [4],
    ability_scores: ['Strength', 'Dexterity', 'Charisma'],
    origin_feat_ref: 'origin_feat.musician',
    skill_proficiencies: ['Acrobatics', 'Performance'],
    tool_proficiency: { type: 'category', category: 'Musical Instrument', choose: 1 },
    equipment_options: [
      {
        option: 'A',
        items: ['Musical Instrument (same as chosen)', '2 Costumes', 'Mirror', 'Perfume', "Traveler's Clothes"],
        gp: 11
      },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You grew up with fairs and carnivals, trading work for lessons in music and performance. You thrive on applause and long for the stage.'
  },
  {
    id: 'background.farmer',
    name: 'Farmer',
    pages: [4, 5],
    ability_scores: ['Strength', 'Constitution', 'Wisdom'],
    origin_feat_ref: 'origin_feat.tough',
    skill_proficiencies: ['Animal Handling', 'Nature'],
    tool_proficiency: { type: 'specific', options: ["Carpenter's Tools"] },
    equipment_options: [
      {
        option: 'A',
        items: ['Sickle', "Carpenter's Tools", "Healer's Kit", 'Iron Pot', 'Shovel', "Traveler's Clothes"],
        gp: 30
      },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      "You grew up close to the land, tending animals and cultivating fields. Hard work gave you patience, health, and respect for nature."
  },
  {
    id: 'background.guard',
    name: 'Guard',
    pages: [5],
    ability_scores: ['Strength', 'Intelligence', 'Wisdom'],
    origin_feat_ref: 'origin_feat.alert',
    skill_proficiencies: ['Athletics', 'Perception'],
    tool_proficiency: { type: 'category', category: 'Gaming Set', choose: 1 },
    equipment_options: [
      {
        option: 'A',
        items: [
          'Spear',
          'Light Crossbow',
          '20 Bolts',
          'Gaming Set (same as chosen)',
          'Hooded Lantern',
          'Manacles',
          'Quiver',
          "Traveler's Clothes"
        ],
        gp: 12
      },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You spent countless hours on watch, trained to spot danger inside and outside the walls. You learned discipline and vigilance.'
  },
  {
    id: 'background.guide',
    name: 'Guide',
    pages: [5, 6],
    ability_scores: ['Dexterity', 'Constitution', 'Wisdom'],
    origin_feat_ref: 'origin_feat.magic_initiate_druid',
    skill_proficiencies: ['Stealth', 'Survival'],
    tool_proficiency: { type: 'specific', options: ["Cartographer's Tools"] },
    equipment_options: [
      {
        option: 'A',
        items: ['Shortbow', '20 Arrows', "Cartographer's Tools", 'Bedroll', 'Quiver', 'Tent', "Traveler's Clothes"],
        gp: 3
      },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You came of age outdoors, exploring wilds and guiding others through them. Friendly nature priests taught you the basics of channeling the wild.'
  },
  {
    id: 'background.hermit',
    name: 'Hermit',
    pages: [6],
    ability_scores: ['Constitution', 'Wisdom', 'Charisma'],
    origin_feat_ref: 'origin_feat.healer',
    skill_proficiencies: ['Medicine', 'Religion'],
    tool_proficiency: { type: 'specific', options: ['Herbalism Kit'] },
    equipment_options: [
      {
        option: 'A',
        items: ['Quarterstaff', 'Herbalism Kit', 'Bedroll', 'Book (philosophy)', 'Lamp', 'Oil (3 flasks)', "Traveler's Clothes"],
        gp: 16
      },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You lived in seclusion beyond settlements, with only occasional visitors and supplies. Solitude gave you time to ponder the mysteries of creation.'
  },
  {
    id: 'background.merchant',
    name: 'Merchant',
    pages: [6, 7],
    ability_scores: ['Constitution', 'Intelligence', 'Charisma'],
    origin_feat_ref: 'origin_feat.lucky',
    skill_proficiencies: ['Animal Handling', 'Persuasion'],
    tool_proficiency: { type: 'specific', options: ["Navigator's Tools"] },
    equipment_options: [
      { option: 'A', items: ["Navigator's Tools", '2 Pouches', "Traveler's Clothes"], gp: 22 },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You apprenticed to a trader and learned commerce, travel, and negotiation. You bought and sold goods across towns and regions.'
  },
  {
    id: 'background.noble',
    name: 'Noble',
    pages: [7, 8],
    ability_scores: ['Strength', 'Intelligence', 'Charisma'],
    origin_feat_ref: 'origin_feat.skilled',
    skill_proficiencies: ['History', 'Persuasion'],
    tool_proficiency: { type: 'category', category: 'Gaming Set', choose: 1 },
    equipment_options: [
      { option: 'A', items: ['Gaming Set (same as chosen)', 'Fine Clothes', 'Perfume'], gp: 29 },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'Raised amid wealth and privilege, you received a first-class education and learned leadership by observing courtly life.'
  },
  {
    id: 'background.sage',
    name: 'Sage',
    pages: [8],
    ability_scores: ['Constitution', 'Intelligence', 'Wisdom'],
    origin_feat_ref: 'origin_feat.magic_initiate_wizard',
    skill_proficiencies: ['Arcana', 'History'],
    tool_proficiency: { type: 'specific', options: ["Calligrapher's Supplies"] },
    equipment_options: [
      {
        option: 'A',
        items: ['Quarterstaff', "Calligrapher's Supplies", 'Book (history)', 'Parchment (8 sheets)', 'Robe'],
        gp: 8
      },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You traveled between manors and monasteries, trading work for access to libraries. You studied lore and learned rudiments of magic.'
  },
  {
    id: 'background.sailor',
    name: 'Sailor',
    pages: [8, 9],
    ability_scores: ['Strength', 'Dexterity', 'Wisdom'],
    origin_feat_ref: 'origin_feat.tavern_brawler',
    skill_proficiencies: ['Acrobatics', 'Perception'],
    tool_proficiency: { type: 'specific', options: ["Navigator's Tools"] },
    equipment_options: [
      { option: 'A', items: ['Dagger', "Navigator's Tools", 'Rope', "Traveler's Clothes"], gp: 20 },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You lived as a seafarer and weathered storms and long voyages. You have countless stories from ports and crew life.'
  },
  {
    id: 'background.scribe',
    name: 'Scribe',
    pages: [9],
    ability_scores: ['Dexterity', 'Intelligence', 'Wisdom'],
    origin_feat_ref: 'origin_feat.skilled',
    skill_proficiencies: ['Investigation', 'Perception'],
    tool_proficiency: { type: 'specific', options: ["Calligrapher's Supplies"] },
    equipment_options: [
      {
        option: 'A',
        items: ["Calligrapher's Supplies", 'Fine Clothes', 'Lamp', 'Oil (3 flasks)', 'Parchment (12 sheets)'],
        gp: 23
      },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You worked in a scriptorium or agency, copying and preserving texts. You learned careful writing and attention to detail.'
  },
  {
    id: 'background.soldier',
    name: 'Soldier',
    pages: [9, 10],
    ability_scores: ['Strength', 'Dexterity', 'Constitution'],
    origin_feat_ref: 'origin_feat.savage_attacker',
    skill_proficiencies: ['Athletics', 'Intimidation'],
    tool_proficiency: { type: 'category', category: 'Gaming Set', choose: 1 },
    equipment_options: [
      {
        option: 'A',
        items: ['Spear', 'Shortbow', '20 Arrows', 'Gaming Set (same as chosen)', "Healer's Kit", 'Quiver', "Traveler's Clothes"],
        gp: 14
      },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You trained for war from early adulthood. Battle is in your blood, and you used that training to defend the realm.'
  },
  {
    id: 'background.wayfarer',
    name: 'Wayfarer',
    pages: [10],
    ability_scores: ['Dexterity', 'Wisdom', 'Charisma'],
    origin_feat_ref: 'origin_feat.lucky',
    skill_proficiencies: ['Insight', 'Stealth'],
    tool_proficiency: { type: 'specific', options: ["Thieves' Tools"] },
    equipment_options: [
      {
        option: 'A',
        items: ['2 Daggers', "Thieves' Tools", 'Gaming Set (any)', 'Bedroll', '2 Pouches', "Traveler's Clothes"],
        gp: 16
      },
      { option: 'B', items: [], gp: 50 }
    ],
    narrative:
      'You grew up on the streets among other castoffs. You did odd jobs to survive and sometimes stole when hunger was unbearable.'
  }
];

const species = [
  {
    id: 'species.aasimar',
    name: 'Aasimar',
    pages: [11],
    creature_type: 'Humanoid',
    size: ['Medium', 'Small'],
    size_notes: 'Medium about 4-7 feet tall; Small about 2-4 feet tall.',
    speed: 30,
    traits: [
      {
        name: 'Celestial Resistance',
        action_type: 'none',
        trigger: 'passive',
        effects: ['resistance to necrotic damage', 'resistance to radiant damage']
      },
      {
        name: 'Darkvision',
        action_type: 'none',
        trigger: 'passive',
        effects: ['darkvision 60 ft']
      },
      {
        name: 'Healing Hands',
        action_type: 'magic',
        trigger: 'when you take the Magic action to touch a creature',
        effects: ['roll a number of d4s equal to your proficiency bonus', 'the creature regains hit points equal to the total'],
        limits: ['usable once per long rest']
      },
      {
        name: 'Light Bearer',
        action_type: 'none',
        trigger: 'passive',
        effects: ['you know the Light cantrip', 'Charisma is your spellcasting ability for it']
      },
      {
        name: 'Celestial Revelation',
        action_type: 'bonus_action',
        trigger: 'when you reach character level 3, you can transform',
        effects: [
          'choose one option each time: Heavenly Wings, Inner Radiance, or Necrotic Shroud',
          'transformation lasts 1 minute or until you end it (no action)',
          'once on each of your turns, deal extra damage equal to your proficiency bonus to one target when you deal damage with an attack or spell',
          'extra damage type is radiant for Heavenly Wings or Inner Radiance and necrotic for Necrotic Shroud'
        ],
        limits: ['usable once per long rest'],
        notes: [
          'Heavenly Wings: gain fly speed equal to your speed',
          'Inner Radiance: shed bright light 10 ft, dim light 10 ft; each creature within 10 ft takes radiant damage equal to proficiency bonus at end of your turn',
          'Necrotic Shroud: creatures within 10 ft (not allies) make Charisma save DC 8 + Cha mod + PB or be frightened until end of your next turn'
        ]
      }
    ]
  },
  {
    id: 'species.dragonborn',
    name: 'Dragonborn',
    pages: [12, 13],
    creature_type: 'Humanoid',
    size: 'Medium',
    size_notes: 'About 5-7 feet tall.',
    speed: 30,
    traits: [
      {
        name: 'Draconic Ancestry',
        action_type: 'none',
        trigger: 'when you choose this species',
        effects: ['choose a dragon lineage from the Draconic Ancestors table; this affects Breath Weapon and Damage Resistance'],
        table_ref: 'table.species.draconic_ancestors'
      },
      {
        name: 'Breath Weapon',
        action_type: 'special',
        trigger: 'when you take the Attack action, you can replace one attack',
        effects: [
          'exhale magical energy in a 15-foot cone or 30-foot line (5 feet wide)',
          'Dexterity save DC 8 + Constitution modifier + proficiency bonus',
          'failed save: 1d10 damage of ancestry type; success: half damage',
          'damage increases at levels 5 (2d10), 11 (3d10), 17 (4d10)'
        ],
        limits: ['uses equal to proficiency bonus per long rest']
      },
      {
        name: 'Damage Resistance',
        action_type: 'none',
        trigger: 'passive',
        effects: ['resistance to damage type from Draconic Ancestry']
      },
      {
        name: 'Darkvision',
        action_type: 'none',
        trigger: 'passive',
        effects: ['darkvision 60 ft']
      },
      {
        name: 'Draconic Flight',
        action_type: 'bonus_action',
        trigger: 'when you reach character level 5',
        effects: ['sprout spectral wings for 10 minutes, granting fly speed equal to your speed'],
        limits: ['usable once per long rest', 'ends early if you retract wings (no action) or become incapacitated']
      }
    ]
  },
  {
    id: 'species.dwarf',
    name: 'Dwarf',
    pages: [14],
    creature_type: 'Humanoid',
    size: 'Medium',
    size_notes: 'About 4-5 feet tall.',
    speed: 30,
    traits: [
      {
        name: 'Darkvision',
        action_type: 'none',
        trigger: 'passive',
        effects: ['darkvision 120 ft']
      },
      {
        name: 'Dwarven Resilience',
        action_type: 'none',
        trigger: 'passive',
        effects: ['resistance to poison damage', 'advantage on saving throws to avoid or end the poisoned condition']
      },
      {
        name: 'Dwarven Toughness',
        action_type: 'none',
        trigger: 'passive',
        effects: ['hit point maximum increases by 1', 'hit point maximum increases by 1 whenever you gain a level']
      },
      {
        name: 'Stonecunning',
        action_type: 'bonus_action',
        trigger: 'when you are on or touching a stone surface',
        effects: ['gain tremorsense 60 ft for 10 minutes'],
        limits: ['uses equal to proficiency bonus per long rest'],
        notes: ['stone can be natural or worked']
      }
    ]
  },
  {
    id: 'species.elf',
    name: 'Elf',
    pages: [15, 16],
    creature_type: 'Humanoid',
    size: 'Medium',
    size_notes: 'About 5-6 feet tall.',
    speed: 30,
    traits: [
      {
        name: 'Darkvision',
        action_type: 'none',
        trigger: 'passive',
        effects: ['darkvision 60 ft']
      },
      {
        name: 'Elven Lineage',
        action_type: 'none',
        trigger: 'when you choose this species',
        effects: [
          'choose a lineage from the Elven Lineages table',
          'gain the level 1 benefit',
          'at levels 3 and 5, learn the listed spells; always have them prepared',
          'you can cast each listed spell once without a slot per long rest and also using spell slots'
        ],
        table_ref: 'table.species.elven_lineages',
        notes: ['choose Intelligence, Wisdom, or Charisma as your spellcasting ability for these spells']
      },
      {
        name: 'Fey Ancestry',
        action_type: 'none',
        trigger: 'passive',
        effects: ['advantage on saving throws to avoid or end the charmed condition']
      },
      {
        name: 'Keen Senses',
        action_type: 'none',
        trigger: 'passive',
        effects: ['gain proficiency in Insight, Perception, or Survival']
      },
      {
        name: 'Trance',
        action_type: 'none',
        trigger: 'passive',
        effects: ['you do not need to sleep and magic cannot put you to sleep', 'you can finish a long rest in 4 hours by meditating while conscious']
      }
    ]
  },
  {
    id: 'species.gnome',
    name: 'Gnome',
    pages: [17],
    creature_type: 'Humanoid',
    size: 'Small',
    size_notes: 'About 3-4 feet tall.',
    speed: 30,
    traits: [
      {
        name: 'Darkvision',
        action_type: 'none',
        trigger: 'passive',
        effects: ['darkvision 60 ft']
      },
      {
        name: 'Gnomish Cunning',
        action_type: 'none',
        trigger: 'passive',
        effects: ['advantage on Intelligence, Wisdom, and Charisma saving throws']
      },
      {
        name: 'Gnomish Lineage',
        action_type: 'none',
        trigger: 'when you choose this species',
        effects: ['choose one lineage: Forest Gnome or Rock Gnome', 'choose Intelligence, Wisdom, or Charisma as spellcasting ability for these spells'],
        notes: [
          'Forest Gnome: know Minor Illusion cantrip; always have Speak with Animals prepared; cast it without a slot a number of times equal to proficiency bonus per long rest, or using spell slots',
          'Rock Gnome: know Mending and Prestidigitation cantrips; you can spend 10 minutes casting Prestidigitation to create a Tiny clockwork device (AC 5, 1 HP) with one Prestidigitation effect; activate with a Bonus Action touch; keep up to three devices; each lasts 8 hours or until dismantled with a touch as a Utilize action'
        ]
      }
    ]
  },
  {
    id: 'species.goliath',
    name: 'Goliath',
    pages: [18],
    creature_type: 'Humanoid',
    size: 'Medium',
    size_notes: 'About 7-8 feet tall.',
    speed: 35,
    traits: [
      {
        name: 'Giant Ancestry',
        action_type: 'none',
        trigger: 'when you choose this species',
        effects: ['choose one boon from your ancestry; uses equal to proficiency bonus per long rest'],
        notes: [
          "Cloud's Jaunt (Cloud Giant): bonus action teleport up to 30 feet to an unoccupied space you can see",
          "Fire's Burn (Fire Giant): when you hit with an attack and deal damage, deal 1d10 fire damage to the target",
          "Frost's Chill (Frost Giant): when you hit with an attack and deal damage, deal 1d6 cold damage and reduce target's speed by 10 feet until the start of your next turn",
          "Hill's Tumble (Hill Giant): when you hit a Large or smaller creature with an attack and deal damage, you can knock it prone",
          "Stone's Endurance (Stone Giant): reaction when you take damage; roll 1d12 + Constitution modifier; reduce damage by that total",
          "Storm's Thunder (Storm Giant): reaction when you take damage from a creature within 60 feet; deal 1d8 thunder damage to that creature"
        ]
      },
      {
        name: 'Large Form',
        action_type: 'bonus_action',
        trigger: 'when you reach character level 5 and are in a large enough space',
        effects: ['become Large for 10 minutes', 'advantage on Strength checks', 'speed increases by 10 feet'],
        limits: ['usable once per long rest']
      },
      {
        name: 'Powerful Build',
        action_type: 'none',
        trigger: 'passive',
        effects: ['advantage on ability checks to end the grappled condition', 'count as one size larger for carrying capacity']
      }
    ]
  },
  {
    id: 'species.halfling',
    name: 'Halfling',
    pages: [19],
    creature_type: 'Humanoid',
    size: 'Small',
    size_notes: 'About 2-3 feet tall.',
    speed: 30,
    traits: [
      {
        name: 'Brave',
        action_type: 'none',
        trigger: 'passive',
        effects: ['advantage on saving throws to avoid or end the frightened condition']
      },
      {
        name: 'Halfling Nimbleness',
        action_type: 'none',
        trigger: 'passive',
        effects: ['you can move through the space of any creature that is a size larger than you, but you cannot stop in the same space']
      },
      {
        name: 'Luck',
        action_type: 'none',
        trigger: 'when you roll a 1 on the d20 of a D20 Test',
        effects: ['you can reroll the die and must use the new roll']
      },
      {
        name: 'Naturally Stealthy',
        action_type: 'none',
        trigger: 'passive',
        effects: ['you can take the Hide action even when you are obscured only by a creature at least one size larger than you']
      }
    ]
  },
  {
    id: 'species.human',
    name: 'Human',
    pages: [20],
    creature_type: 'Humanoid',
    size: ['Medium', 'Small'],
    size_notes: 'Medium about 4-7 feet tall; Small about 2-4 feet tall.',
    speed: 30,
    traits: [
      {
        name: 'Resourceful',
        action_type: 'none',
        trigger: 'when you finish a long rest',
        effects: ['you gain Heroic Inspiration']
      },
      {
        name: 'Skillful',
        action_type: 'none',
        trigger: 'passive',
        effects: ['gain proficiency in one skill of your choice']
      },
      {
        name: 'Versatile',
        action_type: 'none',
        trigger: 'passive',
        effects: ['gain an origin feat of your choice (Skilled recommended)']
      }
    ]
  },
  {
    id: 'species.orc',
    name: 'Orc',
    pages: [21],
    creature_type: 'Humanoid',
    size: 'Medium',
    size_notes: 'About 6-7 feet tall.',
    speed: 30,
    traits: [
      {
        name: 'Adrenaline Rush',
        action_type: 'bonus_action',
        trigger: 'when you take the Dash action as a bonus action',
        effects: ['gain temporary hit points equal to your proficiency bonus'],
        limits: ['uses equal to proficiency bonus per short or long rest']
      },
      {
        name: 'Darkvision',
        action_type: 'none',
        trigger: 'passive',
        effects: ['darkvision 120 ft']
      },
      {
        name: 'Relentless Endurance',
        action_type: 'none',
        trigger: 'when you are reduced to 0 hit points but not killed outright',
        effects: ['drop to 1 hit point instead'],
        limits: ['usable once per long rest']
      }
    ]
  },
  {
    id: 'species.tiefling',
    name: 'Tiefling',
    pages: [22, 23],
    creature_type: 'Humanoid',
    size: ['Medium', 'Small'],
    size_notes: 'Medium about 4-7 feet tall; Small about 3-4 feet tall.',
    speed: 30,
    traits: [
      {
        name: 'Darkvision',
        action_type: 'none',
        trigger: 'passive',
        effects: ['darkvision 60 ft']
      },
      {
        name: 'Fiendish Legacy',
        action_type: 'none',
        trigger: 'when you choose this species',
        effects: [
          'choose a legacy from the Fiendish Legacies table',
          'gain the level 1 benefit',
          'at levels 3 and 5, learn the listed spells; always have them prepared',
          'you can cast each listed spell once without a slot per long rest and also using spell slots'
        ],
        table_ref: 'table.species.fiendish_legacies',
        notes: ['choose Intelligence, Wisdom, or Charisma as your spellcasting ability for these spells']
      },
      {
        name: 'Otherworldly Presence',
        action_type: 'none',
        trigger: 'passive',
        effects: ['you know the Thaumaturgy cantrip', 'the spell uses the same spellcasting ability as Fiendish Legacy']
      }
    ]
  }
];

const originFeats = [
  'magic_initiate_cleric',
  'crafter',
  'skilled',
  'alert',
  'musician',
  'tough',
  'magic_initiate_druid',
  'healer',
  'lucky',
  'magic_initiate_wizard',
  'tavern_brawler',
  'savage_attacker'
].map((key) => ({
  id: `origin_feat.${key}`,
  name: key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' '),
  chapter: 4,
  status: 'placeholder',
  notes: ['Defined in Chapter 5 (Feats).']
}));

const tables = [
  {
    id: 'table.species.draconic_ancestors',
    name: 'Draconic Ancestors',
    pages: [12, 13],
    columns: ['dragon', 'damage_type'],
    entries: [
      { dragon: 'Black', damage_type: 'Acid' },
      { dragon: 'Blue', damage_type: 'Lightning' },
      { dragon: 'Brass', damage_type: 'Fire' },
      { dragon: 'Bronze', damage_type: 'Lightning' },
      { dragon: 'Copper', damage_type: 'Acid' },
      { dragon: 'Gold', damage_type: 'Fire' },
      { dragon: 'Green', damage_type: 'Poison' },
      { dragon: 'Red', damage_type: 'Fire' },
      { dragon: 'Silver', damage_type: 'Cold' },
      { dragon: 'White', damage_type: 'Cold' }
    ]
  },
  {
    id: 'table.species.elven_lineages',
    name: 'Elven Lineages',
    pages: [16],
    columns: ['lineage', 'level_1', 'level_3', 'level_5'],
    entries: [
      {
        lineage: 'Drow',
        level_1: 'Darkvision range increases to 120 feet; know the Dancing Lights cantrip',
        level_3: 'Faerie Fire',
        level_5: 'Darkness'
      },
      {
        lineage: 'High Elf',
        level_1: 'Know the Prestidigitation cantrip; replace that cantrip after each long rest with another Wizard cantrip',
        level_3: 'Detect Magic',
        level_5: 'Misty Step'
      },
      {
        lineage: 'Wood Elf',
        level_1: 'Speed increases to 35 feet; know the Druidcraft cantrip',
        level_3: 'Longstrider',
        level_5: 'Pass without Trace'
      }
    ]
  },
  {
    id: 'table.species.fiendish_legacies',
    name: 'Fiendish Legacies',
    pages: [23],
    columns: ['legacy', 'level_1', 'level_3', 'level_5'],
    entries: [
      {
        legacy: 'Abyssal',
        level_1: 'Resistance to poison damage; know the Poison Spray cantrip',
        level_3: 'Ray of Sickness',
        level_5: 'Hold Person'
      },
      {
        legacy: 'Chthonic',
        level_1: 'Resistance to necrotic damage; know the Chill Touch cantrip',
        level_3: 'False Life',
        level_5: 'Ray of Enfeeblement'
      },
      {
        legacy: 'Infernal',
        level_1: 'Resistance to fire damage; know the Fire Bolt cantrip',
        level_3: 'Hellish Rebuke',
        level_5: 'Darkness'
      }
    ]
  }
];

const backgroundList = {
  id: 'list.backgrounds',
  name: 'Backgrounds (Chapter 4)',
  chapter: 4,
  status: 'complete',
  items: backgrounds.map((b) => b.id)
};

const speciesList = {
  id: 'list.species',
  name: 'Species (Chapter 4)',
  chapter: 4,
  status: 'complete',
  items: species.map((s) => s.id)
};

backgrounds.forEach((bg) => {
  const data = {
    id: bg.id,
    name: bg.name,
    chapter: 4,
    status: 'complete',
    sourceRef: {
      file: sourceFile,
      pages: bg.pages,
      section: bg.name
    },
    ability_scores: bg.ability_scores,
    origin_feat_ref: bg.origin_feat_ref,
    skill_proficiencies: bg.skill_proficiencies,
    tool_proficiency: bg.tool_proficiency,
    equipment_options: bg.equipment_options,
    narrative: bg.narrative,
    notes: []
  };
  writeJson(path.join(backgroundsDir, `${bg.id}.json`), data);
});

species.forEach((sp) => {
  const data = {
    id: sp.id,
    name: sp.name,
    chapter: 4,
    status: 'complete',
    sourceRef: {
      file: sourceFile,
      pages: sp.pages,
      section: sp.name
    },
    creature_type: sp.creature_type,
    size: sp.size,
    size_notes: sp.size_notes,
    speed: sp.speed,
    traits: sp.traits,
    notes: []
  };
  writeJson(path.join(speciesDir, `${sp.id}.json`), data);
});

originFeats.forEach((feat) => {
  writeJson(path.join(originFeatsDir, `${feat.id}.json`), feat);
});

writeJson(path.join(listsDir, `${backgroundList.id}.json`), backgroundList);
writeJson(path.join(listsDir, `${speciesList.id}.json`), speciesList);

tables.forEach((table) => {
  const data = {
    id: table.id,
    name: table.name,
    chapter: 4,
    status: 'complete',
    sourceRef: {
      file: sourceFile,
      pages: table.pages,
      section: table.name
    },
    columns: table.columns,
    entries: table.entries,
    notes: []
  };
  writeJson(path.join(tablesDir, `${table.id}.json`), data);
});

const manifest = {
  schema_version: '0.1.0',
  chapter: 4,
  title: 'Character Origins',
  generated_at: new Date().toISOString().slice(0, 10),
  paths: {
    backgrounds_dir: 'chapter-04/backgrounds',
    species_dir: 'chapter-04/species',
    origin_feats_dir: 'chapter-04/origin_feats',
    tables_dir: 'chapter-04/tables',
    lists_dir: 'chapter-04/lists'
  },
  shards: [
    ...backgrounds.map((bg) => ({ id: bg.id, type: 'background', path: `chapter-04/backgrounds/${bg.id}.json` })),
    ...species.map((sp) => ({ id: sp.id, type: 'species', path: `chapter-04/species/${sp.id}.json` })),
    ...originFeats.map((feat) => ({ id: feat.id, type: 'origin_feat', path: `chapter-04/origin_feats/${feat.id}.json` })),
    ...tables.map((table) => ({ id: table.id, type: 'table', path: `chapter-04/tables/${table.id}.json` })),
    { id: backgroundList.id, type: 'list', path: `chapter-04/lists/${backgroundList.id}.json` },
    { id: speciesList.id, type: 'list', path: `chapter-04/lists/${speciesList.id}.json` }
  ]
};

writeJson(path.join(chapterDir, 'chapter-04.manifest.json'), manifest);

const indexData = {
  chapter: 4,
  title: 'Character Origins',
  backgrounds: backgrounds.map((bg) => bg.id),
  species: species.map((sp) => sp.id),
  origin_feats: originFeats.map((feat) => feat.id),
  tables: tables.map((t) => t.id)
};

writeJson(path.join(chapterDir, 'Chapter-04-index.json'), indexData);

const md = `# Chapter 4: Character Origins

> **Source:** Player's Handbook - Chapter 4 (D&D 5e 2024)
> **Purpose:** Defines backgrounds and species for character creation, plus origin feat references.

---

## Scope

Character origins are composed of two parts:

- **Backgrounds**: Ability score options, origin feat, proficiencies, and starting equipment.
- **Species**: Creature type, size, speed, and special traits.

This chapter does not define feat mechanics; origin feats are referenced here and defined in Chapter 5.

---

## Engine References

- **Manifest:** chapter-04/chapter-04.manifest.json
- **Schema:** schemas/chapter-04.schema.json
- **Background shards:** chapter-04/backgrounds/*
- **Species shards:** chapter-04/species/*
- **Origin feat placeholders:** chapter-04/origin_feats/*
- **Tables:** chapter-04/tables/*
- **Lists:** chapter-04/lists/*
`;

fs.writeFileSync(path.join(chapterDir, 'Chapter_4_Character_Origins.md'), md, 'utf8');

console.log('Chapter 4 shards generated.');
