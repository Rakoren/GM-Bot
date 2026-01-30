# Chapter 3: Character Classes

> **Source:** Player’s Handbook – Chapter 3 (D&D 5e 2024)
> **Purpose:** Defines character classes, their core traits, level-based features, and subclasses.

---

## What Is a Class?

A class defines a character’s primary role, capabilities, and advancement. Each class provides:

* Primary ability
* Hit Die
* Proficiencies
* Class features gained by level
* Subclasses that specialize the class

Classes build directly on the character framework established in Chapters 1–2.

---

## Class Anatomy (Canonical)

All classes follow this structure:

* **Primary Ability** – Governs core features
* **Hit Die** – Determines hit points per level
* **Saving Throw Proficiencies**
* **Armor & Weapon Proficiencies**
* **Class Features** – Gained at specific levels
* **Subclass** – Chosen at a class-defined level

---

# Barbarian

## Core Barbarian Traits

* **Primary Ability:** Strength
* **Hit Die:** d12
* **Armor:** Light, Medium, Shields
* **Weapons:** Simple, Martial
* **Saving Throws:** Strength, Constitution

Barbarians are driven by **Rage**, trading defense and control for raw power.

---

## Barbarian Features by Level (Summary)

### Level 1

* **Rage** (Bonus Action, limited uses)
* **Unarmored Defense**
* **Weapon Mastery**

### Level 2

* **Danger Sense**
* **Reckless Attack**

### Level 3

* **Subclass Choice (Path)**
* **Primal Knowledge**

### Level 5

* **Extra Attack**
* **Fast Movement**

### Level 7

* **Feral Instinct**

### Level 9

* **Brutal Strike**

### Level 11+

* Improved Rage, survivability, and damage features

---

## Barbarian Subclasses (Paths)

* **Path of the Berserker** (id: `path.berserker`) - Unrestrained fury
* **Path of the Wild Heart** (id: `path.wild_heart`) - Animal and nature aspects
* **Path of the World Tree** (id: `path.world_tree`) - Cosmic vitality and teleportation
* **Path of the Zealot** (id: `path.zealot`) - Divine rage and resilience

Each path grants features at levels 3, 6, 10, and 14.

---

## Barbarian Engine References

* **Class shard:** `class.barbarian`
* **Subclass shards:** `path.berserker`, `path.wild_heart`, `path.world_tree`, `path.zealot`

# Bard

## Core Bard Traits

* **Primary Ability:** Charisma
* **Hit Die:** d8
* **Armor:** Light
* **Weapons:** Simple
* **Saving Throws:** Dexterity, Charisma

Bards blend **spellcasting**, **skills**, and **support**.

---

## Bard Features by Level (Summary)

### Level 1

* **Bardic Inspiration (d6)**
* **Spellcasting**

### Level 2

* **Jack of All Trades**
* **Expertise**

### Level 3

* **Subclass Choice (College)**

### Level 5

* **Font of Inspiration**

### Level 10

* **Magical Secrets**

### Level 18+

* Enhanced inspiration and spell versatility

---

## Bard High-Level Features

### Level 19: Epic Boon

You gain an Epic Boon feat (see Chapter 5) or another feat for which you qualify.

### Level 20: Words of Creation

You always have **Power Word Heal** and **Power Word Kill** prepared. When you cast either spell, you can target a second creature within 10 feet of the first target.

---

## Bard Subclasses (Colleges)

* **College of Dance** (id: `college.dance`) - Agile battlefield control and movement-based inspiration
* **College of Glamour** (id: `college.glamour`) - Fey enchantment and battlefield manipulation
* **College of Lore** (id: `college.lore`) - Knowledge mastery and spell versatility
* **College of Valor** (id: `college.valor`) - Martial inspiration and frontline support

Each college grants features at levels 3, 6, 10, and 14.

### College of Dance (Feature Summary)

* **Level 3:** Dazzling Footwork (Unarmored Defense, Agile Strikes)
* **Level 6:** Inspiring Movement, Tandem Footwork
* **Level 14:** Leading Evasion

### College of Glamour (Feature Summary)

* **Level 3:** Beguiling Magic, Mantle of Inspiration
* **Level 6:** Mantle of Majesty
* **Level 14:** Unbreakable Majesty

### College of Lore (Feature Summary)

* **Level 3:** Bonus Proficiencies, Cutting Words
* **Level 6:** Magical Discoveries
* **Level 14:** Peerless Skill

### College of Valor (Feature Summary)

* **Level 3:** Combat Inspiration, Martial Training
* **Level 6:** Extra Attack
* **Level 14:** Battle Magic

---

## Bard Engine References

* **Class shard:** `class.bard`
* **Subclass shards:** `college.dance`, `college.glamour`, `college.lore`, `college.valor`

# Cleric

## Core Cleric Traits

* **Primary Ability:** Wisdom
* **Hit Die:** d8
* **Armor:** Light, Medium, Shields
* **Weapons:** Simple
* **Saving Throws:** Wisdom, Charisma

Clerics draw divine power from gods, pantheons, or cosmic forces and channel it through prayer and devotion.

---

## Cleric Features by Level (Summary)

### Level 1

* **Spellcasting (Prepared Caster)**
* **Divine Order** (Protector or Thaumaturge)

### Level 2

* **Channel Divinity** (Divine Spark, Turn Undead)

### Level 3

* **Subclass Choice (Domain)**

### Level 4 / 8 / 12 / 16

* **Ability Score Improvement**

### Level 5

* **Sear Undead**

### Level 7

* **Blessed Strikes** (Divine Strike or Potent Spellcasting)

### Level 10

* **Divine Intervention**

### Level 14

* **Improved Blessed Strikes**

### Level 19

* **Epic Boon**

### Level 20

* **Greater Divine Intervention**

---

## Cleric Subclasses (Domains)

* **Life Domain** (id: `domain.life`) - Healing and vitality
* **Light Domain** (id: `domain.light`) - Radiance and fire
* **Trickery Domain** (id: `domain.trickery`) - Deception and illusion
* **War Domain** (id: `domain.war`) - Martial prowess and battle blessings

Each domain grants features at Cleric levels 3, 6, 10, and 17.

---

## Cleric Domains (Structured Notes)

### Life Domain

* **Level 3: Disciple of Life** — Healing spells that use a spell slot restore extra HP equal to **2 + slot level**.
* **Level 3: Life Domain Spells** — Always-prepared spells by Cleric level (Aid, Bless, Cure Wounds, Lesser Restoration; then Mass Healing Word, Revivify; Aura of Life, Death Ward; Greater Restoration, Mass Cure Wounds).
* **Level 3: Preserve Life (Channel Divinity; Action)** — Restore **5 × Cleric level** HP split among **Bloodied** creatures within 30 ft; can’t heal a creature above half HP max with this feature.
* **Level 6: Blessed Healer** — When you heal others with a spell slot, you also heal yourself for **2 + slot level**.
* **Level 17: Supreme Healing** — Healing dice become max value (no rolling).

### Light Domain

* **Level 3: Light Domain Spells** — Always-prepared spells by Cleric level (Burning Hands, Faerie Fire, Scorching Ray, See Invisibility; then Daylight, Fireball; Arcane Eye, Wall of Fire; Flame Strike, Scrying).
* **Level 3: Radiance of the Dawn (Channel Divinity; Action)** — 30-ft emanation; dispels magical Darkness in area; creatures of your choice make CON save or take **2d10 + Cleric level** radiant (half on success).
* **Level 3: Warding Flare (Reaction)** — Impose Disadvantage on an attack roll you can see within 30 ft; uses = WIS mod (min 1), refresh Long Rest.
* **Level 6: Improved Warding Flare** — Warding Flare refreshes on Short/Long Rest; when used, you can grant Temp HP **2d6 + WIS mod** to the attack’s target.
* **Level 17: Corona of Light (Action; 1 minute)** — Bright 60 ft + dim 30 ft; enemies in bright light have Disadvantage on saves vs Radiance of the Dawn and any Fire/Radiant spell. Uses = WIS mod (min 1), refresh Long Rest.

### Trickery Domain

* **Level 3: Blessing of the Trickster (Action)** — Give Advantage on DEX (Stealth) checks to you or a willing creature within 30 ft until Long Rest or used again.
* **Level 3: Trickery Domain Spells** — Always-prepared spells by Cleric level (Charm Person, Disguise Self, Invisibility, Pass without Trace; then Hypnotic Pattern, Nondetection; Confusion, Dimension Door; Dominate Person, Modify Memory).
* **Level 3: Invoke Duplicity (Bonus Action; Channel Divinity; 1 minute)** — Create an illusion within 30 ft; cast spells as though in its space (using your senses), gain Advantage on attacks when both you and illusion are within 5 ft of a creature that can see it; can move illusion 30 ft as Bonus Action (within 120 ft).
* **Level 6: Trickster’s Transposition** — When you create or move the illusion (Invoke Duplicity), you can teleport and swap places with it.
* **Level 17: Improved Duplicity** — Allies also gain Advantage on attacks vs a creature within 5 ft of the illusion; when the illusion ends, a chosen creature within 5 ft heals HP equal to your Cleric level.

### War Domain

* **Level 3: Guided Strike (Channel Divinity; Reaction if helping ally)** — When you or a creature within 30 ft misses an attack, expend Channel Divinity to add **+10** to the roll.
* **Level 3: War Domain Spells** — Always-prepared spells by Cleric level (Guiding Bolt, Magic Weapon, Shield of Faith, Spiritual Weapon; then Crusader’s Mantle, Spirit Guardians; Fire Shield, Freedom of Movement; Hold Monster, Steel Wind Strike).
* **Level 3: War Priest (Bonus Action)** — Make one weapon attack or Unarmed Strike; uses = WIS mod (min 1), refresh Short/Long Rest.
* **Level 6: War God’s Blessing** — Spend Channel Divinity to cast Shield of Faith or Spiritual Weapon **without a spell slot**; spell **doesn’t require Concentration** and lasts 1 minute with special end conditions.
* **Level 17: Avatar of Battle** — Resistance to bludgeoning, piercing, and slashing damage.

---

## Cleric Engine References

* **Class shard:** `class.cleric`
* **Subclass shards:** `domain.life`, `domain.light`, `domain.trickery`, `domain.war`

# Druid

## Core Druid Traits

* **Primary Ability:** Wisdom
* **Hit Die:** d8
* **Armor:** Light armor, Shields
* **Weapons:** Simple weapons
* **Saving Throws:** Intelligence, Wisdom
* **Tools:** Herbalism Kit
* **Skills:** Choose 2 from Arcana, Animal Handling, Insight, Medicine, Nature, Perception, Religion, Survival

(Starting equipment options appear in the class entry.)

---

## Druid Features by Level (Summary)

### Level 1

* **Spellcasting (Prepared Caster)** — Cantrips and prepared spells scale by level; regain slots on Long Rest; can swap prepared spells after Long Rest.
* **Druidic** — Secret language; always have **Speak with Animals** prepared; can leave hidden messages (DC 15 INT (Investigation) to notice).
* **Primal Order** — Choose **Magician** (extra cantrip + bonus to INT (Arcana/Nature) checks equal to WIS mod) or **Warden** (martial weapons + medium armor).

### Level 2

* **Wild Shape (Bonus Action)** — Duration: hours = half Druid level; uses: 2 (regain 1 on Short Rest, all on Long Rest); known forms, CR limits, fly speed unlock at level 8; special rules while shape-shifted (temp HP = Druid level; replace stats with beast block except keep key mental stats; can’t cast spells but concentration persists; equipment handling rules).
* **Wild Companion (Action)** — Spend a spell slot or Wild Shape use to cast Find Familiar (no material components); familiar is Fey and vanishes after Long Rest.

### Level 3

* **Subclass Choice (Circle)** — Land, Moon, Sea, Stars (in this chunk).

### Level 4 / 8 / 12 / 16

* **Ability Score Improvement**

### Level 5

* **Wild Resurgence** — If you have no Wild Shape uses left, you can gain one by expending a spell slot (no action, once per turn). Also, you can spend a Wild Shape use to gain a level 1 spell slot (1/Long Rest).

### Level 7 / 15

* **Elemental Fury / Improved Elemental Fury** — Choose Potent Spellcasting (add WIS to cantrip damage; later +300 ft range for 10+ ft cantrips) or Primal Strike (extra 1d8 elemental damage on hit once/turn; later 2d8).

### Level 18

* **Beast Spells** — Can cast spells in Wild Shape except costly/consumed material components.

### Level 20

* **Archdruid** — Evergreen Wild Shape (regain a use on Initiative if none); Nature Magician (convert Wild Shape uses into spell slots: each use = 2 spell levels; 1/Long Rest); Longevity (10 years pass, you age 1).

---

## Druid Spell List

The Druid spell list is presented by spell level with school and special flags (C = Concentration, R = Ritual, M = specific material).

---

## Druid Subclasses (Circles)

### Circle of the Land

* **Level 3: Circle Spells** — Choose a land type on Long Rest (Arid/Polar/Temperate/Tropical) and gain its listed spells prepared based on Druid level.
* **Level 3: Land’s Aid (Action; Wild Shape use)** — 10-ft sphere within 60 ft; CON save vs spell DC: **2d6 necrotic** (half on success) and one chosen creature heals **2d6**; scales at Druid 10 (3d6) and 14 (4d6).
* **Level 6: Natural Recovery** — Cast a prepared Circle Spell without a slot (1/Long Rest); on Short Rest, recover spell slots totaling ≤ half Druid level (round up), none 6+.
* **Level 10: Nature’s Ward** — Immune to Poisoned; gain resistance based on land choice (Arid Fire, Polar Cold, Temperate Lightning, Tropical Poison).
* **Level 14: Nature’s Sanctuary (Action; Wild Shape use)** — 15-ft cube within 120 ft for 1 minute; you/allies have half cover inside; allies gain your current Nature’s Ward resistance; move cube 60 ft as Bonus Action.

### Circle of the Moon

* **Level 3: Circle Forms** — Wild Shape upgrades: max CR = Druid level ÷ 3; AC becomes 13 + WIS mod if higher; temp HP = 3 × Druid level.
* **Level 3: Circle of the Moon Spells** — Always-prepared; can cast them while in Wild Shape.
* **Level 6: Improved Circle Forms** — Attacks in Wild Shape can deal Radiant; add WIS mod to CON saves.
* **Level 10: Moonlight Step (Bonus Action)** — Teleport 30 ft + Advantage on next attack that turn; uses = WIS mod (min 1), refresh Long Rest; can restore uses by expending a level 2+ spell slot per use.
* **Level 14: Lunar Form** — Once/turn +2d10 radiant on Wild Shape attack; Moonlight Step can also teleport a willing creature within 10 ft to within 10 ft of destination.

### Circle of the Sea

* **Level 3: Circle of the Sea Spells** — Always-prepared spell list by level.
* **Level 3: Wrath of the Sea (Bonus Action; Wild Shape use)** — 5-ft emanation for 10 minutes; choose a creature in emanation on manifest and subsequent turns: CON save or cold damage (d6 count = WIS mod, min 1) and push up to 15 ft (Large or smaller).
* **Level 6: Aquatic Affinity** — Emanation becomes 10 ft; gain Swim speed equal to Speed.
* **Level 10: Stormborn** — While Wrath is active: gain Fly speed equal to Speed and resistance to Cold/Lightning/Thunder.
* **Level 14: Oceanic Gift** — Can center Wrath emanation on a willing creature within 60 ft (using your DC/WIS); can affect both you and them by spending 2 Wild Shape uses.

### Circle of the Stars (partial in this chunk)

* **Level 3: Star Map** — Tiny focus object; while holding: Guidance + Guiding Bolt prepared; can cast Guiding Bolt without a slot uses = WIS mod (min 1), refresh Long Rest; replacement via 1-hour ceremony during Short/Long Rest (destroys previous). Includes a 1d6 table for map form.
* **Level 3: Starry Form (Bonus Action; Wild Shape use)** — Luminous form for 10 minutes; choose constellation:

  * **Archer:** Bonus Action ranged spell attack, 1d8 + WIS radiant.
  * **Chalice:** When you heal with a slot, you or an ally within 30 ft heals 1d8 + WIS.
  * **Dragon:** Treat d20 rolls of 9 or lower as 10 on INT/WIS checks and CON saves to maintain Concentration.

### Circle of the Stars (completed)

* **Level 6: Cosmic Omen** — After a Long Rest, roll a die to determine **Weal** (even) or **Woe** (odd). Until your next Long Rest, you can use a **Reaction** a number of times equal to your WIS mod (min 1):

  * *Weal:* Add **1d6** to a visible creature’s d20 test within 30 ft.
  * *Woe:* Subtract **1d6** from a visible creature’s d20 test within 30 ft.
* **Level 10: Twinkling Constellations** — Archer/Chalice damage becomes **2d8**; Dragon grants **Fly 20 ft (hover)**; you can switch constellations at the start of each turn.
* **Level 14: Full of Stars** — While in Starry Form, gain resistance to bludgeoning, piercing, and slashing damage.

---

## Druid Subclasses (Circles)

* **Circle of the Land** (id: `circle.land`) - Terrain magic and recovery
* **Circle of the Moon** (id: `circle.moon`) - Primal beast forms and lunar power
* **Circle of the Sea** (id: `circle.sea`) - Tides, storms, and aquatic strength
* **Circle of the Stars** (id: `circle.stars`) - Constellation magic and stellar forms

Each circle grants features at Druid levels 3, 6, 10, and 14.

---

## Druid Engine References

* **Class shard:** `class.druid`
* **Subclass shards:** `circle.land`, `circle.moon`, `circle.sea`, `circle.stars`

# Fighter

## Core Fighter Traits

* **Primary Ability:** Strength or Dexterity
* **Hit Die:** d10
* **Armor:** Light, Medium, Heavy, Shields
* **Weapons:** Simple, Martial
* **Saving Throws:** Strength, Constitution
* **Skills:** Choose 2 from Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Persuasion, Perception, Survival

---

## Fighter Features by Level (Summary)

* **Level 1:** Fighting Style (feat), Second Wind (2 uses; scaling), Weapon Mastery
* **Level 2:** Action Surge (1/use; later 2), Tactical Mind
* **Level 3:** Subclass
* **Level 4 / 6 / 8 / 12 / 14 / 16:** Ability Score Improvement
* **Level 5:** Extra Attack, Tactical Shift
* **Level 9:** Indomitable (scales), Tactical Master
* **Level 11:** Two Extra Attacks
* **Level 13:** Studied Attacks
* **Level 17:** Action Surge (2 uses), Indomitable (3 uses)
* **Level 19:** Epic Boon
* **Level 20:** Three Extra Attacks

---

## Fighter Subclasses

### Battle Master

* **Level 3:** Combat Superiority (Superiority Dice d8 → d10 → d12; maneuvers; save DC = 8 + STR/DEX + PB), Student of War
* **Level 7:** Know Your Enemy
* **Level 10:** Improved Combat Superiority
* **Level 15:** Relentless
* **Level 18:** Ultimate Combat Superiority
* **Maneuvers:** Ambush, Bait and Switch, Commander’s Strike, Commanding Presence, Disarming Attack, Distracting Strike, Evasive Footwork, Feinting Attack, Goading Attack, Lunging Attack, Maneuvering Attack, Menacing Attack, Parry, Precision Attack, Pushing Attack, Rally, Riposte, Sweeping Attack, Tactical Assessment, Trip Attack

### Champion

* **Level 3:** Improved Critical, Remarkable Athlete
* **Level 7:** Additional Fighting Style
* **Level 10:** Heroic Warrior
* **Level 15:** Superior Critical
* **Level 18:** Survivor (Defy Death, Heroic Rally)

### Eldritch Knight

* **Level 3:** Spellcasting (Wizard list; INT), War Bond
* **Level 7:** War Magic
* **Level 10:** Eldritch Strike
* **Level 15:** Arcane Charge
* **Level 18:** Improved War Magic

### Psi Warrior

* **Level 3:** Psionic Power (Energy Dice scaling), Protective Field, Psionic Strike, Telekinetic Movement
* **Level 7:** Telekinetic Adept (Psi-Powered Leap, Telekinetic Thrust)
* **Level 10:** Guarded Mind
* **Level 15:** Bulwark of Force
* **Level 18:** Telekinetic Master

---

## Fighter Subclasses

* **Battle Master** (id: `fighter.battle_master`) - Maneuvers and tactical control
* **Champion** (id: `fighter.champion`) - Raw athletic prowess and critical strikes
* **Eldritch Knight** (id: `fighter.eldritch_knight`) - Martial arcane hybrid
* **Psi Warrior** (id: `fighter.psi_warrior`) - Psionic power and force manipulation

Each fighter archetype grants features at Fighter levels 3, 7, 10, 15, and 18.

---

## Fighter Engine References

* **Class shard:** `class.fighter`
* **Subclass shards:** `fighter.battle_master`, `fighter.champion`, `fighter.eldritch_knight`, `fighter.psi_warrior`

# Monk

## Core Monk Traits

* **Primary Ability:** Dexterity, Wisdom
* **Hit Die:** d8
* **Armor:** None
* **Weapons:** Simple; Martial with Light property
* **Saving Throws:** Strength, Dexterity
* **Tools:** Artisan’s Tools or Musical Instrument

---

## Monk Features by Level (Summary)

* **Level 1:** Martial Arts (scaling die), Unarmored Defense
* **Level 2:** Monk’s Focus (Focus Points), Unarmored Movement, Uncanny Metabolism
* **Level 3:** Deflect Attacks, Subclass
* **Level 4 / 8 / 12 / 16:** Ability Score Improvement; **Level 4:** Slow Fall
* **Level 5:** Extra Attack, Stunning Strike
* **Level 6:** Empowered Strikes
* **Level 7:** Evasion
* **Level 9:** Acrobatic Movement
* **Level 10:** Heightened Focus, Self-Restoration
* **Level 13:** Deflect Energy
* **Level 14:** Disciplined Survivor
* **Level 15:** Perfect Focus
* **Level 18:** Superior Defense
* **Level 19:** Epic Boon
* **Level 20:** Body and Mind

---

## Monk Subclasses

### Warrior of Mercy

* **Level 3:** Hand of Harm, Hand of Healing, Implements of Mercy
* **Level 6:** Physician’s Touch
* **Level 11:** Flurry of Healing and Harm
* **Level 17:** Hand of Ultimate Mercy

### Warrior of Shadow

* **Level 3:** Shadow Arts (Darkness, Darkvision, Minor Illusion)
* **Level 6:** Shadow Step
* **Level 11:** Improved Shadow Step
* **Level 17:** Cloak of Shadows

### Warrior of the Elements

* **Level 3:** Elemental Attunement, Manipulate Elements
* **Level 6:** Elemental Burst
* **Level 11:** Stride of the Elements
* **Level 17:** Elemental Epitome

### Warrior of the Open Hand

* **Level 3:** Open Hand Technique
* **Level 6:** Wholeness of Body
* **Level 11:** Fleet Step
* **Level 17:** Quivering Palm

---

## Monk Subclasses

* **Warrior of Mercy** (id: `monk.mercy`) - Healing and harm in equal measure
* **Warrior of Shadow** (id: `monk.shadow`) - Stealth and shadow magic
* **Warrior of the Elements** (id: `monk.elements`) - Elemental techniques and bursts
* **Warrior of the Open Hand** (id: `monk.open_hand`) - Classic unarmed mastery

Each monk tradition grants features at Monk levels 3, 6, 11, and 17.

---

## Monk Engine References

* **Class shard:** `class.monk`
* **Subclass shards:** `monk.mercy`, `monk.shadow`, `monk.elements`, `monk.open_hand`


---

# Paladin

## Core Paladin Traits

* **Primary Ability:** Strength or Charisma
* **Hit Die:** d10
* **Armor:** Light, Medium, Heavy, Shields
* **Weapons:** Simple, Martial
* **Saving Throws:** Wisdom, Charisma

Paladins are oath-bound champions who blend martial prowess with divine magic.

---

## Paladin Features by Level (Summary)

* **Level 1:** Lay On Hands, Spellcasting, Weapon Mastery
* **Level 2:** Fighting Style, Paladin's Smite
* **Level 3:** Channel Divinity, Subclass Choice (Oath)
* **Level 4 / 8 / 12 / 16:** Ability Score Improvement
* **Level 5:** Extra Attack, Faithful Steed
* **Level 6:** Aura of Protection
* **Level 7 / 15 / 20:** Subclass feature
* **Level 9:** Abjure Foes
* **Level 10:** Aura of Courage
* **Level 11:** Radiant Strikes
* **Level 14:** Restoring Touch
* **Level 18:** Aura Expansion
* **Level 19:** Epic Boon

---

## Paladin High-Level Features

### Level 18: Aura Expansion

Your Paladin auras expand in range.

### Level 20: Subclass Capstone

You gain your oath's capstone feature.

---

## Paladin Subclasses (Oaths)

* **Oath of Devotion** (id: `oath.devotion`) - Sacred weaponry and unwavering virtue
* **Oath of Glory** (id: `oath.glory`) - Heroic feats and legendary presence
* **Oath of the Ancients** (id: `oath.ancients`) - Nature's light and resilience
* **Oath of Vengeance** (id: `oath.vengeance`) - Relentless pursuit of foes

Each oath grants features at Paladin levels 3, 7, 15, and 20.

---

## Paladin Engine References

* **Class shard:** `class.paladin`
* **Subclass shards:** `oath.devotion`, `oath.glory`, `oath.ancients`, `oath.vengeance`

# Ranger

## Core Ranger Traits

* **Primary Ability:** Dexterity or Strength
* **Hit Die:** d10
* **Armor:** Light, Medium, Shields
* **Weapons:** Simple, Martial
* **Saving Throws:** Strength, Dexterity

Rangers blend martial skill with nature magic and relentless hunting.

---

## Ranger Features by Level (Summary)

* **Level 1:** Spellcasting, Favored Enemy, Weapon Mastery
* **Level 2:** Deft Explorer, Fighting Style
* **Level 3:** Subclass Choice (Conclave)
* **Level 4 / 8 / 12 / 16:** Ability Score Improvement
* **Level 5:** Extra Attack
* **Level 6:** Roving
* **Level 9:** Expertise
* **Level 10:** Tireless
* **Level 13:** Relentless Hunter
* **Level 14:** Nature's Veil
* **Level 17:** Precise Hunter
* **Level 18:** Feral Senses
* **Level 19:** Epic Boon
* **Level 20:** Foe Slayer

---

## Ranger Subclasses

* **Beast Master** (id: `ranger.beast_master`) - Primal companion and coordinated tactics
* **Fey Wanderer** (id: `ranger.fey_wanderer`) - Fey magic and uncanny charm
* **Gloom Stalker** (id: `ranger.gloom_stalker`) - Ambush and darkness mastery
* **Hunter** (id: `ranger.hunter`) - Adaptive tactics against dangerous foes

Each subclass grants features at Ranger levels 3, 7, 11, and 15.

---

## Ranger High-Level Features

### Level 18: Feral Senses

You gain heightened awareness that defeats hidden threats.

### Level 20: Foe Slayer

You deliver a decisive finishing strike against favored enemies.

---

## Ranger Engine References

* **Class shard:** `class.ranger`
* **Subclass shards:** `ranger.beast_master`, `ranger.fey_wanderer`, `ranger.gloom_stalker`, `ranger.hunter`

# Rogue

## Core Rogue Traits

* **Primary Ability:** Dexterity
* **Hit Die:** d8
* **Armor:** Light
* **Weapons:** Simple, plus Martial weapons with the Finesse or Light property
* **Tools:** Thieves' Tools
* **Saving Throws:** Dexterity, Intelligence

Rogues rely on skill, stealth, and precise strikes to control the battlefield.

---

## Rogue Features by Level (Summary)

* **Level 1:** Expertise, Sneak Attack, Thieves' Cant, Weapon Mastery
* **Level 2:** Cunning Action
* **Level 3:** Subclass Choice (Roguish Archetype), Steady Aim
* **Level 4 / 8 / 12 / 16:** Ability Score Improvement
* **Level 5:** Cunning Strike, Uncanny Dodge
* **Level 7:** Evasion, Reliable Talent
* **Level 11:** Improved Cunning Strike
* **Level 14:** Devious Strikes
* **Level 15:** Slippery Mind
* **Level 18:** Elusive
* **Level 19:** Epic Boon
* **Level 20:** Stroke of Luck

---

## Rogue Subclasses

* **Arcane Trickster** (id: `rogue.arcane_trickster`) - Illusion and enchantment magic
* **Assassin** (id: `rogue.assassin`) - Ambush, poison, and lethal precision
* **Soulknife** (id: `rogue.soulknife`) - Psionic blades and mental power
* **Thief** (id: `rogue.thief`) - Supreme infiltration and mastery of items

Each subclass grants features at Rogue levels 3, 9, 13, and 17.

---

## Rogue High-Level Features

### Level 18: Elusive

You are extraordinarily hard to pin down in combat.

### Level 20: Stroke of Luck

You can turn failure into success at the critical moment.

---

## Rogue Engine References

* **Class shard:** `class.rogue`
* **Subclass shards:** `rogue.arcane_trickster`, `rogue.assassin`, `rogue.soulknife`, `rogue.thief`

# Sorcerer

## Core Sorcerer Traits

* **Primary Ability:** Charisma
* **Hit Die:** d6
* **Armor:** None
* **Weapons:** Simple
* **Saving Throws:** Constitution, Charisma

Sorcerers wield innate magic shaped by will and bloodline.

---

## Sorcerer Features by Level (Summary)

* **Level 1:** Spellcasting, Innate Sorcery
* **Level 2:** Font of Magic, Metamagic
* **Level 3:** Subclass Choice (Sorcerous Origin)
* **Level 4 / 8 / 12 / 16:** Ability Score Improvement
* **Level 5:** Sorcerous Restoration
* **Level 7:** Sorcery Incarnate
* **Level 19:** Epic Boon
* **Level 20:** Arcane Apotheosis

---

## Sorcerer Subclasses (Sorcerous Origins)

* **Aberrant Sorcery** (id: `sorcerer.aberrant`) - Psionic mind and alien magic
* **Clockwork Sorcery** (id: `sorcerer.clockwork`) - Order, balance, and cosmic design
* **Draconic Sorcery** (id: `sorcerer.draconic`) - Draconic power and elemental might
* **Wild Magic** (id: `sorcerer.wild_magic`) - Chaotic surges and unstable power

Each origin grants features at Sorcerer levels 3, 6, 14, and 18.

---

## Sorcerer High-Level Features

### Level 7: Sorcery Incarnate

You enter a heightened state that amplifies your innate magic.

### Level 20: Arcane Apotheosis

You embody your magic at its peak.

---

## Sorcerer Engine References

* **Class shard:** `class.sorcerer`
* **Subclass shards:** `sorcerer.aberrant`, `sorcerer.clockwork`, `sorcerer.draconic`, `sorcerer.wild_magic`

# Warlock

## Core Warlock Traits

* **Primary Ability:** Charisma
* **Hit Die:** d8
* **Armor:** Light
* **Weapons:** Simple
* **Saving Throws:** Wisdom, Charisma

Warlocks gain power from a pact with an otherworldly patron.

---

## Warlock Features by Level (Summary)

* **Level 1:** Pact Magic, Eldritch Invocations
* **Level 2:** Magical Cunning
* **Level 3:** Subclass Choice (Patron), Pact Boon
* **Level 4 / 8 / 12 / 16:** Ability Score Improvement
* **Level 9:** Contact Patron
* **Level 11 / 13 / 15 / 17:** Mystic Arcanum
* **Level 19:** Epic Boon
* **Level 20:** Eldritch Master

---

## Warlock Subclasses (Patrons)

* **Archfey Patron** (id: `wl.archfey`) - Fey magic and teleportation
* **Celestial Patron** (id: `wl.celestial`) - Healing and radiant power
* **Fiend Patron** (id: `wl.fiend`) - Infernal resilience and destructive magic
* **Great Old One Patron** (id: `wl.great_old_one`) - Psychic intrusion and forbidden lore

Each patron grants features at Warlock levels 3, 6, 10, and 14.

---

## Warlock High-Level Features

### Level 11+: Mystic Arcanum

You gain powerful once-per-rest spells at higher levels.

### Level 20: Eldritch Master

You can draw deeply on your patron's power to restore Pact Magic.

---

## Warlock Engine References

* **Class shard:** `class.warlock`
* **Subclass shards:** `wl.archfey`, `wl.celestial`, `wl.fiend`, `wl.great_old_one`

# Wizard

## Core Wizard Traits

* **Primary Ability:** Intelligence
* **Hit Die:** d6
* **Armor:** None
* **Weapons:** Simple
* **Saving Throws:** Intelligence, Wisdom

Wizards master spells through study, preparation, and arcane theory.

---

## Wizard Features by Level (Summary)

* **Level 1:** Spellcasting, Ritual Adept, Arcane Recovery, Spellbook
* **Level 2:** Scholar
* **Level 3:** Subclass Choice (Arcane Tradition)
* **Level 4 / 8 / 12 / 16:** Ability Score Improvement
* **Level 5:** Memorize Spell
* **Level 18:** Spell Mastery
* **Level 19:** Epic Boon
* **Level 20:** Signature Spells

---

## Wizard Subclasses (Arcane Traditions)

* **School of Abjuration** (id: `wizard.abjurer`) - Wards and protection
* **School of Divination** (id: `wizard.diviner`) - Omens and foresight
* **School of Evocation** (id: `wizard.evoker`) - Destructive power and precision
* **School of Illusion** (id: `wizard.illusionist`) - Deception and misdirection

Each tradition grants features at Wizard levels 3, 6, 10, and 14.

---

## Wizard High-Level Features

### Level 18: Spell Mastery

You can cast a pair of low-level spells at will.

### Level 20: Signature Spells

You gain limited free casts of two 3rd-level spells.

---

## Wizard Engine References

* **Class shard:** `class.wizard`
* **Subclass shards:** `wizard.abjurer`, `wizard.diviner`, `wizard.evoker`, `wizard.illusionist`
