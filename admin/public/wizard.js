const STANDARD_ARRAY_BY_CLASS_FALLBACK = {
  Barbarian: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
  Bard: { str: 8, dex: 14, con: 12, int: 13, wis: 10, cha: 15 },
  Cleric: { str: 14, dex: 8, con: 13, int: 10, wis: 15, cha: 12 },
  Druid: { str: 8, dex: 12, con: 14, int: 13, wis: 15, cha: 10 },
  Fighter: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 },
  Monk: { str: 12, dex: 15, con: 13, int: 10, wis: 14, cha: 8 },
  Paladin: { str: 15, dex: 10, con: 13, int: 8, wis: 12, cha: 14 },
  Ranger: { str: 12, dex: 15, con: 13, int: 8, wis: 14, cha: 10 },
  Rogue: { str: 12, dex: 15, con: 13, int: 14, wis: 10, cha: 8 },
  Sorcerer: { str: 10, dex: 13, con: 14, int: 8, wis: 12, cha: 15 },
  Warlock: { str: 8, dex: 14, con: 13, int: 12, wis: 10, cha: 15 },
  Wizard: { str: 8, dex: 12, con: 13, int: 15, wis: 14, cha: 10 },
};

const state = {
  classes: [],
  subclasses: [],
  backgrounds: [],
  species: [],
  lineages: [],
  standardArrayByClass: {},
  standardArrayByClassNormalized: {},
  standardArrayByClassId: {},
  standardArrayGlobal: [],
  normalizedClasses: [],
  armor: [],
  classSpells: [],
  preparedSpellIds: new Set(),
  maxSpellLevel: null,
  classProgression: [],
  classIdByName: {},
  standardLanguages: [],
  rareLanguages: [],
  equipmentOptions: {},
  weapons: [],
  pointBuyCosts: {},
  abilityMethod: 'standard',
  abilityBonuses: { plus2: '', plus1: '' },
  adventuringPacks: {},
  inventoryItems: [],
  equippedItems: new Set(),
  equippedArmorKey: null,
  handEquip: { left: null, right: null },
  inventorySelections: { class: 'A', background: 'A' },
  armorTraining: { light: false, medium: false, heavy: false, shields: false },
  weaponTraining: { simpleMelee: false, simpleRanged: false, martialMelee: false, martialRanged: false },
  canCastSpells: true,
  featureChoices: [],
  featureSelections: {},
  creatures: [],
  wildShapeForms: [],
  wildShapeSpent: 0,
  isWildShaped: false,
  wildShapeAttacks: [],
  activeWildShapeForm: null,
  wildCompanionActive: false,
  wildCompanionSource: 'wild_shape',
  spellSlotExpended: {},
  manualInventoryItems: [],
  adventuringGear: [],
  shopItems: [],
  featureSkillSelections: new Set(),
  backgroundSkillSelections: new Set(),
  classSkillSelections: new Set(),
  classSkillAllowed: new Set(),
  classSkillLimit: null,
  pendingFirstLevelPrompt: false,
  deferLevelUpModal: false,
  forceFirstLevelModal: false,
  inventoryOverride: false,
};

const WEAPON_MASTERY_TOOLTIPS = {
  cleave: 'If you hit a creature with a melee attack roll using this weapon, you can make a melee attack roll with the weapon against a second creature within 5 feet of the first that is also within your reach. On a hit, the second creature takes the weapon’s damage, but don’t add your ability modifier to that damage unless that modifier is negative. You can make this extra attack only once per turn.',
  graze: 'If your attack roll with this weapon misses a creature, you can deal damage to that creature equal to the ability modifier you used to make the attack roll. This damage is the same type dealt by the weapon, and the damage can be increased only by increasing the ability modifier.',
  nick: 'When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action. You can make this extra attack only once per turn.',
  push: 'If you hit a creature with this weapon, you can push the creature up to 10 feet straight away from yourself if it is Large or smaller.',
  sap: 'If you hit a creature with this weapon, that creature has Disadvantage on its next attack roll before the start of your next turn.',
  slow: 'If you hit a creature with this weapon and deal damage to it, you can reduce its Speed by 10 feet until the start of your next turn. If the creature is hit more than once by weapons that have this property, the Speed reduction doesn’t exceed 10 feet.',
  topple: 'If you hit a creature with this weapon, you can force the creature to make a Constitution saving throw (DC 8 plus the ability modifier used to make the attack roll and your Proficiency Bonus). On a failed save, the creature has the Prone condition.',
  vex: 'If you hit a creature with this weapon and deal damage to the creature, you have Advantage on your next attack roll against that creature before the end of your next turn.',
};

function normalizeMasteryKey(value) {
  return String(value || '').trim().toLowerCase();
}

function getWeaponMasteryTooltip(value) {
  return WEAPON_MASTERY_TOOLTIPS[normalizeMasteryKey(value)] || '';
}

function normalizeKey(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABELS = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

function abilityKeyFromLabel(value) {
  const normalized = normalizeName(value);
  if (!normalized) return '';
  if (normalized.startsWith('str')) return 'str';
  if (normalized.startsWith('dex')) return 'dex';
  if (normalized.startsWith('con')) return 'con';
  if (normalized.startsWith('int')) return 'int';
  if (normalized.startsWith('wis')) return 'wis';
  if (normalized.startsWith('cha')) return 'cha';
  return '';
}

function getClassSelect() {
  return document.getElementById('class-select');
}

function getSubclassSelect() {
  return document.getElementById('subclass-select');
}

function isSpeciesSelected() {
  const select = getSpeciesSelect();
  return Boolean(String(select?.value || '').trim());
}

function isBackgroundSelected() {
  const select = getBackgroundSelect();
  return Boolean(String(select?.value || '').trim());
}

function isLineageRequired() {
  const speciesSelect = getSpeciesSelect();
  const speciesValue = String(speciesSelect?.value || '').trim();
  if (!speciesValue) return false;
  const matching = (state.lineages || []).filter(entry =>
    normalizeKey(entry?.species_id) === normalizeKey(speciesValue)
  );
  return matching.length > 0;
}

function updateClassSelectAvailability() {
  const classSelect = getClassSelect();
  const levelSelect = getLevelSelect();
  const subclassSelect = getSubclassSelect();
  const backgroundSelect = getBackgroundSelect();
  const speciesSelect = getSpeciesSelect();
  const lineageSelect = getLineageSelect();
  if (!classSelect || !levelSelect || !subclassSelect || !backgroundSelect || !speciesSelect) return;
  classSelect.disabled = false;
  levelSelect.disabled = false;
  const hasClass = Boolean(String(classSelect.value || '').trim());
  backgroundSelect.disabled = !hasClass;
  if (!hasClass) {
    backgroundSelect.value = '';
  }
  const hasBackground = hasClass && isBackgroundSelected();
  speciesSelect.disabled = !hasBackground;
  if (!hasBackground) {
    speciesSelect.value = '';
    if (lineageSelect) lineageSelect.value = '';
  }
  renderLineageOptions();
  if (!hasClass) {
    subclassSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a subclass';
    subclassSelect.appendChild(placeholder);
    subclassSelect.disabled = true;
  }
  updateAbilityScoreAvailability();
  if (getAbilityMethod() === 'standard' && isSpeciesSelected() && isBackgroundSelected() && areAbilityScoresEmpty()) {
    applyStandardArrayForClass();
  }
}

function getSelectedSubclassEntry() {
  const subclassSelect = getSubclassSelect();
  const value = String(subclassSelect?.value || '').trim();
  if (!value) return null;
  return (state.subclasses || []).find(entry =>
    normalizeKey(entry?.name) === normalizeKey(value)
  ) || null;
}

function getSubclassFeaturesForLevel(level) {
  const subclass = getSelectedSubclassEntry();
  if (!subclass || !level) return [];
  const features = [];
  const mapping = subclass.features_by_level || {};
  Object.entries(mapping).forEach(([lvl, entries]) => {
    const numeric = Number(lvl);
    if (!Number.isFinite(numeric) || numeric > level) return;
    if (Array.isArray(entries)) {
      entries.forEach(item => {
        if (item && !features.includes(item)) features.push(item);
      });
    } else if (entries) {
      const text = String(entries).trim();
      if (text && !features.includes(text)) features.push(text);
    }
  });
  return features;
}

function getLevelSelect() {
  return document.getElementById('level-select');
}

function getWeaponMasteryBox() {
  return document.getElementById('weapon-mastery-box');
}

function getWeaponMasterySelect(index) {
  return document.getElementById(index === 2 ? 'weapon-mastery-2' : 'weapon-mastery-1');
}

function getCharDetailsGrid() {
  return document.getElementById('char-details-grid');
}

function getStrengthScoreInput() {
  return document.getElementById('strength-score');
}

function getStrengthModInput() {
  return document.getElementById('strength-mod');
}

function getInitiativeScoreInput() {
  return document.getElementById('initiative-score');
}

function getInitiativeAdjustSelect() {
  return document.getElementById('initiative-adjust');
}

function getArmorClassInput() {
  return document.getElementById('armor-class');
}

function getArmorSelect() {
  return document.getElementById('armor-equipped');
}

function getMaxHpInput() {
  return document.getElementById('max-hp');
}

function getCurrentHpInput() {
  return document.querySelector('.hp-current');
}

function getHitDiceTotalInput() {
  return document.getElementById('hit-dice-total');
}

function getHitDiceSpentInput() {
  return document.getElementById('hit-dice-spent');
}

function getSpellcastingAbilityInput() {
  return document.getElementById('spellcasting-ability');
}

function getSpellcastingModInput() {
  return document.getElementById('spellcasting-mod');
}

function getSpellSaveDcInput() {
  return document.getElementById('spell-save-dc');
}

function getSpellAttackBonusInput() {
  return document.getElementById('spell-attack-bonus');
}

function getCharacterNameInput() {
  return document.getElementById('character-name-input');
}

function getGenerateNameButton() {
  return document.getElementById('generate-name-btn');
}

function getGenerateBackgroundButton() {
  return document.getElementById('generate-background-btn');
}

function getGenModeToggle() {
  return document.getElementById('gen-mode-toggle');
}

function getSaveButton() {
  return document.getElementById('save-button');
}

function getSaveStatus() {
  return document.getElementById('save-status');
}

function getSidebarSaveButton() {
  return document.getElementById('sidebar-save');
}

function getSidebarSaveAsButton() {
  return document.getElementById('sidebar-save-as');
}

function getSidebarLoadSelect() {
  return document.getElementById('sidebar-load-select');
}

function getSidebarLoadButton() {
  return document.getElementById('sidebar-load');
}

function getSidebarNewButton() {
  return document.getElementById('sidebar-new');
}

function getSidebarLevelUpButton() {
  return document.getElementById('sidebar-level-up');
}

function getSidebarLevelDownButton() {
  return document.getElementById('sidebar-level-down');
}

function getSidebarShortRestButton() {
  return document.getElementById('sidebar-short-rest');
}

function getSidebarLongRestButton() {
  return document.getElementById('sidebar-long-rest');
}

function getSidebarBackButton() {
  return document.getElementById('sidebar-back');
}

function getWizardLoadWarning() {
  return document.getElementById('wizard-load-warning');
}

function getCharacterArtInput() {
  return document.getElementById('character-art-input');
}

function getCharacterArtPreview() {
  return document.getElementById('character-art-preview');
}

function getCharacterArtNotes() {
  return document.getElementById('character-art-notes');
}

function getBackgroundNotes() {
  return document.getElementById('background-notes');
}

  function getPersonalityNotes() {
    return document.getElementById('personality-notes');
  }

  function updateCharacterArtPreview(file) {
    const preview = getCharacterArtPreview();
    if (!preview) return;
    if (!file) {
      preview.textContent = 'No image';
      preview.style.backgroundImage = '';
      return;
    }
    if (!file.type || !file.type.startsWith('image/')) {
      preview.textContent = 'Unsupported file type';
      preview.style.backgroundImage = '';
      return;
    }
    const url = URL.createObjectURL(file);
    preview.textContent = '';
    preview.style.backgroundImage = `url(${url})`;
    preview.style.backgroundSize = 'cover';
    preview.style.backgroundPosition = 'center';
  }

function getGeneratorMode() {
  return 'local';
}

function setGeneratorMode(mode) {
  return mode === 'ai' ? 'ai' : 'local';
}

function getGeneratorContext() {
  const species = getSpeciesSelect()?.value || '';
  const lineage = getLineageSelect()?.value || '';
  const className = getClassSelect()?.value || '';
  const background = getBackgroundSelect()?.value || '';
  return { species, lineage, className, background };
}

function localNameGenerator({ species, lineage, className }) {
  const prefixes = ['Ar', 'Bel', 'Cor', 'Da', 'El', 'Fa', 'Ka', 'La', 'Mor', 'Ra', 'Sa', 'Tal', 'Vor'];
  const middles = ['an', 'er', 'il', 'or', 'un', 'en', 'is', 'ar', 'el', 'ir'];
  const suffixes = ['a', 'en', 'in', 'or', 'us', 'yn', 'iel', 'or', 'eth', 'on'];
  const speciesHint = String(species || lineage || className || '').toLowerCase();
  if (speciesHint.includes('elf')) {
    prefixes.push('Ae', 'Eli', 'Lia', 'Syl');
    suffixes.push('wyn', 'thir', 'lith');
  }
  if (speciesHint.includes('dwarf')) {
    prefixes.push('Bru', 'Dur', 'Thra');
    suffixes.push('din', 'grin', 'bek');
  }
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  return `${pick(prefixes)}${pick(middles)}${pick(suffixes)}`.replace(/\s+/g, '');
}

function localBackgroundGenerator({ className, background, species }) {
  const origins = [
    'grew up among traveling traders',
    'was raised by a quiet order of scholars',
    'survived a harsh frontier settlement',
    'served in a small militia before adventuring',
    'learned the old ways from a wandering mentor',
  ];
  const hooks = [
    'seeks a lost relic tied to their family',
    'owes a debt to a mysterious patron',
    'is chasing rumors of a hidden sanctuary',
    'hopes to restore a broken community',
    'is trying to prove themselves after a failure',
  ];
  const traits = [
    'calm under pressure',
    'curious to a fault',
    'stubborn but loyal',
    'wryly humorous',
    'cautious and observant',
  ];
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const bg = [
    `A ${background || className || 'traveler'} who ${pick(origins)}.`,
    `They ${pick(hooks)}.`,
    `Their manner is ${pick(traits)}.`,
  ].join(' ');
  const personality = `A ${pick(traits)} ${species || 'adventurer'} with a lingering sense of purpose.`;
  return { background: bg, personality };
}

async function generateName() {
  const nameInput = getCharacterNameInput();
  if (!nameInput) return;
  const status = getSaveStatus();
  const ctx = getGeneratorContext();
  if (getGeneratorMode() === 'ai') {
    try {
      const response = await fetch('/api/wizard/generate-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      });
      if (!response.ok) throw new Error('ai-failed');
      const data = await response.json();
      if (data?.name) {
        nameInput.value = data.name;
        status && (status.textContent = 'Name generated (AI).');
        return;
      }
    } catch {
      status && (status.textContent = 'AI failed, using local.');
    }
  }
  nameInput.value = localNameGenerator(ctx);
  status && (status.textContent = 'Name generated (Local).');
}

async function generateBackground() {
  const backgroundNotes = getBackgroundNotes();
  const personalityNotes = getPersonalityNotes?.();
  if (!backgroundNotes) return;
  const status = getSaveStatus();
  const ctx = getGeneratorContext();
  if (getGeneratorMode() === 'ai') {
    try {
      const response = await fetch('/api/wizard/generate-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      });
      if (!response.ok) throw new Error('ai-failed');
      const data = await response.json();
      if (data?.background) backgroundNotes.value = data.background;
      if (personalityNotes && data?.personality) personalityNotes.value = data.personality;
      status && (status.textContent = 'Background generated (AI).');
      return;
    } catch {
      status && (status.textContent = 'AI failed, using local.');
    }
  }
  const local = localBackgroundGenerator(ctx);
  backgroundNotes.value = local.background;
  if (personalityNotes) personalityNotes.value = local.personality;
  status && (status.textContent = 'Background generated (Local).');
}

async function ensurePlayerAuth() {
  const warning = getWizardLoadWarning();
  try {
    const res = await fetch('/api/player/me');
    if (!res.ok) throw new Error('unauthorized');
    const data = await res.json();
    if (!data?.authenticated) throw new Error('unauthorized');
    if (warning) {
      warning.hidden = true;
      warning.textContent = '';
    }
    return true;
  } catch {
    if (warning) {
      warning.hidden = false;
      warning.innerHTML =
        'Please log in with Discord to use the character wizard. ' +
        '<a href="/auth/discord/player">Connect Discord</a>';
    }
    return false;
  }
}

function getInventoryOptionButtons() {
  return Array.from(document.querySelectorAll('.inventory-option-btn'));
}

function getInventoryTableBody(type) {
  return document.querySelector(`#inventory-${type} tbody`);
}

function getInventoryAddButton() {
  return document.getElementById('inventory-add-item');
}

function getInventoryShopButton() {
  return document.getElementById('inventory-shop-item');
}

function getInventorySellButton() {
  return document.getElementById('inventory-sell-item');
}

function getInventoryTradeButton() {
  return document.getElementById('inventory-trade-item');
}

function getInventoryModal() {
  return document.getElementById('inventory-modal');
}

function getInventoryModalTitle() {
  return document.getElementById('inventory-modal-title');
}

function getInventoryModalSearch() {
  return document.getElementById('inventory-modal-search');
}

function getInventoryModalTable() {
  return document.getElementById('inventory-modal-table');
}

function getInventoryModalQty() {
  return document.getElementById('inventory-modal-qty');
}

function getInventoryModalError() {
  return document.getElementById('inventory-modal-error');
}

function getInventoryModalConfirm() {
  return document.getElementById('inventory-modal-confirm');
}

function getInventoryModalCancel() {
  return document.getElementById('inventory-modal-cancel');
}

function getTradeModal() {
  return document.getElementById('trade-modal');
}

function getTradePlayerSelect() {
  return document.getElementById('trade-player-select');
}

function getTradeItemName() {
  return document.getElementById('trade-item-name');
}

function getTradeItemQty() {
  return document.getElementById('trade-item-qty');
}

function getTradeModalError() {
  return document.getElementById('trade-modal-error');
}

function getTradeModalCancel() {
  return document.getElementById('trade-modal-cancel');
}

function getTradeModalConfirm() {
  return document.getElementById('trade-modal-confirm');
}

function getAttackRowInputs() {
  return Array.from(document.querySelectorAll('.attack-table tbody tr')).map(row => ({
    name: row.querySelector('.attack-name'),
    atk: row.querySelector('.attack-atk'),
    dmg: row.querySelector('.attack-dmg'),
    mastery: row.querySelector('.attack-mastery'),
  }));
}

function getPreparedSpellsTableBody() {
  return document.querySelector('#prepared-spells-table tbody');
}

function getSpellBookTableBody() {
  return document.querySelector('#spell-book-table tbody');
}

function getProficiencyBonusSpan() {
  return document.getElementById('proficiency-bonus');
}

function getClassFeaturesBox() {
  return document.getElementById('class-features-box');
}

function getSpeciesTraitsBox() {
  return document.getElementById('species-traits-box');
}

function getFeatsBox() {
  return document.getElementById('feats-box');
}

function getLanguagesBox() {
  return document.getElementById('languages-box');
}

function getArmorTrainingInputs() {
  return {
    light: document.getElementById('training-light'),
    medium: document.getElementById('training-medium'),
    heavy: document.getElementById('training-heavy'),
    shields: document.getElementById('training-shields'),
  };
}

function getWeaponTrainingInputs() {
  return {
    simpleMelee: document.getElementById('training-simple-melee'),
    simpleRanged: document.getElementById('training-simple-ranged'),
    martialMelee: document.getElementById('training-martial-melee'),
    martialRanged: document.getElementById('training-martial-ranged'),
  };
}

function getArmorTrainingWarning() {
  return document.getElementById('armor-training-warning');
}

function getSpellcastingWarning() {
  return document.getElementById('spellcasting-warning');
}

function getLevelUpModal() {
  return document.getElementById('level-up-modal');
}

function getLevelUpTitle() {
  return document.getElementById('level-up-title');
}

function getLevelUpChangesList() {
  return document.getElementById('level-up-changes');
}

function getLevelUpSelections() {
  return document.getElementById('level-up-selections');
}

function getLevelUpCloseButton() {
  return document.getElementById('level-up-close');
}

function getLevelUpError() {
  return document.getElementById('level-up-error');
}

function getWildShapeBox() {
  return document.getElementById('wild-shape-box');
}

function getWildShapeUsesMax() {
  return document.getElementById('wild-shape-uses-max');
}

function getWildShapeUsesRemaining() {
  return document.getElementById('wild-shape-uses-remaining');
}

function getWildShapeSpentInput() {
  return document.getElementById('wild-shape-spent');
}

function getWildShapeTempHp() {
  return document.getElementById('wild-shape-temp-hp');
}

function getWildShapeMaxCr() {
  return document.getElementById('wild-shape-max-cr');
}

function getWildShapeFlyAllowed() {
  return document.getElementById('wild-shape-fly');
}

function getWildShapeFormSelect() {
  return document.getElementById('wild-shape-form-select');
}

function getWildShapeAddButton() {
  return document.getElementById('wild-shape-add');
}

function getWildShapeFormsTable() {
  return document.getElementById('wild-shape-forms-table');
}

function getTempHpInput() {
  return document.getElementById('temp-hp-input');
}

function getHeroicInspirationInput() {
  return document.getElementById('heroic-inspiration');
}

function getWildShapeTransformButton() {
  return document.getElementById('wild-shape-transform');
}

function getWildShapeRevertButton() {
  return document.getElementById('wild-shape-revert');
}

function getWildShapeModal() {
  return document.getElementById('wild-shape-modal');
}

function getWildShapeModalSelect() {
  return document.getElementById('wild-shape-modal-select');
}

function getWildShapeModalConfirm() {
  return document.getElementById('wild-shape-modal-confirm');
}

function getWildShapeModalCancel() {
  return document.getElementById('wild-shape-modal-cancel');
}

function getWildShapeModalError() {
  return document.getElementById('wild-shape-modal-error');
}

function getCurrencyInputs() {
  return {
    cp: document.getElementById('currency-cp'),
    sp: document.getElementById('currency-sp'),
    ep: document.getElementById('currency-ep'),
    gp: document.getElementById('currency-gp'),
    pp: document.getElementById('currency-pp'),
  };
}

function getClassSpecialBox() {
  return document.getElementById('class-special-box');
}

function getWildCompanionActiveLabel() {
  return document.getElementById('wild-companion-active');
}

function getWildCompanionSourceSelect() {
  return document.getElementById('wild-companion-source');
}

function getWildCompanionSummonButton() {
  return document.getElementById('wild-companion-summon');
}

function getWildCompanionDismissButton() {
  return document.getElementById('wild-companion-dismiss');
}

function getFeatureChoiceKey(choice) {
  return `${choice?.class_id || ''}|${choice?.level || ''}|${choice?.feature || ''}`.trim();
}

function getFeatureChoicesForLevel(levelOverride = null, options = {}) {
  const classEntry = getSelectedClassEntry();
  const fallbackName = classEntry?.name || '';
  const fallbackId = fallbackName ? `CLS_${normalizeKey(fallbackName)}` : '';
  const classId = classEntry?.class_id
    || state.classIdByName?.[normalizeName(fallbackName)]
    || fallbackId;
  const level = Number.isFinite(levelOverride) ? levelOverride : getCurrentLevel();
  if (!classId || !Number.isFinite(level)) return [];
  const includeRefreshable = options?.includeRefreshable;
  return (state.featureChoices || []).filter(choice => {
    if (String(choice?.class_id || '') !== String(classId)) return false;
    const choiceLevel = Number(choice?.level);
    if (!Number.isFinite(choiceLevel)) return false;
    if (choiceLevel === level) return true;
    if (!includeRefreshable) return false;
    if (choiceLevel > level) return false;
    const refreshable = (choice.options || []).some(option =>
      option?.effects && String(option.effects.refresh_on_long_rest).toLowerCase() === 'true'
    );
    return refreshable;
  });
}

function getFeatureChoicesForCurrentLevel() {
  return getFeatureChoicesForLevel(getCurrentLevel());
}

function getFeatureChoiceEffects() {
  const classEntry = getSelectedClassEntry();
  const fallbackName = classEntry?.name || '';
  const fallbackId = fallbackName ? `CLS_${normalizeKey(fallbackName)}` : '';
  const classId = classEntry?.class_id
    || state.classIdByName?.[normalizeName(fallbackName)]
    || fallbackId;
  const level = getCurrentLevel();
  const totals = {
    cantripsBonus: 0,
    armorTrainingAdd: new Set(),
    weaponTrainingAdd: new Set(),
  };
  if (!classId || !Number.isFinite(level)) return totals;
  (state.featureChoices || []).forEach(choice => {
    if (String(choice?.class_id || '') !== String(classId)) return;
    if (Number(choice?.level) > level) return;
    const key = getFeatureChoiceKey(choice);
    const selected = state.featureSelections?.[key];
    const selectedKey = typeof selected === 'string' ? selected : selected?.option;
    if (!selectedKey) return;
    const option = (choice.options || []).find(opt => opt.key === selectedKey);
    const effects = option?.effects || {};
    const cantripsBonus = Number(effects.cantrips_bonus || effects.cantripsBonus);
    if (Number.isFinite(cantripsBonus)) totals.cantripsBonus += cantripsBonus;
    (effects.armor_training_add || effects.armorTrainingAdd || []).forEach(value =>
      totals.armorTrainingAdd.add(String(value).toLowerCase())
    );
    (effects.weapon_training_add || effects.weaponTrainingAdd || []).forEach(value =>
      totals.weaponTrainingAdd.add(String(value).toLowerCase())
    );
  });
  return totals;
}

function getClassProgressionRowForLevel(levelOverride = null) {
  const classEntry = getSelectedClassEntry();
  const fallbackName = classEntry?.name || '';
  const fallbackId = fallbackName ? `CLS_${normalizeKey(fallbackName)}` : '';
  const classId = classEntry?.class_id
    || state.classIdByName?.[normalizeName(fallbackName)]
    || fallbackId;
  const level = Number.isFinite(levelOverride) ? levelOverride : getCurrentLevel();
  if (!classId || !Number.isFinite(level)) return null;
  return (state.classProgression || []).find(entry =>
    String(entry.class_id || '') === String(classId) && String(entry.level || '') === String(level)
  ) || null;
}

function getClassProgressionRow() {
  return getClassProgressionRowForLevel(getCurrentLevel());
}

function getClassFeaturesForLevel(levelOverride = null) {
  const classEntry = getSelectedClassEntry();
  const fallbackName = classEntry?.name || '';
  const fallbackId = fallbackName ? `CLS_${normalizeKey(fallbackName)}` : '';
  const classId = classEntry?.class_id
    || state.classIdByName?.[normalizeName(fallbackName)]
    || fallbackId;
  const level = Number.isFinite(levelOverride) ? levelOverride : getCurrentLevel();
  if (!classId || !Number.isFinite(level)) return [];
  const rows = (state.classProgression || [])
    .filter(entry =>
      String(entry.class_id || '') === String(classId)
      && Number(entry.level) <= level
    )
    .sort((a, b) => Number(a.level) - Number(b.level));
  const features = [];
  rows.forEach(row => {
    splitFeatureList(row?.class_features).forEach(feature => {
      if (!features.includes(feature)) features.push(feature);
    });
  });
  return features;
}

function updateProficiencyBonus() {
  const span = getProficiencyBonusSpan();
  if (!span) return;
  const row = getClassProgressionRow();
  const value = String(row?.proficiency_bonus || '').trim();
  span.textContent = value || '+2';
  updateSpellcastingEligibility();
  updateSpellcastingStats();
  updateEquippedGearFromInventory();
  updateSpellSlotsFromProgression();
}

function updateClassFeatures() {
  const box = getClassFeaturesBox();
  if (!box) return;
  const classEntry = getSelectedClassEntry();
  const fallbackName = classEntry?.name || '';
  const fallbackId = fallbackName ? `CLS_${normalizeKey(fallbackName)}` : '';
    const classId = classEntry?.class_id
      || state.classIdByName?.[normalizeName(fallbackName)]
      || fallbackId;
    const level = getCurrentLevel();
    if (!classId || !Number.isFinite(level)) {
      box.value = '';
      renderWeaponMasteryBox();
      return;
    }
  const features = getClassFeaturesForLevel(level);
  const extraNotes = [];
  Object.entries(state.featureSelections || {}).forEach(([key, selection]) => {
    const choice = (state.featureChoices || []).find(entry => getFeatureChoiceKey(entry) === key);
    if (!choice) return;
    const optionKey = typeof selection === 'string' ? selection : selection?.option;
    const option = (choice.options || []).find(opt => opt.key === optionKey);
    const effects = option?.effects || {};
    const weapons = Array.isArray(selection?.weapons) ? selection.weapons.filter(Boolean) : [];
    const language = typeof selection?.language === 'string' ? selection.language : '';
    if (effects.weapon_mastery && weapons.length) {
      // Keep selection stored, but don't show in class features box.
    }
    if (effects.language_choice && language) {
      // Keep selection stored, but don't show in class features box.
    }
  });
  const subclassFeatures = getSubclassFeaturesForLevel(level);
  const fullList = features.concat(subclassFeatures, extraNotes);
  box.value = fullList.join(', ');
  renderWeaponMasteryBox();
}

function updateSpellSlotsFromProgression() {
  const row = getClassProgressionRow();
  const rows = Array.from(document.querySelectorAll('.spell-slot-row'));
  rows.forEach(container => {
    const level = Number(container.dataset.slotLevel);
    const key = `spell_slots_level_${level}`;
    const total = Number(row?.[key]);
    const totalDots = container.querySelector('[data-slot-type="total"]');
    const expendedDots = container.querySelector('[data-slot-type="expended"]');
    const expendedLabel = container.querySelector('.slot-label-expended');
    if (!Number.isFinite(total) || total <= 0) {
      container.style.display = 'none';
      if (totalDots) totalDots.innerHTML = '';
      if (expendedDots) expendedDots.innerHTML = '';
      return;
    }
    container.style.display = '';
    if (totalDots) {
      totalDots.innerHTML = '';
      for (let i = 0; i < total; i += 1) {
        const dot = document.createElement('span');
        dot.className = 'slot-dot';
        totalDots.appendChild(dot);
      }
    }
    if (expendedDots) {
      expendedDots.innerHTML = '';
      const spent = Math.max(0, Math.min(Number(state.spellSlotExpended?.[level]) || 0, total));
      state.spellSlotExpended[level] = spent;
      expendedDots.style.display = spent > 0 ? 'flex' : 'none';
      if (expendedLabel) expendedLabel.style.visibility = spent > 0 ? 'visible' : 'hidden';
      for (let i = 0; i < total; i += 1) {
        const dot = document.createElement('span');
        dot.className = i < spent ? 'slot-dot filled' : 'slot-dot';
        dot.dataset.level = String(level);
        dot.dataset.index = String(i);
        expendedDots.appendChild(dot);
      }
    }
  });
  document.querySelectorAll('.spell-slot-dots[data-slot-type="expended"] .slot-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const level = Number(dot.dataset.level);
      const index = Number(dot.dataset.index);
      if (!Number.isFinite(level) || !Number.isFinite(index)) return;
      const current = Number(state.spellSlotExpended?.[level]) || 0;
      const next = index + 1;
      state.spellSlotExpended[level] = current === next ? index : next;
      updateSpellSlotsFromProgression();
    });
  });
}

function getArmorTrainingFromClass() {
  const classEntry = getSelectedClassEntry();
  const normalized = normalizeName(classEntry?.name || '');
  const normalizedMatch = state.normalizedClasses.find(entry =>
    normalizeName(entry?.name) === normalized
  );
  const raw = String(normalizedMatch?.armor_proficiencies || classEntry?.armor_proficiencies || '');
  const extra = getFeatureChoiceEffects();
  return {
    light: /light/i.test(raw) || extra.armorTrainingAdd.has('light'),
    medium: /medium/i.test(raw) || extra.armorTrainingAdd.has('medium'),
    heavy: /heavy/i.test(raw) || extra.armorTrainingAdd.has('heavy'),
    shields: /shield/i.test(raw) || extra.armorTrainingAdd.has('shields'),
  };
}

function applyArmorTrainingFromClass() {
  state.armorTraining = getArmorTrainingFromClass();
  const inputs = getArmorTrainingInputs();
  if (!inputs.light) return;
  inputs.light.checked = state.armorTraining.light;
  inputs.medium.checked = state.armorTraining.medium;
  inputs.heavy.checked = state.armorTraining.heavy;
  inputs.shields.checked = state.armorTraining.shields;
  inputs.light.disabled = true;
  inputs.medium.disabled = true;
  inputs.heavy.disabled = true;
  inputs.shields.disabled = true;
}

function getWeaponTrainingFromClass() {
  const classEntry = getSelectedClassEntry();
  const normalized = normalizeName(classEntry?.name || '');
  const normalizedMatch = state.normalizedClasses.find(entry =>
    normalizeName(entry?.name) === normalized
  );
  const raw = String(normalizedMatch?.weapon_proficiencies || classEntry?.weapon_proficiencies || '');
  const text = raw.toLowerCase();
  const hasSimple = text.includes('simple');
  const hasMartial = text.includes('martial');
  const hasMelee = text.includes('melee');
  const hasRanged = text.includes('ranged');
  const hasLight = text.includes('light');
  const hasFinesse = text.includes('finesse');
  const simpleAll = hasSimple && !hasMelee && !hasRanged;
  const martialAll = hasMartial && !hasMelee && !hasRanged && !hasLight && !hasFinesse;
  const extra = getFeatureChoiceEffects();
  const extraMartial = extra.weaponTrainingAdd.has('martial');
  return {
    simpleMelee: hasSimple && (simpleAll || hasMelee),
    simpleRanged: hasSimple && (simpleAll || hasRanged),
    martialMelee: (hasMartial && (martialAll || hasMelee || hasLight || hasFinesse)) || extraMartial,
    martialRanged: (hasMartial && (martialAll || hasRanged)) || extraMartial,
  };
}

function applyWeaponTrainingFromClass() {
  state.weaponTraining = getWeaponTrainingFromClass();
  const inputs = getWeaponTrainingInputs();
  if (!inputs.simpleMelee) return;
  inputs.simpleMelee.checked = state.weaponTraining.simpleMelee;
  inputs.simpleRanged.checked = state.weaponTraining.simpleRanged;
  inputs.martialMelee.checked = state.weaponTraining.martialMelee;
  inputs.martialRanged.checked = state.weaponTraining.martialRanged;
  inputs.simpleMelee.disabled = true;
  inputs.simpleRanged.disabled = true;
  inputs.martialMelee.disabled = true;
  inputs.martialRanged.disabled = true;
}

function getEquippedArmorCategory() {
  if (!state.equippedArmorKey) return '';
  const armor = state.armor.find(entry => normalizeItemName(entry?.name) === state.equippedArmorKey);
  return String(armor?.category || '').toLowerCase();
}

function updateArmorTrainingEffects() {
  const warning = getArmorTrainingWarning();
  const spellWarning = getSpellcastingWarning();
  const category = getEquippedArmorCategory();
  let untrained = false;
  if (category.includes('light') && !state.armorTraining.light) untrained = true;
  if (category.includes('medium') && !state.armorTraining.medium) untrained = true;
  if (category.includes('heavy') && !state.armorTraining.heavy) untrained = true;
  state.canCastSpells = getClassSpellcastingEligibility() && !untrained;
  if (warning) {
    warning.textContent = untrained
      ? 'Untrained armor: Disadvantage on STR/DEX tests and you cannot cast spells.'
      : '';
  }
  if (spellWarning) {
    spellWarning.textContent = untrained
      ? 'Spellcasting disabled while wearing untrained armor.'
      : getClassSpellcastingEligibility() ? '' : 'Spellcasting unavailable at this level.';
  }
  updateSpellcastingStats();
  renderSpellBook();
}

function formatProgressionKey(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function splitFeatureList(raw) {
  return String(raw || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function buildLevelUpChanges(prevRow, nextRow) {
  const changes = [];
  if (!nextRow) return changes;
  if (prevRow?.proficiency_bonus !== nextRow.proficiency_bonus) {
    changes.push({
      label: 'Proficiency Bonus',
      before: prevRow?.proficiency_bonus || '—',
      after: nextRow.proficiency_bonus || '—',
    });
  }
  const prevFeatures = splitFeatureList(prevRow?.class_features);
  const nextFeatures = splitFeatureList(nextRow?.class_features);
  const addedFeatures = nextFeatures.filter(item => !prevFeatures.includes(item));
  if (addedFeatures.length) {
    changes.push({
      label: 'Class Features',
      before: prevFeatures.length ? prevFeatures.join(', ') : '—',
      after: addedFeatures.join(', '),
    });
  }
  const ignored = new Set(['class_id', 'level', 'source', 'version', 'class_features', 'proficiency_bonus']);
  Object.entries(nextRow).forEach(([key, value]) => {
    if (ignored.has(key)) return;
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;
    const prevValue = Number(prevRow?.[key]);
    if (!Number.isFinite(prevValue) || nextValue > prevValue) {
      changes.push({
        label: formatProgressionKey(key),
        before: Number.isFinite(prevValue) ? String(prevValue) : '—',
        after: String(nextValue),
      });
    }
  });
  return changes;
}

  function renderLevelUpSelections(container, levelOverride = null, options = {}) {
    if (!container) return;
    container.innerHTML = '';
    container.dataset.classSkillRequired = 'false';
    const debugLine = document.createElement('div');
    debugLine.className = 'modal-debug';
    const activeChoices = getFeatureChoicesForLevel(levelOverride, { includeRefreshable: options?.includeRefreshable });
    const debugFeatures = activeChoices.map(choice => choice.feature).filter(Boolean).join(', ');
    debugLine.textContent = debugFeatures ? `Selections available: ${debugFeatures}` : 'Selections available: (none)';
    container.appendChild(debugLine);
    const subclassSelect = getSubclassSelect();
  if (subclassSelect && !subclassSelect.disabled && !String(subclassSelect.value || '').trim()) {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = 'Subclass';
    const select = document.createElement('select');
    select.dataset.required = 'true';
    Array.from(subclassSelect.options).forEach(option => {
      const clone = option.cloneNode(true);
      select.appendChild(clone);
    });
    select.addEventListener('change', () => {
      subclassSelect.value = select.value;
      if (String(select.value || '').trim()) {
        subclassSelect.disabled = true;
      }
    });
    wrapper.appendChild(label);
    wrapper.appendChild(select);
    container.appendChild(wrapper);
  }
  const featureChoices = getFeatureChoicesForLevel(levelOverride, { includeRefreshable: options?.includeRefreshable });
  featureChoices.forEach(choice => {
    const options = Array.isArray(choice.options) ? choice.options : [];
    if (!options.length) return;
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = choice.feature || 'Feature Choice';
    const key = getFeatureChoiceKey(choice);
    const stored = state.featureSelections?.[key];
    const storedOption = typeof stored === 'string' ? stored : stored?.option;
    let select = null;
    if (options.length > 1) {
      select = document.createElement('select');
      select.dataset.required = 'true';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select...';
      select.appendChild(placeholder);
      options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.key;
        opt.textContent = option.label || option.key;
        select.appendChild(opt);
      });
      if (storedOption) {
        select.value = storedOption;
      }
    } else {
      const onlyOption = options[0];
      const current = typeof state.featureSelections[key] === 'object' ? state.featureSelections[key] : {};
      if (!storedOption) {
        state.featureSelections[key] = { ...current, option: onlyOption.key };
      }
    }
    const detailContainer = document.createElement('div');
    detailContainer.className = 'modal-selections';
    const detailError = document.createElement('div');
    detailError.className = 'modal-error';
    const renderDetail = () => {
      detailContainer.innerHTML = '';
      detailError.textContent = '';
      const chosenKey = options.length > 1
        ? String(select?.value || '').trim()
        : String(options[0]?.key || '').trim();
      if (!chosenKey) return;
      const option = options.find(opt => opt.key === chosenKey);
      const effects = option?.effects || {};
      const skillChoices = Array.isArray(effects.skill_choice) ? effects.skill_choice : [];
      if (skillChoices.length) {
        const skillLabel = document.createElement('label');
        skillLabel.textContent = 'Skill Choice';
        const skillSelect = document.createElement('select');
        skillSelect.dataset.required = 'true';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select...';
        skillSelect.appendChild(placeholder);
        skillChoices.forEach(skill => {
          const opt = document.createElement('option');
          opt.value = skill;
          opt.textContent = skill;
          skillSelect.appendChild(opt);
        });
        const storedSkill = typeof stored === 'object' ? stored?.skill : '';
        if (storedSkill) skillSelect.value = storedSkill;
        skillSelect.addEventListener('change', () => {
          const skill = String(skillSelect.value || '').trim();
          if (skill) {
            const current = typeof state.featureSelections[key] === 'object' ? state.featureSelections[key] : {};
            state.featureSelections[key] = { ...current, option: chosenKey, skill };
            updateFeatureSkillSelections();
            refreshSkillProficiencies(false);
          }
        });
        detailContainer.appendChild(skillLabel);
        detailContainer.appendChild(skillSelect);
        if (effects.skill_bonus) {
          const note = document.createElement('div');
          note.textContent = `Bonus: ${effects.skill_bonus}`;
          detailContainer.appendChild(note);
        }
      }
      const languageCount = Number(effects.language_choice || effects.languageChoice || 0);
      if (Number.isFinite(languageCount) && languageCount > 0) {
        const languageLabel = document.createElement('label');
        languageLabel.textContent = 'Language Choice';
        const languageSelect = document.createElement('select');
        languageSelect.dataset.required = 'true';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select...';
        languageSelect.appendChild(placeholder);
        getAllLanguages().forEach(language => {
          const opt = document.createElement('option');
          opt.value = language;
          opt.textContent = language;
          languageSelect.appendChild(opt);
        });
        const storedLanguage = typeof stored === 'object' ? stored?.language : '';
        if (storedLanguage) languageSelect.value = storedLanguage;
        languageSelect.addEventListener('change', () => {
          const language = String(languageSelect.value || '').trim();
          if (language) {
            const current = typeof state.featureSelections[key] === 'object' ? state.featureSelections[key] : {};
            state.featureSelections[key] = { ...current, option: chosenKey, language };
            renderLanguagesSelection(readSelectedLanguagesFromBox());
            updateClassFeatures();
          }
        });
        detailContainer.appendChild(languageLabel);
        detailContainer.appendChild(languageSelect);
      }
      const weaponCount = Number(effects.weapon_mastery || effects.weaponMastery || 0);
      if (Number.isFinite(weaponCount) && weaponCount > 0) {
        const optionsList = getWeaponMasteryOptions();
        const storedWeapons = Array.isArray(stored?.weapons) ? stored.weapons : [];
        const weaponSelects = [];
          for (let i = 0; i < weaponCount; i += 1) {
            const weaponLabel = document.createElement('label');
            weaponLabel.textContent = `Weapon Mastery ${i + 1}`;
            const weaponSelect = document.createElement('select');
            weaponSelect.dataset.required = 'true';
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = 'Select...';
          weaponSelect.appendChild(placeholder);
          optionsList.forEach(weapon => {
            const opt = document.createElement('option');
            opt.value = weapon;
            opt.textContent = weapon;
            weaponSelect.appendChild(opt);
          });
            const storedWeapon = storedWeapons[i];
            if (storedWeapon) weaponSelect.value = storedWeapon;
            weaponSelects.push(weaponSelect);
            setWeaponMasterySelectTooltip(weaponSelect);
            weaponSelect.addEventListener('change', () => {
              setWeaponMasterySelectTooltip(weaponSelect);
              const chosen = weaponSelects.map(sel => String(sel.value || '').trim()).filter(Boolean);
              const unique = new Set(chosen);
              if (chosen.length !== unique.size) {
                weaponSelect.value = '';
                detailError.textContent = 'Choose two different weapons.';
              return;
            }
            detailError.textContent = '';
            const current = typeof state.featureSelections[key] === 'object' ? state.featureSelections[key] : {};
            state.featureSelections[key] = { ...current, option: chosenKey, weapons: chosen };
            updateClassFeatures();
          });
          detailContainer.appendChild(weaponLabel);
          detailContainer.appendChild(weaponSelect);
        }
        detailContainer.appendChild(detailError);
      }
    };
    renderDetail();
    if (select) {
      select.addEventListener('change', () => {
        const chosen = String(select.value || '').trim();
        if (chosen) {
          state.featureSelections[key] = { option: chosen };
          updateFeatureSkillSelections();
          renderDetail();
          applyArmorTrainingFromClass();
          applyWeaponTrainingFromClass();
          updateArmorTrainingEffects();
          renderSpellBook();
          renderPreparedSpells();
          refreshSkillProficiencies(false);
        }
      });
    }
    wrapper.appendChild(label);
    if (select) wrapper.appendChild(select);
    wrapper.appendChild(detailContainer);
    wrapper.appendChild(detailError);
    if (choice.description) {
      const note = document.createElement('div');
      note.textContent = choice.description;
      wrapper.appendChild(note);
    }
    container.appendChild(wrapper);
  });
  const classLimit = state.classSkillLimit;
  const allowedSet = state.classSkillAllowed || new Set();
  if (Number.isFinite(classLimit) && classLimit > 0 && allowedSet.size) {
    const classSet = state.classSkillSelections || new Set();
    if (classSet.size < classLimit) {
      container.dataset.classSkillRequired = 'true';
      const wrapper = document.createElement('div');
      const label = document.createElement('label');
      label.textContent = `Class Skills (Choose ${classLimit})`;
      wrapper.appendChild(label);
      const list = document.createElement('div');
      list.className = 'modal-selections';
      const backgroundSet = state.backgroundSkillSelections || new Set();
      const featureSet = state.featureSkillSelections || new Set();
      Array.from(allowedSet).sort().forEach(skillKey => {
        const row = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = skillKey;
        const isBackground = backgroundSet.has(skillKey);
        const isFeature = featureSet.has(skillKey);
        const isSelected = classSet.has(skillKey);
        checkbox.checked = isBackground || isFeature || isSelected;
        checkbox.disabled = isBackground || isFeature;
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            if (!classSet.has(skillKey) && classSet.size >= classLimit) {
              checkbox.checked = false;
              return;
            }
            classSet.add(skillKey);
          } else {
            classSet.delete(skillKey);
          }
          state.classSkillSelections = new Set(classSet);
          applySkillSelections();
        });
        row.appendChild(checkbox);
        row.appendChild(document.createTextNode(skillKey.replace(/\b\w/g, c => c.toUpperCase())));
        list.appendChild(row);
      });
      wrapper.appendChild(list);
      container.appendChild(wrapper);
    }
  }
  if (!container.children.length) {
    const note = document.createElement('div');
    note.textContent = 'No additional selections needed.';
    container.appendChild(note);
  }
}

function validateLevelUpSelections() {
  const container = getLevelUpSelections();
  if (!container) return true;
  const required = Array.from(container.querySelectorAll('select[data-required="true"]'));
  if (!required.length) return true;
  const missing = required.some(select => !String(select.value || '').trim());
  let classSkillMissing = false;
  if (container.dataset.classSkillRequired === 'true') {
    const limit = state.classSkillLimit;
    const classSet = state.classSkillSelections || new Set();
    if (Number.isFinite(limit) && classSet.size < limit) {
      classSkillMissing = true;
    }
  }
  if (!missing && !classSkillMissing) return true;
  const error = getLevelUpError();
  if (error) {
    error.textContent = 'Please make all required selections before closing.';
  }
  const card = getLevelUpModal()?.querySelector('.modal-card');
  if (card) {
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
  }
  return false;
}

function hasMissingRequiredSelections() {
  const featureChoices = getFeatureChoicesForLevel(getCurrentLevel(), { includeRefreshable: true });
  const missingFeature = featureChoices.some(choice => {
    const key = getFeatureChoiceKey(choice);
    const selected = state.featureSelections?.[key];
    const optionKey = typeof selected === 'string' ? selected : selected?.option;
    if (!optionKey) return true;
    const option = (choice.options || []).find(opt => opt.key === optionKey);
    const effects = option?.effects || {};
    const skillChoices = Array.isArray(effects.skill_choice) ? effects.skill_choice : [];
    if (skillChoices.length) {
      const skill = typeof selected === 'object' ? selected?.skill : '';
      if (!skill) return true;
    }
    const languageCount = Number(effects.language_choice || effects.languageChoice || 0);
    if (Number.isFinite(languageCount) && languageCount > 0) {
      const language = typeof selected === 'object' ? selected?.language : '';
      if (!language) return true;
    }
    const weaponCount = Number(effects.weapon_mastery || effects.weaponMastery || 0);
    if (Number.isFinite(weaponCount) && weaponCount > 0) {
      const weapons = Array.isArray(selected?.weapons) ? selected.weapons.filter(Boolean) : [];
      if (weapons.length < weaponCount) return true;
    }
    return false;
  });
  const subclassSelect = getSubclassSelect();
  const missingSubclass = subclassSelect
    && !subclassSelect.disabled
    && !String(subclassSelect.value || '').trim();
  const missingSpecies = !isSpeciesSelected();
  const missingBackground = !isBackgroundSelected();
  const missingLineage = isLineageRequired()
    && !String(getLineageSelect()?.value || '').trim();
  const languageCounts = getLanguageSelectionCounts();
  const missingLanguages = languageCounts.extraAllowed > 0
    && languageCounts.extraSelected < languageCounts.extraAllowed;
  const subclassEntry = getSelectedSubclassEntry();
  const subclassRequirement = subclassEntry ? parseSubclassRequirement(subclassEntry) : null;
  const subclassGateMissing = subclassEntry
    && Number.isFinite(subclassRequirement)
    && getCurrentLevel() < subclassRequirement;
  const classSkillValidation = validateSkillSelection({
    limit: state.classSkillLimit,
    allowedKeys: Array.from(state.classSkillAllowed || []),
    selectedKeys: Array.from(state.classSkillSelections || []),
  });
  const missingClassSkills = !classSkillValidation.ok;
  return missingFeature
    || missingSubclass
    || missingClassSkills
    || missingSpecies
    || missingBackground
    || missingLineage
    || missingLanguages
    || subclassGateMissing;
}

function getRefreshableFeatureChoices() {
  return getFeatureChoicesForLevel(getCurrentLevel(), { includeRefreshable: true })
    .filter(choice => (choice.options || []).some(option =>
      option?.effects && String(option.effects.refresh_on_long_rest).toLowerCase() === 'true'
    ));
}

function clearRefreshableFeatureSelections() {
  const refreshable = getRefreshableFeatureChoices();
  refreshable.forEach(choice => {
    const key = getFeatureChoiceKey(choice);
    if (key && state.featureSelections?.[key]) {
      delete state.featureSelections[key];
    }
  });
  updateFeatureSkillSelections();
  renderWeaponMasteryBox();
}

function updateFeatureSkillSelections() {
  state.featureSkillSelections = new Set();
  Object.values(state.featureSelections || {}).forEach(selection => {
    const skill = typeof selection === 'object' ? selection?.skill : null;
    if (skill) {
      state.featureSkillSelections.add(normalizeName(skill));
    }
  });
}

function getWeaponMasteryOptions() {
  const options = Array.isArray(state.weapons) ? state.weapons : [];
  if (!options.length) return [];
  const training = state.weaponTraining || getWeaponTrainingFromClass();
  const list = options.filter(item => {
    const category = String(item?.category || '').toLowerCase();
    if (!category) return true;
    const isSimple = category.includes('simple');
    const isMartial = category.includes('martial');
    const isMelee = category.includes('melee');
    const isRanged = category.includes('ranged');
    if (isSimple) {
      if (isMelee) return training.simpleMelee;
      if (isRanged) return training.simpleRanged;
      return training.simpleMelee || training.simpleRanged;
    }
    if (isMartial) {
      if (isMelee) return training.martialMelee;
      if (isRanged) return training.martialRanged;
      return training.martialMelee || training.martialRanged;
    }
    return true;
  });
  return list.map(item => item.name).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function maybePromptLevelSelections() {
  if (!hasMissingRequiredSelections()) return;
  const row = getClassProgressionRow();
  if (!row) return;
  const refreshable = getRefreshableFeatureChoices();
  if (refreshable.length) {
    showLevelUpModal(null, { ...row, __showRefreshable: true });
    return;
  }
  showLevelUpModal(null, row);
}

function parseCrValue(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const fractionMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
      return numerator / denominator;
    }
  }
  const numberMatch = text.match(/-?\d+(\.\d+)?/);
  if (numberMatch) {
    const value = Number(numberMatch[0]);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

function getWildShapeRules(level) {
  if (!Number.isFinite(level) || level < 2) {
    return { maxForms: 0, maxCr: null, flyAllowed: false };
  }
  if (level < 4) {
    return { maxForms: 4, maxCr: 0.25, flyAllowed: false };
  }
  if (level < 8) {
    return { maxForms: 6, maxCr: 0.5, flyAllowed: false };
  }
  return { maxForms: 8, maxCr: 1, flyAllowed: true };
}

function getWildShapeMaxUses() {
  const row = getClassProgressionRow();
  const value = Number(row?.wild_shape);
  return Number.isFinite(value) ? value : 0;
}

function normalizeCreatureName(value) {
  return normalizeItemName(value);
}

function getBeastFormsForWildShape(maxCr, flyAllowed) {
  const creatures = Array.isArray(state.creatures) ? state.creatures : [];
  return creatures.filter(creature => {
    const type = String(creature?.type || '').toLowerCase();
    if (!type.includes('beast')) return false;
    const crValue = parseCrValue(creature?.cr);
    if (Number.isFinite(maxCr) && Number.isFinite(crValue) && crValue > maxCr) return false;
    const speed = String(creature?.speed || '').toLowerCase();
    const hasFly = /fly/.test(speed);
    if (hasFly && !flyAllowed) return false;
    return true;
  });
}

function updateWildShapePanel() {
  const box = getWildShapeBox();
  if (!box) return;
  const classEntry = getSelectedClassEntry();
  const className = normalizeName(classEntry?.name || '');
  const level = getCurrentLevel();
  const maxUses = getWildShapeMaxUses();
  if (className !== 'druid' || maxUses <= 0) {
    box.style.display = 'none';
    const specialBox = getClassSpecialBox();
    if (specialBox) specialBox.style.display = 'none';
    return;
  }
  box.style.display = '';
  const specialBox = getClassSpecialBox();
  if (specialBox) specialBox.style.display = '';
  const rules = getWildShapeRules(level);
  const usesMax = getWildShapeMaxUses();
  const spentInput = getWildShapeSpentInput();
  const maxSpan = getWildShapeUsesMax();
  const remainingSpan = getWildShapeUsesRemaining();
  const tempHpSpan = getWildShapeTempHp();
  const maxCrSpan = getWildShapeMaxCr();
  const flySpan = getWildShapeFlyAllowed();
  if (maxSpan) maxSpan.textContent = String(usesMax);
  if (spentInput) {
    const maxValue = Number.isFinite(usesMax) ? usesMax : 0;
    const current = Math.max(0, Math.min(Number(state.wildShapeSpent) || 0, maxValue));
    state.wildShapeSpent = current;
    spentInput.value = String(current);
    spentInput.max = String(maxValue);
  }
  if (remainingSpan) {
    const remaining = Math.max(0, usesMax - (Number(state.wildShapeSpent) || 0));
    remainingSpan.textContent = String(remaining);
  }
  if (tempHpSpan) tempHpSpan.textContent = Number.isFinite(level) ? String(level) : '';
  if (maxCrSpan) maxCrSpan.textContent = Number.isFinite(rules.maxCr) ? String(rules.maxCr) : '—';
  if (flySpan) flySpan.textContent = rules.flyAllowed ? 'Yes' : 'No';

  const companionLabel = getWildCompanionActiveLabel();
  if (companionLabel) companionLabel.textContent = state.wildCompanionActive ? 'Active' : 'Inactive';
  const companionSource = getWildCompanionSourceSelect();
  if (companionSource) companionSource.value = state.wildCompanionSource || 'wild_shape';

  if (rules.maxForms <= 0) {
    state.wildShapeForms = [];
  } else if (state.wildShapeForms.length > rules.maxForms) {
    state.wildShapeForms = state.wildShapeForms.slice(0, rules.maxForms);
  }

  const available = getBeastFormsForWildShape(rules.maxCr, rules.flyAllowed);
  const formSelect = getWildShapeFormSelect();
  if (formSelect) {
    formSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Beast';
    formSelect.appendChild(placeholder);
    available.forEach(creature => {
      const name = String(creature?.name || '').trim();
      if (!name) return;
      const key = normalizeCreatureName(name);
      const option = document.createElement('option');
      option.value = key;
      option.textContent = `${name} (CR ${creature?.cr || '—'})`;
      formSelect.appendChild(option);
    });
  }

  renderWildShapeFormsTable(available, rules.maxForms);
}

function renderWildShapeFormsTable(available, maxForms) {
  const table = getWildShapeFormsTable();
  if (!table) return;
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const forms = Array.isArray(state.wildShapeForms) ? state.wildShapeForms : [];
  forms.forEach(key => {
    const creature = available.find(entry => normalizeCreatureName(entry?.name) === key);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${creature?.name || key}</td>
      <td>${creature?.cr || '—'}</td>
      <td>${/fly/i.test(String(creature?.speed || '')) ? 'Yes' : 'No'}</td>
      <td><button type="button" class="equip-btn" data-action="remove-wild-shape" data-item="${key}">Remove</button></td>
    `;
    tbody.appendChild(row);
  });
  const addButton = getWildShapeAddButton();
  if (addButton) {
    addButton.disabled = forms.length >= maxForms;
  }
  tbody.querySelectorAll('button[data-action="remove-wild-shape"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.item;
      state.wildShapeForms = (state.wildShapeForms || []).filter(item => item !== key);
      if (state.activeWildShapeForm === key) {
        state.activeWildShapeForm = null;
        state.isWildShaped = false;
        state.wildShapeAttacks = [];
        updateEquippedGearFromInventory();
      }
      updateWildShapePanel();
    });
  });
}

function getCreatureByKey(key) {
  const creatures = Array.isArray(state.creatures) ? state.creatures : [];
  return creatures.find(entry => normalizeCreatureName(entry?.name) === key) || null;
}

function parseCreatureAttacks(actionsText) {
  const attacks = [];
  const text = String(actionsText || '');
  const attackRegex = /([A-Z][^.]*)\.\s*(.*?Hit:\s*[^.]*\([^)]+\)\s*[A-Za-z]+\s*damage)/gis;
  let match = attackRegex.exec(text);
  while (match) {
    const name = match[1].trim();
    const body = match[2];
    const atkMatch = body.match(/(?:Attack Roll|Attack):\s*([+-]?\d+)/i);
    const hitMatch = body.match(/Hit:\s*[^()]*\(([^)]+)\)\s*([A-Za-z]+)\s*damage/i);
    if (atkMatch && hitMatch) {
      const atk = atkMatch[1].trim();
      const dice = hitMatch[1].trim();
      const dmgType = hitMatch[2].trim();
      attacks.push({
        name,
        atk: atk.startsWith('+') || atk.startsWith('-') ? atk : `+${atk}`,
        damage: `${dice} ${dmgType}`,
      });
    } else {
      console.warn('Unparsed creature attack', { name, body, actionsText: text });
    }
    match = attackRegex.exec(text);
  }
  return attacks;
}

function openWildShapeModal(availableForms, onConfirm) {
  const modal = getWildShapeModal();
  const select = getWildShapeModalSelect();
  const error = getWildShapeModalError();
  if (!modal || !select) return;
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Beast';
  select.appendChild(placeholder);
  availableForms.forEach(key => {
    const creature = getCreatureByKey(key);
    const option = document.createElement('option');
    option.value = key;
    option.textContent = creature?.name || key;
    select.appendChild(option);
  });
  if (error) error.textContent = '';
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  const confirm = getWildShapeModalConfirm();
  const cancel = getWildShapeModalCancel();
  const close = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    if (confirm) confirm.onclick = null;
    if (cancel) cancel.onclick = null;
  };
  if (cancel) {
    cancel.onclick = () => close();
  }
  if (confirm) {
    confirm.onclick = () => {
      const key = String(select.value || '').trim();
      if (!key) {
        if (error) error.textContent = 'Select a form to transform.';
        const card = modal.querySelector('.modal-card');
        if (card) {
          card.classList.remove('shake');
          void card.offsetWidth;
          card.classList.add('shake');
        }
        return;
      }
      close();
      if (typeof onConfirm === 'function') onConfirm(key);
    };
  }
}

function showLevelUpModal(prevRow, nextRow) {
  const modal = getLevelUpModal();
  const title = getLevelUpTitle();
  const list = getLevelUpChangesList();
  if (!modal || !list) return;
  const levelText = nextRow?.level ? `Level ${nextRow.level}` : 'Level Up';
  const titleText = nextRow?.__title ? nextRow.__title : `Now ${levelText}`;
  if (title) title.textContent = titleText;
  const changes = Array.isArray(nextRow?.__changes) ? nextRow.__changes : buildLevelUpChanges(prevRow, nextRow);
  list.innerHTML = '';
  if (!changes.length) {
    const item = document.createElement('li');
    item.textContent = 'No new progression entries found for this level.';
    list.appendChild(item);
  } else {
    changes.forEach(change => {
      const item = document.createElement('li');
      item.textContent = `${change.label}: ${change.before} → ${change.after}`;
      list.appendChild(item);
    });
  }
  const targetLevel = nextRow?.level ? Number(nextRow.level) : null;
  const includeRefreshable = Boolean(nextRow?.__showRefreshable);
  renderLevelUpSelections(
    getLevelUpSelections(),
    Number.isFinite(targetLevel) ? targetLevel : null,
    { includeRefreshable }
  );
  const error = getLevelUpError();
  if (error) error.textContent = '';
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function getSpellcastingAbilityKey() {
  const classEntry = getSelectedClassEntry();
  const raw = String(classEntry?.primary_ability || '').toLowerCase();
  if (raw.includes('strength')) return 'str';
  if (raw.includes('dex')) return 'dex';
  if (raw.includes('constitution')) return 'con';
  if (raw.includes('intelligence')) return 'int';
  if (raw.includes('wisdom')) return 'wis';
  if (raw.includes('charisma')) return 'cha';
  const fallbackByClass = {
    barbarian: '',
    bard: 'cha',
    cleric: 'wis',
    druid: 'wis',
    fighter: '',
    monk: 'wis',
    paladin: 'cha',
    ranger: 'wis',
    rogue: '',
    sorcerer: 'cha',
    warlock: 'cha',
    wizard: 'int',
  };
  const className = String(classEntry?.name || '').toLowerCase().trim();
  return fallbackByClass[className] || '';
}

function updateSpellcastingStats() {
  const abilityInput = getSpellcastingAbilityInput();
  const modInput = getSpellcastingModInput();
  const dcInput = getSpellSaveDcInput();
  const atkInput = getSpellAttackBonusInput();
  if (!abilityInput || !modInput || !dcInput || !atkInput) return;
  if (!state.canCastSpells) {
    abilityInput.value = '';
    modInput.value = '';
    dcInput.value = '';
    atkInput.value = '';
    const warning = getSpellcastingWarning();
    if (warning) {
      warning.textContent = getClassSpellcastingEligibility()
        ? 'Spellcasting disabled while wearing untrained armor.'
        : 'Spellcasting unavailable at this level.';
    }
    return;
  }
  const abilityKey = getSpellcastingAbilityKey();
  if (!abilityKey) {
    abilityInput.value = '';
    modInput.value = '';
    dcInput.value = '';
    atkInput.value = '';
    const warning = getSpellcastingWarning();
    if (warning) warning.textContent = '';
    return;
  }
  const abilityLabels = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma',
  };
  const score = Number(getAbilityInputs()[abilityKey]?.score?.value);
  const modValue = Number.isFinite(score) ? getModifierValue(score) : null;
  const profText = String(getProficiencyBonusSpan()?.textContent || '').trim();
  const profValue = Number(profText.replace('+', ''));
  const prof = Number.isFinite(profValue) ? profValue : 0;
  abilityInput.value = abilityLabels[abilityKey] || '';
  if (!Number.isFinite(modValue)) {
    modInput.value = '';
    dcInput.value = '';
    atkInput.value = '';
    const warning = getSpellcastingWarning();
    if (warning) warning.textContent = '';
    return;
  }
  modInput.value = modValue >= 0 ? `+${modValue}` : `${modValue}`;
  const dc = 8 + prof + modValue;
  const atk = prof + modValue;
  dcInput.value = String(dc);
  atkInput.value = atk >= 0 ? `+${atk}` : `${atk}`;
  const warning = getSpellcastingWarning();
  if (warning) warning.textContent = '';
}

function getClassSpellcastingEligibility() {
  const row = getClassProgressionRow();
  if (!row) return false;
  const cantrips = Number(row.cantrips);
  const prepared = Number(row.prepared_spells);
  if (Number.isFinite(cantrips) && cantrips > 0) return true;
  if (Number.isFinite(prepared) && prepared > 0) return true;
  if (Number.isFinite(Number(row.pact_magic_slots)) && Number(row.pact_magic_slots) > 0) return true;
  for (let i = 1; i <= 9; i += 1) {
    const value = Number(row[`spell_slots_level_${i}`] ?? row[`spell_slots_${i}`]);
    if (Number.isFinite(value) && value > 0) return true;
  }
  return false;
}

function updateSpellcastingEligibility() {
  state.canCastSpells = getClassSpellcastingEligibility();
}

function updateSpeciesTraits() {
  const box = getSpeciesTraitsBox();
  if (!box) return;
  const select = getSpeciesSelect();
  const chosen = String(select?.value || '').trim();
  if (!chosen) {
    box.value = '';
    return;
  }
  const species = state.species.find(entry =>
    normalizeKey(entry?.name) === normalizeKey(chosen)
    || normalizeKey(entry?.species_id) === normalizeKey(chosen)
  );
  box.value = String(species?.special_traits || '').trim();
}

function updateFeatsFromBackground() {
  const box = getFeatsBox();
  if (!box) return;
  const select = getBackgroundSelect();
  const chosen = String(select?.value || '').trim();
  if (!chosen) {
    box.value = '';
    return;
  }
  const background = state.backgrounds.find(entry =>
    normalizeKey(entry?.name) === normalizeKey(chosen)
  );
  box.value = String(background?.feat_granted || '').trim();
}

function getLanguageSources() {
  const backgroundSelect = getBackgroundSelect();
  const speciesSelect = getSpeciesSelect();
  const background = state.backgrounds.find(entry =>
    normalizeKey(entry?.name) === normalizeKey(backgroundSelect?.value)
  );
  const species = state.species.find(entry =>
    normalizeKey(entry?.name) === normalizeKey(speciesSelect?.value)
    || normalizeKey(entry?.species_id) === normalizeKey(speciesSelect?.value)
  );
  return { background, species };
}

function getDefaultSpeciesLanguages(speciesName) {
  const key = normalizeName(speciesName);
  if (!key) return [];
  const map = {
    aasimar: ['Celestial'],
    dragonborn: ['Draconic'],
    dwarf: ['Dwarvish'],
    elf: ['Elvish'],
    gnome: ['Gnomish'],
    goliath: ['Giant'],
    halfling: ['Halfling'],
    orc: ['Orc'],
    tiefling: ['Infernal'],
  };
  return map[key] || [];
}

function buildLanguageBaseAndCap({ background, species }) {
  const baseSet = new Set();
  let extra = 0;
  const entries = [background, species].filter(Boolean);
  entries.forEach(entry => {
    const base = entry?.language_info?.base || [];
    const count = Number(entry?.language_info?.count || 0);
    base.forEach(item => {
      const name = String(item || '').trim();
      if (name) baseSet.add(name);
    });
    if (Number.isFinite(count)) extra += count;
  });
  if (!baseSet.size) {
    entries.forEach(entry => {
      const raw = String(entry?.languages || '').trim();
      if (!raw) return;
      parseSkillList(raw).forEach(item => {
        const name = String(item || '').trim();
        if (name) baseSet.add(name);
      });
    });
  }
  if (!baseSet.size) {
    baseSet.add('Common');
    getDefaultSpeciesLanguages(species?.name || '').forEach(lang => baseSet.add(lang));
  }
  if (!Number.isFinite(extra) || extra < 0) extra = 0;
  if (extra === 0 && background) extra = 2;
  return { baseSet, extra };
}

function getLanguageSelectionCounts() {
  const { background, species } = getLanguageSources();
  const { baseSet, extra } = buildLanguageBaseAndCap({ background, species });
  const classGrants = getClassLanguageGrants();
  classGrants.forEach(item => baseSet.add(item));
  const featureLanguages = getFeatureLanguageSelections();
  featureLanguages.forEach(item => baseSet.add(item));
  const selected = new Set(readSelectedLanguagesFromBox());
  const extraSelected = Array.from(selected).filter(item => !baseSet.has(item));
  return {
    extraAllowed: Number.isFinite(extra) ? extra : 0,
    extraSelected: extraSelected.length,
  };
}
function getAllLanguages() {
  const standard = Array.isArray(state.standardLanguages)
    ? state.standardLanguages.map(row => String(row.language || '').trim()).filter(Boolean)
    : [];
  const rare = Array.isArray(state.rareLanguages)
    ? state.rareLanguages.map(row => String(row.language || '').trim()).filter(Boolean)
    : [];
  const all = Array.from(new Set([...standard, ...rare]));
  return all.sort((a, b) => a.localeCompare(b));
}

function getFeatureLanguageSelections() {
  const selections = new Set();
  Object.entries(state.featureSelections || {}).forEach(([key, selection]) => {
    const choice = (state.featureChoices || []).find(entry => getFeatureChoiceKey(entry) === key);
    if (!choice) return;
    const optionKey = typeof selection === 'string' ? selection : selection?.option;
    const option = (choice.options || []).find(opt => opt.key === optionKey);
    const effects = option?.effects || {};
    if (!effects.language_choice) return;
    const language = typeof selection?.language === 'string' ? selection.language.trim() : '';
    if (language) selections.add(language);
  });
  return selections;
}

function getClassLanguageGrants() {
  const row = getClassProgressionRow();
  const features = getClassFeaturesForLevel(getCurrentLevel());
  const featureText = features.join(', ');
  const grants = new Set();
  if (/druidic/i.test(featureText)) grants.add('Druidic');
  if (/thieves.?cant/i.test(featureText)) grants.add("Thieves' Cant");
  const classEntry = getSelectedClassEntry();
  const className = normalizeName(classEntry?.name || classEntry?.class_id || '');
  if (className.includes('rogue') && getCurrentLevel() >= 1) {
    grants.add("Thieves' Cant");
  }
  return grants;
}

function readSelectedLanguagesFromBox() {
  const box = getLanguagesBox();
  if (!box) return [];
  return Array.from(box.querySelectorAll('input[type="checkbox"]'))
    .filter(input => input.checked)
    .map(input => String(input.value || '').trim())
    .filter(Boolean);
}

function renderLanguagesSelection(preselected = []) {
  const box = getLanguagesBox();
  if (!box) return;
  const { background, species } = getLanguageSources();
  const { baseSet, extra } = buildLanguageBaseAndCap({ background, species });
  const classGrants = getClassLanguageGrants();
  classGrants.forEach(item => baseSet.add(item));
  const featureLanguages = getFeatureLanguageSelections();
  featureLanguages.forEach(item => baseSet.add(item));
  const allLanguages = getAllLanguages();
  baseSet.forEach(language => {
    if (!allLanguages.includes(language)) allLanguages.push(language);
  });
  allLanguages.sort((a, b) => a.localeCompare(b));
  const preferred = new Set(preselected.map(item => String(item || '').trim()).filter(Boolean));
  const extraSet = new Set();
  preferred.forEach(name => {
    if (!baseSet.has(name)) extraSet.add(name);
  });
  const extraCount = Number.isFinite(extra) ? extra : 0;
  const limitedExtras = Array.from(extraSet).slice(0, extraCount);
  const selectedExtras = new Set(limitedExtras);
  box.innerHTML = '';
  allLanguages.forEach(language => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = language;
    const isBase = baseSet.has(language);
    const isSelected = isBase || selectedExtras.has(language);
    input.checked = isSelected;
    if (isBase) {
      input.disabled = true;
    }
    input.addEventListener('change', () => {
      if (input.checked) {
        if (selectedExtras.size >= extraCount) {
          input.checked = false;
          return;
        }
        selectedExtras.add(language);
      } else {
        selectedExtras.delete(language);
      }
      box.querySelectorAll('input[type="checkbox"]').forEach(boxInput => {
        const name = String(boxInput.value || '');
        if (baseSet.has(name)) return;
        if (!boxInput.checked && selectedExtras.size >= extraCount) {
          boxInput.disabled = true;
        } else {
          boxInput.disabled = false;
        }
      });
    });
    label.appendChild(input);
    label.appendChild(document.createTextNode(language));
    box.appendChild(label);
  });
  box.querySelectorAll('input[type="checkbox"]').forEach(boxInput => {
    const name = String(boxInput.value || '');
    if (baseSet.has(name)) return;
    if (!boxInput.checked && selectedExtras.size >= extraCount) {
      boxInput.disabled = true;
    }
  });
}

function getAbilityInputs() {
  return {
    str: {
      score: document.getElementById('strength-score'),
      mod: document.getElementById('strength-mod'),
    },
    dex: {
      score: document.getElementById('dexterity-score'),
      mod: document.getElementById('dexterity-mod'),
    },
    con: {
      score: document.getElementById('constitution-score'),
      mod: document.getElementById('constitution-mod'),
    },
    int: {
      score: document.getElementById('intelligence-score'),
      mod: document.getElementById('intelligence-mod'),
    },
    wis: {
      score: document.getElementById('wisdom-score'),
      mod: document.getElementById('wisdom-mod'),
    },
    cha: {
      score: document.getElementById('charisma-score'),
      mod: document.getElementById('charisma-mod'),
    },
  };
}

function getAbilityMethodSelect() {
  return document.getElementById('ability-method-select');
}

function getAbilityBonusPlus2Select() {
  return document.getElementById('ability-bonus-plus2');
}

function getAbilityBonusPlus1Select() {
  return document.getElementById('ability-bonus-plus1');
}

function getPointBuyRemainingEl() {
  return document.getElementById('point-buy-remaining');
}

function getPointBuyRow() {
  return document.getElementById('point-buy-row');
}

function getAbilityScoreStatusEl() {
  return document.getElementById('ability-score-status');
}

function getBackgroundSelect() {
  return document.getElementById('background-select');
}

function getSpeciesSelect() {
  return document.getElementById('species-select');
}

function getLineageSelect() {
  return document.getElementById('lineage-select');
}

function getLineageGroup() {
  return document.getElementById('lineage-group');
}

function getSkillCheckboxMap() {
  const map = new Map();
  document.querySelectorAll('.skill-row').forEach(row => {
    const input = row.querySelector('input[type="checkbox"]');
    if (!input) return;
    const label = String(row.textContent || '').trim();
    const key = normalizeName(label);
    if (key) map.set(key, input);
  });
  return map;
}

function getSaveCheckboxMap() {
  const map = new Map();
  document.querySelectorAll('.ability-box').forEach(box => {
    const abilityLabel = box.querySelector('label');
    const saveRow = box.querySelector('.save-row input[type="checkbox"]');
    if (!abilityLabel || !saveRow) return;
    const key = normalizeName(abilityLabel.textContent);
    if (key) map.set(key, saveRow);
  });
  return map;
}

function parseSkillList(value) {
  return String(value || '')
    .split(/,|\band\b|\bor\b/gi)
    .map(item => item.trim())
    .filter(Boolean);
}

function parseSavingThrows(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  return parseSkillList(value);
}

function updateSavingThrowsFromClass() {
  const classEntry = getSelectedClassEntry();
  const saves = parseSavingThrows(classEntry?.saving_throws);
  const features = getClassFeaturesForLevel(getCurrentLevel());
  if (features.some(feature => /slippery\s+mind/i.test(feature))) {
    saves.push('Wisdom', 'Charisma');
  }
  const saveMap = getSaveCheckboxMap();
  saveMap.forEach(input => {
    input.checked = false;
    input.disabled = true;
  });
  saves.forEach(save => {
    const input = saveMap.get(normalizeName(save));
    if (input) input.checked = true;
  });
}

function parseClassSkillChoices(text, allKeys) {
  const raw = String(text || '').trim();
  if (!raw) return { limit: null, allowedKeys: [] };
  const match = raw.match(/choose\s+(\d+)/i);
  const limit = match ? Number(match[1]) : null;
  const colonIndex = raw.indexOf(':');
  let allowedKeys = [];
  if (colonIndex >= 0) {
    const list = parseSkillList(raw.slice(colonIndex + 1));
    allowedKeys = list.map(item => normalizeName(item)).filter(Boolean);
  } else if (match && /any/i.test(raw)) {
    allowedKeys = allKeys.slice();
  } else {
    const list = parseSkillList(raw);
    allowedKeys = list.map(item => normalizeName(item)).filter(Boolean);
  }
  return {
    limit: Number.isFinite(limit) ? limit : (allowedKeys.length ? allowedKeys.length : null),
    allowedKeys,
  };
}

function deriveClassSkillChoices(classEntry, allKeys) {
  if (!classEntry) return { limit: null, allowedKeys: [] };
  if (classEntry.skill_choices) {
    return parseClassSkillChoices(classEntry.skill_choices, allKeys);
  }
  const skillsChoose = classEntry?.proficiencies?.skills_choose || classEntry?.proficiencies?.skillsChoose;
  if (skillsChoose && Array.isArray(skillsChoose.from)) {
    const allowedKeys = skillsChoose.from.map(item => normalizeName(item)).filter(Boolean);
    const count = Number(skillsChoose.count);
    const limit = Number.isFinite(count) ? count : (allowedKeys.length ? allowedKeys.length : null);
    return { limit, allowedKeys };
  }
  return { limit: null, allowedKeys: [] };
}

function validateSkillSelection({ limit, allowedKeys, selectedKeys }) {
  const allowedSet = new Set(Array.isArray(allowedKeys) ? allowedKeys : []);
  const selected = new Set(Array.isArray(selectedKeys) ? selectedKeys : []);
  const hasLimit = Number.isFinite(limit) && limit >= 0;
  if (!hasLimit) return { ok: true, message: '' };
  if (allowedSet.size && Array.from(selected).some(key => !allowedSet.has(key))) {
    return { ok: false, message: 'Selected skills must be from the allowed list.' };
  }
  if (limit === 0 && selected.size > 0) {
    return { ok: false, message: 'No class skill selections are allowed.' };
  }
  if (selected.size < limit) {
    return { ok: false, message: `Choose ${limit} class skill${limit === 1 ? '' : 's'}.` };
  }
  if (selected.size > limit) {
    return { ok: false, message: `Choose only ${limit} class skill${limit === 1 ? '' : 's'}.` };
  }
  return { ok: true, message: '' };
}

function updateBackgroundSkillSelections() {
  const select = getBackgroundSelect();
  if (!select) return new Set();
  const chosen = String(select.value || '').trim();
  const background = state.backgrounds.find(entry =>
    normalizeKey(entry?.name) === normalizeKey(chosen)
  );
  if (!background?.skill_proficiencies) return new Set();
  const skills = parseSkillList(background.skill_proficiencies)
    .map(skill => normalizeName(skill))
    .filter(Boolean);
  return new Set(skills);
}

function updateClassSkillConfig(resetSelections = false) {
  const classEntry = getSelectedClassEntry();
  const skillMap = getSkillCheckboxMap();
  const allKeys = Array.from(skillMap.keys());
  const parsed = deriveClassSkillChoices(classEntry, allKeys);
  const inferredLimit = Number.isFinite(parsed.limit) ? parsed.limit : null;
  const allowedKeys = parsed.allowedKeys || [];
  const limit = (classEntry && !allowedKeys.length && inferredLimit === null) ? 0 : inferredLimit;
  state.classSkillLimit = limit;
  state.classSkillAllowed = new Set(allowedKeys);
  if (resetSelections || !(state.classSkillSelections instanceof Set)) {
    state.classSkillSelections = new Set();
  }
  const backgroundSet = state.backgroundSkillSelections || new Set();
  const featureSet = state.featureSkillSelections || new Set();
  if (state.classSkillAllowed.size) {
    for (const key of Array.from(state.classSkillSelections)) {
      if (!state.classSkillAllowed.has(key)) state.classSkillSelections.delete(key);
    }
  }
  for (const key of Array.from(state.classSkillSelections)) {
    if (backgroundSet.has(key) || featureSet.has(key)) {
      state.classSkillSelections.delete(key);
    }
  }
  if (Number.isFinite(state.classSkillLimit) && state.classSkillLimit >= 0) {
    const trimmed = Array.from(state.classSkillSelections).slice(0, state.classSkillLimit);
    state.classSkillSelections = new Set(trimmed);
  }
}

function applySkillSelections() {
  const skillMap = getSkillCheckboxMap();
  const backgroundSet = state.backgroundSkillSelections || new Set();
  const featureSet = state.featureSkillSelections || new Set();
  const classSet = state.classSkillSelections || new Set();
  const allowedSet = state.classSkillAllowed || new Set();
  const limit = state.classSkillLimit;
  const classCount = classSet.size;
  skillMap.forEach((input, key) => {
    input.checked = backgroundSet.has(key) || featureSet.has(key) || classSet.has(key);
  });
  const hasClassChoices = Number.isFinite(limit) && limit > 0 && allowedSet.size;
  if (!hasClassChoices) {
    skillMap.forEach((input, key) => {
      if (backgroundSet.has(key) || featureSet.has(key)) {
        input.disabled = true;
        return;
      }
      input.disabled = true;
    });
    return;
  }
  skillMap.forEach((input, key) => {
    const isBackground = backgroundSet.has(key);
    const isFeature = featureSet.has(key);
    const isAllowed = !allowedSet.size || allowedSet.has(key);
    const isSelected = classSet.has(key);
    if (isBackground) {
      input.disabled = true;
      return;
    }
    if (isFeature) {
      input.disabled = true;
      return;
    }
    if (!isAllowed) {
      input.disabled = true;
      return;
    }
    if (!isSelected && Number.isFinite(limit) && classCount >= limit) {
      input.disabled = true;
      return;
    }
    input.disabled = false;
  });
}

function refreshSkillProficiencies(resetClassSelections = false) {
  state.backgroundSkillSelections = updateBackgroundSkillSelections();
  updateFeatureSkillSelections();
  updateClassSkillConfig(resetClassSelections);
  applySkillSelections();
}

function handleSkillToggle(input) {
  const row = input.closest('.skill-row');
  const key = normalizeName(String(row?.textContent || '').trim());
  if (!key) return;
  const backgroundSet = state.backgroundSkillSelections || new Set();
  if (backgroundSet.has(key) && !input.checked) {
    input.checked = true;
    return;
  }
  const allowedSet = state.classSkillAllowed || new Set();
  if (allowedSet.size && !allowedSet.has(key)) {
    input.checked = false;
    return;
  }
  if (!(state.classSkillSelections instanceof Set)) {
    state.classSkillSelections = new Set();
  }
  if (input.checked) {
    const limit = state.classSkillLimit;
    if (!state.classSkillSelections.has(key)
      && Number.isFinite(limit)
      && state.classSkillSelections.size >= limit) {
      input.checked = false;
      return;
    }
    state.classSkillSelections.add(key);
  } else {
    state.classSkillSelections.delete(key);
  }
  applySkillSelections();
}

function buildLevelOptions() {
  const select = getLevelSelect();
  if (!select) return;
  select.innerHTML = '';
  for (let i = 0; i <= 20; i += 1) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = String(i);
    select.appendChild(option);
  }
}

function getCurrentLevel() {
  const select = getLevelSelect();
  if (!select) return 0;
  const parsed = Number(select.value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(20, Math.floor(parsed));
}

function setLevelFromProfile(value) {
  const select = getLevelSelect();
  if (!select) return;
  const normalized = Number(value);
  const candidate = Number.isFinite(normalized) && normalized >= 0 ? Math.min(20, Math.floor(normalized)) : 0;
  select.value = String(candidate);
}

function renderClassOptions() {
  const select = getClassSelect();
  if (!select) return;
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choose a class';
  placeholder.selected = true;
  select.appendChild(placeholder);
  state.classes.forEach(entry => {
    const classId = entry.class_id || entry.class || entry.name;
    if (!classId) return;
    const option = document.createElement('option');
    option.value = classId;
    option.textContent = entry.name || classId;
    select.appendChild(option);
  });
}

function parseSubclassRequirement(entry) {
  const raw = entry.level_gained ?? entry.level ?? entry.level_required ?? entry.required_level ?? 1;
  const value = Number(raw);
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

function buildSubclassClassKeys(entry) {
  const keys = new Set();
  ['class_id', 'class', 'class_name'].forEach(field => {
    const candidate = entry?.[field];
    if (!candidate) return;
    const normalized = normalizeKey(candidate);
    if (normalized) keys.add(normalized);
    if (normalized.startsWith('CLS_')) {
      const stripped = normalized.slice(4);
      if (stripped) keys.add(stripped);
    }
  });
  if (!keys.size) {
    const fallback = normalizeKey(entry?.class || entry?.class_name || entry?.name);
    if (fallback) keys.add(fallback);
  }
  return Array.from(keys);
}

function renderSubclassOptions() {
  const classSelect = getClassSelect();
  const subclassSelect = getSubclassSelect();
  if (!classSelect || !subclassSelect) return;
  const currentValue = String(subclassSelect.value || '').trim();
  const level = getCurrentLevel();
  const targetKey = normalizeKey(classSelect.value);
  subclassSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choose a subclass';
  placeholder.selected = true;
  subclassSelect.appendChild(placeholder);
  subclassSelect.disabled = true;
  if (!targetKey) return;
  const matchingSubclasses = state.subclasses.filter(entry =>
    Array.isArray(entry.__classKeys) && entry.__classKeys.includes(targetKey)
  );
  const available = matchingSubclasses.filter(entry => level >= entry.__levelRequirement);
  if (!available.length) {
    const unlockLevels = matchingSubclasses
      .map(entry => entry.__levelRequirement)
      .filter(req => req > level);
    console.log('subclass check', { targetKey, level, unlockLevels, total: state.subclasses.length });
    const message = unlockLevels.length
      ? `Subclasses unlock at level ${Math.min(...unlockLevels)}`
      : 'No subclass options for this class';
    const notice = document.createElement('option');
    notice.value = '';
    notice.textContent = message;
    subclassSelect.appendChild(notice);
    return;
  }
  available.forEach(entry => {
    const option = document.createElement('option');
    option.value = entry.name;
    option.textContent = entry.name;
    subclassSelect.appendChild(option);
  });
  subclassSelect.disabled = false;
  if (currentValue) {
    const match = available.find(entry => normalizeKey(entry.name) === normalizeKey(currentValue));
    if (match) subclassSelect.value = match.name;
  }
}

function renderBackgroundOptions() {
  const select = getBackgroundSelect();
  if (!select) return;
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choose a background';
  placeholder.selected = true;
  select.appendChild(placeholder);
  const seen = new Set();
  state.backgrounds.forEach(entry => {
    const name = String(entry?.name || '').trim();
    if (!name) return;
    const key = normalizeKey(name);
    if (seen.has(key)) return;
    seen.add(key);
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

function renderSpeciesOptions() {
  const select = getSpeciesSelect();
  if (!select) return;
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choose a species';
  placeholder.selected = true;
  select.appendChild(placeholder);
  const seen = new Set();
  state.species.forEach(entry => {
    const name = String(entry?.name || '').trim();
    if (!name) return;
    const key = normalizeKey(name);
    if (seen.has(key)) return;
    seen.add(key);
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

function getSelectedSpeciesId() {
  const select = getSpeciesSelect();
  if (!select) return '';
  const normalized = normalizeKey(select.value);
  if (!normalized) return '';
  const byId = state.species.find(entry => normalizeKey(entry?.species_id) === normalized);
  if (byId?.species_id) return byId.species_id;
  const byName = state.species.find(entry => normalizeKey(entry?.name) === normalized);
  return byName?.species_id || '';
}

function renderLineageOptions() {
  const select = getLineageSelect();
  const group = getLineageGroup();
  const grid = getCharDetailsGrid();
  if (!select || !group) return;
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choose a lineage';
  placeholder.selected = true;
  select.appendChild(placeholder);
  const speciesId = getSelectedSpeciesId();
  const matching = state.lineages.filter(entry =>
    normalizeKey(entry?.species_id) === normalizeKey(speciesId)
  );
  if (!speciesId || !matching.length) {
    group.hidden = true;
    select.disabled = true;
    group.style.display = 'none';
    select.value = '';
    if (grid) grid.classList.add('single-row');
    return;
  }
  const seen = new Set();
  matching.forEach(entry => {
    const name = String(entry?.name || '').trim();
    if (!name) return;
    const key = normalizeKey(name);
    if (seen.has(key)) return;
    seen.add(key);
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
  group.hidden = false;
  select.disabled = false;
  group.style.display = '';
  if (grid) grid.classList.remove('single-row');
}

function parseStatScore(statsText, key) {
  const raw = String(statsText || '').toUpperCase();
  const match = raw.match(new RegExp(`${key}\\s*([0-9]{1,2})`));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function formatModifier(score) {
  if (!Number.isFinite(score)) return '';
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function getModifierValue(score) {
  if (!Number.isFinite(score)) return null;
  return Math.floor((score - 10) / 2);
}

function normalizeItemName(value) {
  return normalizeName(String(value || '').replace(/\(.*?\)/g, ''));
}

function extractParenthetical(value) {
  const match = String(value || '').match(/\(([^)]+)\)/);
  return match ? match[1].trim() : '';
}

function setAbilityScore(key, score) {
  const inputs = getAbilityInputs()[key];
  if (!inputs?.score || !inputs?.mod) return;
  if (!Number.isFinite(score)) {
    inputs.score.value = '';
    inputs.mod.value = '';
    return;
  }
  inputs.score.value = String(score);
  inputs.mod.value = formatModifier(score);
  if (key === 'dex') {
    updateInitiativeScore();
    updateArmorClass();
  }
  if (key === 'con') {
    updateHitPoints();
  }
  updateSpellcastingStats();
  updateEquippedGearFromInventory();
}

function getSelectedClassEntry() {
  const classSelect = getClassSelect();
  if (!classSelect) return null;
  const selected = normalizeKey(classSelect.value);
  if (!selected) return null;
  const byId = state.classes.find(entry => normalizeKey(entry?.class_id) === selected);
  if (byId) return byId;
  const byName = state.classes.find(entry => normalizeKey(entry?.name) === selected);
  return byName || null;
}

function hydrateStandardArrayFallback() {
  const hasData = state.standardArrayByClass && Object.keys(state.standardArrayByClass).length > 0;
  if (hasData) return;
  state.standardArrayByClass = { ...STANDARD_ARRAY_BY_CLASS_FALLBACK };
  state.standardArrayByClassNormalized = Object.entries(state.standardArrayByClass).reduce((acc, [name, values]) => {
    acc[normalizeName(name)] = values;
    return acc;
  }, {});
  const byId = {};
  (state.classes || []).forEach(entry => {
    const nameKey = normalizeName(entry?.name || '');
    if (!nameKey) return;
    const values = state.standardArrayByClassNormalized?.[nameKey];
    if (!values) return;
    if (entry?.class_id) byId[entry.class_id] = values;
  });
  state.standardArrayByClassId = byId;
}

function getStandardArrayForClass() {
  hydrateStandardArrayFallback();
  const classSelect = getClassSelect();
  if (!classSelect) return [15, 14, 13, 12, 10, 8];
  const rawValue = String(classSelect.value || '').trim();
  if (!rawValue) return [15, 14, 13, 12, 10, 8];
  const byId = state.standardArrayByClassId?.[rawValue];
  if (byId) return byId;
  const entry = getSelectedClassEntry();
  const nameKey = normalizeName(entry?.name || rawValue);
  return (
    state.standardArrayByClassNormalized?.[nameKey]
    || state.standardArrayByClass?.[entry?.name]
    || state.standardArrayByClass?.[rawValue]
    || (Array.isArray(state.standardArrayGlobal) && state.standardArrayGlobal.length
      ? state.standardArrayGlobal
      : [15, 14, 13, 12, 10, 8])
  );
}

function getHitDieForClass() {
  const classEntry = getSelectedClassEntry();
  const normalized = normalizeName(classEntry?.name || '');
  const normalizedMatch = state.normalizedClasses.find(entry =>
    normalizeName(entry?.name) === normalized
  );
  return normalizedMatch?.hit_die || '';
}

function parseHitDie(hitDie) {
  const match = String(hitDie || '').match(/d(\d+)/i);
  if (!match) return null;
  const sides = Number(match[1]);
  return Number.isFinite(sides) ? sides : null;
}

function calculateMaxHp(level, hitDie, conMod) {
  if (!Number.isFinite(level) || level < 1 || !Number.isFinite(hitDie)) return null;
  const first = hitDie + conMod;
  const avg = Math.floor(hitDie / 2) + 1 + conMod;
  if (level === 1) return first;
  return first + (level - 1) * avg;
}

function updateHitPoints() {
  const maxHpInput = getMaxHpInput();
  if (!maxHpInput) return;
  const level = getCurrentLevel();
  const hitDie = parseHitDie(getHitDieForClass());
  const conScore = Number(getAbilityInputs().con?.score?.value);
  const conMod = Number.isFinite(conScore) ? getModifierValue(conScore) : 0;
  if (!Number.isFinite(hitDie)) {
    maxHpInput.value = '';
    return;
  }
  const total = calculateMaxHp(level, hitDie, conMod);
  maxHpInput.value = Number.isFinite(total) ? String(total) : '';
}

function updateHitDiceTotal() {
  const totalInput = getHitDiceTotalInput();
  const spentInput = getHitDiceSpentInput();
  if (!totalInput) return;
  const level = getCurrentLevel();
  const hitDie = parseHitDie(getHitDieForClass());
  if (!Number.isFinite(hitDie) || !Number.isFinite(level)) {
    totalInput.value = '';
    if (spentInput) spentInput.value = '';
    return;
  }
  totalInput.value = `${level}d${hitDie}`;
  if (spentInput) {
    const spent = Number(spentInput.value);
    if (Number.isFinite(spent) && spent > level) {
      spentInput.value = String(level);
    }
  }
}

function updateAbilityScoreAvailability() {
  const abilityInputs = getAbilityInputs();
  const enabled = isSpeciesSelected() && isBackgroundSelected();
  Object.values(abilityInputs).forEach(inputs => {
    if (!inputs?.score) return;
    inputs.score.disabled = !enabled;
  });
  const methodSelect = getAbilityMethodSelect();
  if (methodSelect) methodSelect.disabled = !enabled;
  const plus2Select = getAbilityBonusPlus2Select();
  const plus1Select = getAbilityBonusPlus1Select();
  if (plus2Select) plus2Select.disabled = !enabled;
  if (plus1Select) plus1Select.disabled = !enabled;
}

function getAbilityMethod() {
  const select = getAbilityMethodSelect();
  return String(select?.value || state.abilityMethod || 'standard').trim();
}

function setAbilityMethod(value) {
  const method = String(value || 'standard').trim();
  state.abilityMethod = method || 'standard';
  const select = getAbilityMethodSelect();
  if (select) select.value = state.abilityMethod;
  applyStandardArrayForClass();
  updateAbilityScoreStatus();
}

function getAbilityBonusSelections() {
  const plus2 = String(getAbilityBonusPlus2Select()?.value || '').trim();
  const plus1 = String(getAbilityBonusPlus1Select()?.value || '').trim();
  return { plus2, plus1 };
}

function getAbilityBonusMap() {
  const selections = getAbilityBonusSelections();
  const map = {};
  if (selections.plus2) map[selections.plus2] = (map[selections.plus2] || 0) + 2;
  if (selections.plus1) map[selections.plus1] = (map[selections.plus1] || 0) + 1;
  return map;
}

function getAbilityScoresTotal() {
  const inputs = getAbilityInputs();
  return ABILITY_KEYS.reduce((acc, key) => {
    const value = Number(inputs[key]?.score?.value);
    acc[key] = Number.isFinite(value) ? value : null;
    return acc;
  }, {});
}

function areAbilityScoresEmpty() {
  const totals = getAbilityScoresTotal();
  return ABILITY_KEYS.every(key => !Number.isFinite(totals[key]));
}

function getAbilityScoresBase() {
  const totals = getAbilityScoresTotal();
  const bonuses = getAbilityBonusMap();
  const base = {};
  ABILITY_KEYS.forEach(key => {
    const total = totals[key];
    const bonus = bonuses[key] || 0;
    base[key] = Number.isFinite(total) ? total - bonus : null;
  });
  return base;
}

function getPointBuyCostTable() {
  const table = state.pointBuyCosts || {};
  const keys = Object.keys(table);
  if (keys.length) return table;
  return {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9,
  };
}

function getStandardArrayValues() {
  const array = getStandardArrayForClass();
  if (Array.isArray(array)) return array.map(Number).filter(Number.isFinite);
  if (array && typeof array === 'object') {
    const values = ABILITY_KEYS.map(key => Number(array[key]));
    if (values.every(Number.isFinite)) return values;
  }
  return [15, 14, 13, 12, 10, 8];
}

function validateAbilityScores() {
  const method = getAbilityMethod();
  const totals = getAbilityScoresTotal();
  const base = getAbilityScoresBase();
  const plus2 = getAbilityBonusPlus2Select()?.value || '';
  const plus1 = getAbilityBonusPlus1Select()?.value || '';
  const backgroundSelect = getBackgroundSelect();
  const backgroundName = String(backgroundSelect?.value || '').trim();
  const background = state.backgrounds.find(entry =>
    normalizeKey(entry?.name) === normalizeKey(backgroundName)
  );
  const requiresBonus = Array.isArray(background?.ability_scores) && background.ability_scores.length > 0;
  const allowedBonuses = (background?.ability_scores || [])
    .map(abilityKeyFromLabel)
    .filter(Boolean);
  if (requiresBonus && (!plus2 || !plus1)) {
    return { ok: false, message: 'Select background ability score bonuses.' };
  }
  if (plus2 && plus1 && plus2 === plus1) {
    return { ok: false, message: 'Background ability bonuses must be different.' };
  }
  if (requiresBonus && allowedBonuses.length) {
    if (plus2 && !allowedBonuses.includes(plus2)) {
      return { ok: false, message: 'Background +2 must be one of the allowed abilities.' };
    }
    if (plus1 && !allowedBonuses.includes(plus1)) {
      return { ok: false, message: 'Background +1 must be one of the allowed abilities.' };
    }
  }
  for (const key of ABILITY_KEYS) {
    const total = totals[key];
    if (!Number.isFinite(total)) {
      return { ok: false, message: 'Enter all ability scores.' };
    }
    if (total > 20) {
      return { ok: false, message: 'Ability scores can’t exceed 20 at level 1.' };
    }
  }
  if (method === 'standard') {
    const standard = getStandardArrayValues().slice().sort((a, b) => a - b).join(',');
    const values = ABILITY_KEYS.map(key => base[key]).filter(Number.isFinite).sort((a, b) => a - b).join(',');
    if (values !== standard) {
      return { ok: false, message: 'Ability scores must match the Standard Array after bonuses.' };
    }
  } else if (method === 'point_buy') {
    const costs = getPointBuyCostTable();
    let totalCost = 0;
    for (const key of ABILITY_KEYS) {
      const score = base[key];
      if (!Number.isFinite(score)) {
        return { ok: false, message: 'Enter all ability scores.' };
      }
      if (score < 8 || score > 15) {
        return { ok: false, message: 'Point Buy scores must be between 8 and 15 before bonuses.' };
      }
      const cost = Number(costs[String(score)]);
      if (!Number.isFinite(cost)) {
        return { ok: false, message: 'Point Buy scores must be between 8 and 15.' };
      }
      totalCost += cost;
    }
    if (totalCost > 27) {
      return { ok: false, message: 'Point Buy exceeds 27 points.' };
    }
  } else {
    for (const key of ABILITY_KEYS) {
      const score = base[key];
      if (!Number.isFinite(score)) {
        return { ok: false, message: 'Enter all ability scores.' };
      }
      if (score < 3) {
        return { ok: false, message: 'Ability scores must be 3 or higher.' };
      }
    }
  }
  return { ok: true, message: '' };
}

function updateAbilityScoreStatus() {
  const statusEl = getAbilityScoreStatusEl();
  const remainingEl = getPointBuyRemainingEl();
  const pointBuyRow = getPointBuyRow();
  const method = getAbilityMethod();
  if (pointBuyRow) {
    pointBuyRow.style.display = method === 'point_buy' ? 'flex' : 'none';
  }
  if (remainingEl) {
    remainingEl.textContent = '';
  }
  if (statusEl) statusEl.textContent = '';
  if (method !== 'point_buy') {
    if (remainingEl) remainingEl.textContent = '';
  } else {
    const costs = getPointBuyCostTable();
    const base = getAbilityScoresBase();
    let totalCost = 0;
    let hasInvalid = false;
    ABILITY_KEYS.forEach(key => {
      const score = base[key];
      if (!Number.isFinite(score)) {
        hasInvalid = true;
        return;
      }
      const cost = Number(costs[String(score)]);
      if (!Number.isFinite(cost)) {
        hasInvalid = true;
        return;
      }
      totalCost += cost;
    });
    const remaining = 27 - totalCost;
    if (remainingEl) remainingEl.textContent = Number.isFinite(remaining) ? String(remaining) : '';
    if (statusEl && hasInvalid) {
      statusEl.textContent = 'Point Buy scores must be 8–15 before bonuses.';
    }
  }
  const totals = getAbilityScoresTotal();
  const hasAny = Object.values(totals).some(value => Number.isFinite(value));
  if (!hasAny) {
    if (statusEl) statusEl.textContent = '';
    return;
  }
  const validation = validateAbilityScores();
  if (statusEl && !validation.ok) {
    statusEl.textContent = validation.message;
  }
}

function renderAbilityBonusOptions() {
  const plus2Select = getAbilityBonusPlus2Select();
  const plus1Select = getAbilityBonusPlus1Select();
  if (!plus2Select || !plus1Select) return;
  const backgroundSelect = getBackgroundSelect();
  const chosen = String(backgroundSelect?.value || '').trim();
  const background = state.backgrounds.find(entry =>
    normalizeKey(entry?.name) === normalizeKey(chosen)
  );
  const allowed = (background?.ability_scores || []).map(abilityKeyFromLabel).filter(Boolean);
  const options = allowed.length ? allowed : ABILITY_KEYS;
  const createOptions = select => {
    const prev = String(select.value || '').trim();
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select ability';
    select.appendChild(placeholder);
    options.forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = ABILITY_LABELS[key] || key.toUpperCase();
      select.appendChild(option);
    });
    if (options.includes(prev)) {
      select.value = prev;
    }
  };
  createOptions(plus2Select);
  createOptions(plus1Select);
  updateAbilityBonusSelectionState();
  if (getAbilityMethod() === 'standard' && areAbilityScoresEmpty()) {
    applyStandardArrayForClass();
  }
  updateAbilityScoreStatus();
}

function updateAbilityBonusSelectionState() {
  const plus2Select = getAbilityBonusPlus2Select();
  const plus1Select = getAbilityBonusPlus1Select();
  if (!plus2Select || !plus1Select) return;
  const plus2 = String(plus2Select.value || '').trim();
  const plus1 = String(plus1Select.value || '').trim();
  Array.from(plus2Select.options).forEach(option => {
    const value = String(option.value || '').trim();
    option.disabled = Boolean(value && value === plus1);
  });
  Array.from(plus1Select.options).forEach(option => {
    const value = String(option.value || '').trim();
    option.disabled = Boolean(value && value === plus2);
  });
}

function populateAttackNames(names, force = false) {
  const rows = getAttackRowInputs();
  if (!rows.length) return;
  const hasValues = rows.some(row => row?.name?.value?.trim());
  if (hasValues && !force) return;
  rows.forEach((row, idx) => {
    if (!row?.name) return;
    row.name.value = names[idx] || '';
  });
}

function getWeaponRowByKey(key) {
  const weapons = state.weapons || [];
  return weapons.find(item => normalizeItemName(item?.name) === key) || null;
}

function getWeaponRowByName(name) {
  const cleaned = normalizeItemName(name);
  if (!cleaned) return null;
  const weapons = state.weapons || [];
  return weapons.find(item => normalizeItemName(item?.name) === cleaned) || null;
}

function setWeaponMasterySelectTooltip(select) {
  if (!select) return;
  const weapon = getWeaponRowByName(select.value);
  const mastery = String(weapon?.mastery || '').trim();
  const tip = mastery ? getWeaponMasteryTooltip(mastery) : '';
  select.title = tip ? `${mastery}: ${tip}` : '';
}

function getWeaponAbilityMod(meta) {
  const abilityInputs = getAbilityInputs();
  const strScore = Number(abilityInputs.str?.score?.value);
  const dexScore = Number(abilityInputs.dex?.score?.value);
  const strMod = Number.isFinite(strScore) ? getModifierValue(strScore) : 0;
  const dexMod = Number.isFinite(dexScore) ? getModifierValue(dexScore) : 0;
  const category = String(meta?.category || '').toLowerCase();
  const props = String(meta?.properties || '').toLowerCase();
  if (props.includes('finesse')) return Math.max(strMod, dexMod);
  if (category.includes('ranged')) return dexMod;
  return strMod;
}

function getSelectedWeaponMasterySet() {
  const selected = new Set();
  Object.entries(state.featureSelections || {}).forEach(([key, selection]) => {
    const choice = (state.featureChoices || []).find(entry => getFeatureChoiceKey(entry) === key);
    if (!choice) return;
    const optionKey = typeof selection === 'string' ? selection : selection?.option;
    const option = (choice.options || []).find(opt => opt.key === optionKey);
    const effects = option?.effects || {};
    const count = Number(effects.weapon_mastery || effects.weaponMastery || 0);
    if (!Number.isFinite(count) || count <= 0) return;
    const weapons = Array.isArray(selection?.weapons) ? selection.weapons : [];
    weapons.forEach(name => {
      const clean = String(name || '').trim();
      if (clean) selected.add(normalizeItemName(clean));
    });
  });
  return selected;
}

function getWeaponMasteryChoiceForClass() {
  const classEntry = getSelectedClassEntry();
  const classId = normalizeKey(classEntry?.class_id);
  const level = getCurrentLevel();
  if (!classId) return null;
  return (state.featureChoices || []).find(choice => {
    if (normalizeKey(choice?.class_id) !== classId) return false;
    const choiceLevel = Number(choice?.level);
    if (!Number.isFinite(choiceLevel) || choiceLevel > level) return false;
    return (choice.options || []).some(option => {
      const effects = option?.effects || {};
      return Boolean(effects.weapon_mastery || effects.weaponMastery);
    });
  }) || null;
}

function renderWeaponMasteryBox() {
  const box = getWeaponMasteryBox();
  const select1 = getWeaponMasterySelect(1);
  const select2 = getWeaponMasterySelect(2);
  if (!box || !select1 || !select2) return;
  const choice = getWeaponMasteryChoiceForClass();
  if (!choice) {
    box.style.display = 'none';
    return;
  }
  box.style.display = '';
  const key = getFeatureChoiceKey(choice);
  const selection = typeof state.featureSelections?.[key] === 'object'
    ? state.featureSelections[key]
    : {};
  const weapons = Array.isArray(selection?.weapons) ? selection.weapons : [];
  const optionsList = getWeaponMasteryOptions();
  const buildOptions = (select, value) => {
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select...';
    select.appendChild(placeholder);
    optionsList.forEach(weapon => {
      const opt = document.createElement('option');
      opt.value = weapon;
      opt.textContent = weapon;
      select.appendChild(opt);
    });
    if (value) select.value = value;
    setWeaponMasterySelectTooltip(select);
  };
  buildOptions(select1, weapons[0] || '');
  buildOptions(select2, weapons[1] || '');

  const locked = weapons.filter(Boolean).length >= 2;
  select1.disabled = locked;
  select2.disabled = locked;

  const onChange = () => {
    const picks = [select1.value, select2.value].map(item => String(item || '').trim()).filter(Boolean);
    const unique = new Set(picks);
    if (picks.length !== unique.size) {
      return;
    }
    const current = typeof state.featureSelections[key] === 'object' ? state.featureSelections[key] : {};
    state.featureSelections[key] = { ...current, option: (choice.options?.[0]?.key || choice.feature), weapons: picks };
    renderWeaponMasteryBox();
    updateClassFeatures();
    updateEquippedGearFromInventory();
  };
  select1.onchange = () => {
    setWeaponMasterySelectTooltip(select1);
    onChange();
  };
  select2.onchange = () => {
    setWeaponMasterySelectTooltip(select2);
    onChange();
  };
}

function updateEquippedGearFromInventory() {
  const rows = getAttackRowInputs();
  if (!rows.length) return;
  if (state.isWildShaped && Array.isArray(state.wildShapeAttacks) && state.wildShapeAttacks.length) {
    rows.forEach((row, idx) => {
      if (!row?.name || !row?.atk || !row?.dmg) return;
      const attack = state.wildShapeAttacks[idx];
        if (!attack) {
          row.name.value = '';
          row.atk.value = '';
          row.dmg.value = '';
          if (row.mastery) {
            row.mastery.value = '';
            row.mastery.title = '';
          }
          return;
        }
        row.name.value = attack.name;
        row.atk.value = attack.atk;
        row.dmg.value = attack.damage;
        if (row.mastery) {
          row.mastery.value = '';
          row.mastery.title = '';
        }
      });
      return;
    }
  const masterySet = getSelectedWeaponMasterySet();
  let leftKey = state.handEquip?.left || null;
  let rightKey = state.handEquip?.right || null;
  if (leftKey && !isWeaponTrainedForKey(leftKey)) {
    leftKey = null;
    state.handEquip.left = null;
  }
  if (rightKey && !isWeaponTrainedForKey(rightKey)) {
    rightKey = null;
    state.handEquip.right = null;
  }
  if (state.equippedArmorKey) {
    const armorItem = (state.inventoryItems || []).find(entry => entry.key === state.equippedArmorKey);
    if (armorItem && !isArmorTrainedForItem(armorItem)) {
      state.equippedArmorKey = null;
    }
  }
  const bothSame = leftKey && rightKey && leftKey === rightKey;
  const keyEntries = [];
  if (leftKey) keyEntries.push({ key: leftKey, hand: 'left' });
  if (rightKey) keyEntries.push({ key: rightKey, hand: 'right' });
  if (bothSame) {
    const meta = getWeaponMetaByKey(leftKey);
    if (meta?.versatile || meta?.twoHanded) {
      keyEntries.length = 0;
      keyEntries.push({ key: leftKey, hand: 'both' });
    }
  }
  const equippedList = keyEntries
    .map(entry => {
      const key = entry.key;
      const weapon = getWeaponRowByKey(key);
      if (!weapon) return null;
      const properties = [weapon.properties, weapon.properties_1, weapon.properties_2, weapon.properties_3, weapon.properties_4]
        .filter(Boolean)
        .join(', ');
      let damage = weapon.damage || '';
      const meta = getWeaponMetaByKey(key);
      const propString = properties || meta?.properties || '';
      if (meta?.versatile && entry.hand === 'both') {
        const match = propString.match(/versatile\s*\(?\s*([0-9]+d[0-9]+)\s*\)?/i);
        if (match) {
          const parts = damage.match(/^([0-9]+d[0-9]+)\s*(.*)$/i);
          const suffix = parts && parts[2] ? ` ${parts[2]}` : '';
          damage = `${match[1]}${suffix}`;
        }
      }
      return {
        key,
        name: weapon.name,
        damage,
        category: weapon.category || '',
        properties: propString,
        mastery: String(weapon.mastery || '').trim(),
      };
    })
    .filter(Boolean);
  const profText = String(getProficiencyBonusSpan()?.textContent || '').trim();
  const profValue = Number(profText.replace('+', ''));
  const prof = Number.isFinite(profValue) ? profValue : 0;
  rows.forEach((row, idx) => {
    if (!row?.name || !row?.atk || !row?.dmg) return;
    const item = equippedList[idx];
      if (!item) {
        row.name.value = '';
        row.atk.value = '';
        row.dmg.value = '';
        if (row.mastery) {
          row.mastery.value = '';
          row.mastery.title = '';
        }
        return;
      }
    const mod = getWeaponAbilityMod(item);
    const atk = prof + (Number.isFinite(mod) ? mod : 0);
    row.name.value = item.name;
    row.atk.value = atk >= 0 ? `+${atk}` : `${atk}`;
      row.dmg.value = item.damage || '';
      if (row.mastery) {
        const hasMastery = masterySet.has(normalizeItemName(item.name));
        const mastery = hasMastery ? String(item.mastery || '').trim() : '';
        row.mastery.value = mastery;
        row.mastery.title = mastery ? getWeaponMasteryTooltip(mastery) : '';
      }
    });

  const armorName = state.equippedArmorKey
    ? (state.inventoryItems || []).find(entry => entry.key === state.equippedArmorKey)?.name
    : '';
  if (armorName) {
    const hasArmorRow = rows.some(row => row?.name?.value?.trim());
    if (!hasArmorRow) {
      rows[0].name.value = armorName;
    } else {
      const empty = rows.find(row => !row?.name?.value?.trim());
        if (empty) {
          empty.name.value = armorName;
          empty.atk.value = '';
          empty.dmg.value = '';
          if (empty.mastery) {
            empty.mastery.value = '';
            empty.mastery.title = '';
          }
        }
      }
    }
  }

function parseEquipmentItems(raw) {
  const cleaned = String(raw || '')
    .replace(/\s+or\s+/gi, ',')
    .replace(/\s+\+\s+/g, ',')
    .replace(/\band\b/gi, ',');
  return cleaned
    .split(',')
    .map(item => item.trim())
    .filter(item => item && !/\d+\s*gp/i.test(item));
}

function getEquipmentGold(raw) {
  const text = String(raw || '');
  const matches = text.match(/(\d+)\s*gp/gi) || [];
  let total = 0;
  matches.forEach(match => {
    const value = Number(match.replace(/[^0-9]/g, ''));
    if (Number.isFinite(value)) total += value;
  });
  return total;
}

function updateCurrencyFromEquipment() {
  const classOptions = getClassEquipmentOptions();
  const backgroundOptions = getBackgroundEquipmentOptions();
  const classPick = state.inventorySelections.class === 'B' ? 1 : 0;
  const backgroundPick = state.inventorySelections.background === 'B' ? 1 : 0;
  const classOption = classOptions[classPick];
  const backgroundOption = backgroundOptions[backgroundPick];
  const classGold = getEquipmentGold(typeof classOption === 'string' ? classOption : classOption?.description || '');
  const backgroundGold = getEquipmentGold(typeof backgroundOption === 'string' ? backgroundOption : backgroundOption?.description || '');
  const inputs = getCurrencyInputs();
  if (inputs.gp) inputs.gp.value = String((classGold + backgroundGold) || 0);
}

function addManualInventoryItem(name, qty = 1) {
  const itemName = String(name || '').trim();
  if (!itemName) return;
  const count = Math.max(1, Number(qty) || 1);
  const existing = state.manualInventoryItems.find(entry =>
    normalizeItemName(entry.name) === normalizeItemName(itemName)
  );
  if (existing) {
    existing.qty = (Number(existing.qty) || 0) + count;
  } else {
    state.manualInventoryItems.push({ name: itemName, qty: count });
  }
}

function removeInventoryItem(name, qty = 1) {
  const itemName = String(name || '').trim();
  if (!itemName) return;
  const count = Math.max(1, Number(qty) || 1);
  const manual = state.manualInventoryItems.find(entry =>
    normalizeItemName(entry.name) === normalizeItemName(itemName)
  );
  if (manual) {
    manual.qty = Math.max(0, (Number(manual.qty) || 0) - count);
    if (manual.qty <= 0) {
      state.manualInventoryItems = state.manualInventoryItems.filter(entry =>
        normalizeItemName(entry.name) !== normalizeItemName(itemName)
      );
    }
    return;
  }
  const item = (state.inventoryItems || []).find(entry =>
    normalizeItemName(entry.name) === normalizeItemName(itemName)
  );
  if (item) {
    const newQty = Math.max(0, (Number(item.qty) || 0) - count);
    if (newQty <= 0) {
      state.inventoryItems = (state.inventoryItems || []).filter(entry => entry.key !== item.key);
    } else {
      item.qty = newQty;
    }
  }
}

function parseCostToGp(raw) {
  const text = String(raw || '').toLowerCase();
  if (!text) return 0;
  const match = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(cp|sp|ep|gp|pp)/);
  if (!match) return 0;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 0;
  const unit = match[2];
  if (unit === 'cp') return value / 100;
  if (unit === 'sp') return value / 10;
  if (unit === 'ep') return value / 2;
  if (unit === 'gp') return value;
  if (unit === 'pp') return value * 10;
  return 0;
}

function buildShopItems() {
  const items = [];
  (state.weapons || []).forEach(item => {
    items.push({
      name: item.name,
      category: 'Weapon',
      cost: item.cost || '',
    });
  });
  (state.armor || []).forEach(item => {
    items.push({
      name: item.name,
      category: 'Armor',
      cost: item.cost || '',
    });
  });
  (state.adventuringGear || []).forEach(item => {
    items.push({
      name: item.name,
      category: 'Gear',
      cost: item.cost || '',
    });
  });
  state.shopItems = items.filter(entry => entry.name);
}

function openInventoryModal(mode = 'add') {
  if (!state.inventoryOverride) {
    state.inventoryOverride = true;
  }
  const modal = getInventoryModal();
  const title = getInventoryModalTitle();
  const search = getInventoryModalSearch();
  const table = getInventoryModalTable();
  const qtyInput = getInventoryModalQty();
  const error = getInventoryModalError();
  const confirm = getInventoryModalConfirm();
  const cancel = getInventoryModalCancel();
  if (!modal || !table || !confirm || !cancel || !qtyInput) return;
  buildShopItems();
  const costMap = new Map((state.shopItems || []).map(item => [normalizeItemName(item.name), item.cost || '']));
  const list = mode === 'sell'
    ? (state.inventoryItems || [])
        .filter(item => item.category !== 'pack')
        .map(item => ({
          name: item.name,
          category: item.category || 'Other',
          cost: costMap.get(normalizeItemName(item.name)) || '',
          qty: item.qty || 1,
        }))
    : (state.shopItems || []);
  const tbody = table.querySelector('tbody');
  let selectedKey = '';
  const render = filter => {
    if (!tbody) return;
    tbody.innerHTML = '';
    const query = String(filter || '').toLowerCase();
    list
      .filter(item => item.name.toLowerCase().includes(query))
      .forEach(item => {
        const row = document.createElement('tr');
        row.dataset.item = item.name;
        row.innerHTML = `
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td>${item.cost || '-'}</td>
        `;
        if (selectedKey && normalizeItemName(item.name) === selectedKey) {
          row.classList.add('selected');
        }
        row.addEventListener('click', () => {
          selectedKey = normalizeItemName(item.name);
          Array.from(tbody.querySelectorAll('tr')).forEach(tr => tr.classList.remove('selected'));
          row.classList.add('selected');
        });
        tbody.appendChild(row);
      });
  };
  render('');
  if (title) title.textContent = mode === 'shop' ? 'Shop' : mode === 'sell' ? 'Sell' : 'Add Item';
  if (confirm) confirm.textContent = mode === 'shop' ? 'Buy' : mode === 'sell' ? 'Sell' : 'Add';
  if (error) error.textContent = '';
  qtyInput.value = '1';
  if (search) {
    search.value = '';
    search.oninput = () => render(search.value);
  }
  const close = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    confirm.onclick = null;
    cancel.onclick = null;
    if (search) search.oninput = null;
  };
  cancel.onclick = () => close();
  confirm.onclick = () => {
    const qty = Math.max(1, Number(qtyInput.value) || 1);
    const selected = list.find(item => normalizeItemName(item.name) === selectedKey);
    if (!selected) {
      if (error) error.textContent = 'Select an item.';
      const card = modal.querySelector('.modal-card');
      if (card) {
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
      }
      return;
    }
    if (mode === 'shop') {
      const inputs = getCurrencyInputs();
      const gp = Number(inputs.gp?.value) || 0;
      const cost = parseCostToGp(selected.cost) * qty;
      if (gp < cost) {
        if (error) error.textContent = 'Not enough GP.';
        return;
      }
      if (inputs.gp) inputs.gp.value = String(Math.max(0, gp - cost));
    }
    if (mode === 'sell') {
      const inputs = getCurrencyInputs();
      const gp = Number(inputs.gp?.value) || 0;
      const cost = parseCostToGp(selected.cost) || 0;
      if (inputs.gp) inputs.gp.value = String(gp + cost * qty);
      removeInventoryItem(selected.name, qty);
    }
    if (mode !== 'sell') {
      addManualInventoryItem(selected.name, qty);
    }
    updateInventory();
    close();
  };
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

async function openTradeModal() {
  if (!state.inventoryOverride) {
    state.inventoryOverride = true;
  }
  const modal = getTradeModal();
  const playerSelect = getTradePlayerSelect();
  const itemInput = getTradeItemName();
  const qtyInput = getTradeItemQty();
  const error = getTradeModalError();
  const cancel = getTradeModalCancel();
  const confirm = getTradeModalConfirm();
  if (!modal || !playerSelect || !itemInput || !qtyInput || !cancel || !confirm) return;
  playerSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a player';
  playerSelect.appendChild(placeholder);
  try {
    const response = await fetch('/api/player/online');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const players = Array.isArray(data?.players) ? data.players : [];
    players.forEach(player => {
      const option = document.createElement('option');
      option.value = player.id;
      option.textContent = player.username || player.id;
      playerSelect.appendChild(option);
    });
  } catch (err) {
    console.warn('Failed to load online players', err);
  }
  itemInput.value = '';
  qtyInput.value = '1';
  if (error) error.textContent = '';
  const close = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    cancel.onclick = null;
    confirm.onclick = null;
  };
  cancel.onclick = () => close();
  confirm.onclick = () => {
    const playerId = String(playerSelect.value || '').trim();
    const item = String(itemInput.value || '').trim();
    const qty = Math.max(1, Number(qtyInput.value) || 1);
    if (!playerId || !item) {
      if (error) error.textContent = 'Select a player and item.';
      const card = modal.querySelector('.modal-card');
      if (card) {
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
      }
      return;
    }
    fetch('/api/player/trade/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toPlayerId: playerId, item, qty }),
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(() => {
        window.alert(`Trade request sent to ${playerSelect.options[playerSelect.selectedIndex]?.textContent} for ${qty} x ${item}.`);
        close();
      })
      .catch(err => {
        console.warn('Trade request failed', err);
        if (error) error.textContent = 'Failed to send trade request.';
      });
  };
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function normalizeCurrency() {
  const inputs = getCurrencyInputs();
  if (!inputs.cp || !inputs.sp) return;
  const cp = Math.max(0, Number(inputs.cp.value) || 0);
  const sp = Math.max(0, Number(inputs.sp.value) || 0);
  const extraSp = Math.floor(cp / 10);
  const remainder = cp % 10;
  if (extraSp > 0) {
    inputs.sp.value = String(sp + extraSp);
  }
  if (cp !== remainder) {
    inputs.cp.value = String(remainder);
  }
}

function applyInventoryEnforcement() {
  const add = getInventoryAddButton();
  const shop = getInventoryShopButton();
  const sell = getInventorySellButton();
  const trade = getInventoryTradeButton();
  if (add) add.disabled = false;
  if (shop) shop.disabled = false;
  if (sell) sell.disabled = false;
  if (trade) trade.disabled = false;
}

function splitItemQuantity(raw) {
  const text = String(raw || '').trim();
  if (!text) return { name: '', qty: 1 };
  const parenMatch = text.match(/^(.*?)\(\s*(\d+)\s*days?\s*\)\s*$/i);
  if (parenMatch) {
    return { name: parenMatch[1].trim(), qty: Number(parenMatch[2]) || 1 };
  }
  const match = text.match(/^(\d+)\s+(.+)$/i);
  if (!match) return { name: text, qty: 1 };
  const qty = Number(match[1]) || 1;
  let name = match[2].trim();
  const daysMatch = name.match(/^(?:days?|day)\s+of\s+(.+)$/i);
  if (daysMatch) {
    name = daysMatch[1].trim();
  }
  name = name.replace(/^([a-z]+)s\b/i, '$1');
  return { name, qty };
}

function getWeaponMetaByKey(key) {
  const weapons = state.weapons || [];
  const match = weapons.find(item => normalizeItemName(item?.name) === key);
  if (!match) return null;
  const props = [];
  ['properties', 'properties_1', 'properties_2', 'properties_3', 'properties_4'].forEach(field => {
    const value = String(match[field] || '').trim();
    if (value) props.push(value);
  });
  return {
    name: match.name,
    category: match.category || '',
    properties: props.join(', '),
    twoHanded: props.some(prop => /two[-\s]?handed/i.test(prop)),
    versatile: props.some(prop => /versatile/i.test(prop)),
  };
}

function isWeaponTrainedForKey(key) {
  const weapon = getWeaponRowByKey(key);
  if (!weapon) return true;
  const category = String(weapon.category || '').toLowerCase();
  const training = state.weaponTraining || getWeaponTrainingFromClass();
  const isSimple = category.includes('simple');
  const isMartial = category.includes('martial');
  if (isSimple) {
    return training.simpleMelee || training.simpleRanged;
  }
  if (isMartial) {
    return training.martialMelee || training.martialRanged;
  }
  return true;
}

function isArmorTrainedForItem(item) {
  const category = String(item?.category || '').toLowerCase();
  if (isShieldItem(item)) return Boolean(state.armorTraining?.shields);
  if (category.includes('light')) return Boolean(state.armorTraining?.light);
  if (category.includes('medium')) return Boolean(state.armorTraining?.medium);
  if (category.includes('heavy')) return Boolean(state.armorTraining?.heavy);
  return true;
}

function isShieldItem(item) {
  const name = String(item?.name || '').toLowerCase();
  const category = String(item?.category || '').toLowerCase();
  return name.includes('shield') || category.includes('shield');
}

function getEquippedCountForItem(item, meta) {
  const key = item?.key;
  if (!key) return 0;
  const left = state.handEquip?.left === key;
  const right = state.handEquip?.right === key;
  if (meta?.versatile && left && right) return 1;
  if (meta?.twoHanded) return left && right ? 1 : 0;
  return (left ? 1 : 0) + (right ? 1 : 0);
}

function clearTwoHandedIfNeeded() {
  const leftKey = state.handEquip?.left;
  const rightKey = state.handEquip?.right;
  if (!leftKey || leftKey !== rightKey) return;
  const meta = getWeaponMetaByKey(leftKey);
  if (meta?.twoHanded) {
    state.handEquip.left = null;
    state.handEquip.right = null;
  }
}

function toggleHandEquip(item, side) {
  if (!item?.key) return;
  const key = item.key;
  const meta = item.category === 'weapons' ? getWeaponMetaByKey(key) : null;
  if (meta?.twoHanded) {
    const alreadyEquipped = state.handEquip.left === key && state.handEquip.right === key;
    if (alreadyEquipped) {
      state.handEquip.left = null;
      state.handEquip.right = null;
    } else {
      state.handEquip.left = key;
      state.handEquip.right = key;
    }
    updateEquippedGearFromInventory();
    updateArmorClass();
    updateArmorTrainingEffects();
    return;
  }
  if (state.handEquip[side] === key) {
    state.handEquip[side] = null;
    return;
  }
  const countUsed = getEquippedCountForItem(item, meta);
  if (countUsed >= (item.qty || 1)) {
    if (!(meta?.versatile && ((side === 'left' && state.handEquip.right === key)
      || (side === 'right' && state.handEquip.left === key)))) {
      return;
    }
  }
  clearTwoHandedIfNeeded();
  state.handEquip[side] = key;
  updateEquippedGearFromInventory();
  updateArmorClass();
  updateArmorTrainingEffects();
}

function toggleArmorEquip(item) {
  const key = item?.key;
  if (!key) return;
  if (!isArmorTrainedForItem(item)) {
    const warning = getArmorTrainingWarning();
    if (warning) warning.textContent = 'Cannot equip armor you are not trained to use.';
    return;
  }
  if (state.equippedArmorKey === key) {
    state.equippedArmorKey = null;
    const select = getArmorSelect();
    if (select) {
      select.value = '';
    }
    updateArmorClass();
    updateArmorTrainingEffects();
    return;
  }
  state.equippedArmorKey = key;
  const select = getArmorSelect();
  if (select) {
    select.value = item.name;
  }
  updateArmorClass();
  updateArmorTrainingEffects();
}

function getClassEquipmentOptions() {
  const classEntry = getSelectedClassEntry();
  const key = normalizeName(classEntry?.name || '');
  const options = state.equipmentOptions?.[key] || [];
  return Array.isArray(options) ? options : [];
}

function normalizeOptionToItems(option) {
  if (!option) return [];
  if (Array.isArray(option)) return option;
  if (typeof option === 'object') {
    if (Array.isArray(option.items) && option.items.length) return option.items;
    if (option.description) return parseEquipmentItems(option.description);
  }
  if (typeof option === 'string') return parseEquipmentItems(option);
  return [];
}

function getPackByName(name) {
  const raw = String(name || '').trim();
  const key = normalizeName(raw);
  const alt = normalizeName(raw.replace(/pack$/i, '').trim());
  return state.adventuringPacks?.[key]
    || state.adventuringPacks?.[`${key}pack`]
    || state.adventuringPacks?.[alt]
    || null;
}

function getBackgroundEquipmentOptions() {
  const select = getBackgroundSelect();
  const chosen = String(select?.value || '').trim();
  const background = state.backgrounds.find(entry =>
    normalizeKey(entry?.name) === normalizeKey(chosen)
  );
  const optionA = String(background?.starting_equipment_a || '').trim();
  const optionB = String(background?.starting_equipment_b || '').trim();
  return [optionA, optionB].filter(Boolean);
}

function buildInventoryItems() {
  if (state.inventoryOverride && (state.inventoryItems || []).length) return;
  const classOptions = getClassEquipmentOptions();
  const backgroundOptions = getBackgroundEquipmentOptions();
  const classPick = state.inventorySelections.class === 'B' ? 1 : 0;
  const backgroundPick = state.inventorySelections.background === 'B' ? 1 : 0;
  const classItems = normalizeOptionToItems(classOptions[classPick]);
  const backgroundItems = normalizeOptionToItems(backgroundOptions[backgroundPick]);
  const manualItems = (state.manualInventoryItems || []).flatMap(entry => {
    const count = Number(entry.qty) || 1;
    return Array.from({ length: Math.max(1, count) }, () => entry.name);
  });
  const rawItems = [...classItems, ...backgroundItems, ...manualItems];
  const weaponsSet = new Set((state.weapons || []).map(item => normalizeItemName(item?.name)));
  const armorSet = new Set((state.armor || []).map(item => normalizeItemName(item?.name)));
  const counts = new Map();
  const items = [];
  rawItems.forEach(item => {
    const parsed = splitItemQuantity(item);
    const baseName = parsed.name || item;
    const qty = Number(parsed.qty) || 1;
    let key = normalizeItemName(baseName);
    let category = 'other';
    if (!key) return;
    const pack = getPackByName(baseName);
    if (pack) {
      category = 'pack';
    } else if (weaponsSet.has(key)) {
      category = 'weapons';
    } else if (armorSet.has(key)) {
      category = 'armor';
    } else {
      const inner = extractParenthetical(baseName);
      if (inner) {
        const innerKey = normalizeItemName(inner);
        if (weaponsSet.has(innerKey)) {
          key = innerKey;
          category = 'weapons';
        } else if (armorSet.has(innerKey)) {
          key = innerKey;
          category = 'armor';
        }
      }
    }
    counts.set(key, (counts.get(key) || 0) + qty);
    if (!counts.has(key) || counts.get(key) === qty) {
      items.push({ name: baseName, key, category, pack });
    }
  });
  items.forEach(item => {
    item.qty = counts.get(item.key) || 1;
  });
  state.inventoryItems = items;
}

function renderInventoryOptions() {
  const buttons = getInventoryOptionButtons();
  const classOptions = getClassEquipmentOptions();
  const backgroundOptions = getBackgroundEquipmentOptions();
  buttons.forEach(btn => {
    const group = btn.dataset.optionGroup;
    const option = btn.dataset.option;
    if (!group || !option) return;
    const active = state.inventorySelections[group] === option;
    btn.classList.toggle('active', active);
    if (group === 'class') {
      btn.disabled = option === 'B' && classOptions.length < 2;
    }
    if (group === 'background') {
      btn.disabled = option === 'B' && backgroundOptions.length < 2;
    }
  });
}

function toggleEquipItem(item) {
  if (!item?.key) return;
  if (item.category === 'weapons' && !isWeaponTrainedForKey(item.key)) {
    window.alert('You are not proficient with that weapon.');
    return;
  }
  if (item.category === 'armor' && !isArmorTrainedForItem(item)) {
    const warning = getArmorTrainingWarning();
    if (warning) warning.textContent = 'Cannot equip armor you are not trained to use.';
    return;
  }
  const equipped = state.equippedItems || new Set();
  if (equipped.has(item.key)) {
    equipped.delete(item.key);
    if (item.category === 'armor') {
      const select = getArmorSelect();
      if (select && normalizeItemName(select.value) === item.key) {
        select.value = '';
        updateArmorClass();
      }
    }
  } else {
    equipped.add(item.key);
    if (item.category === 'armor') {
      const select = getArmorSelect();
      if (select) {
        select.value = item.name;
        updateArmorClass();
      }
    }
  }
  state.equippedItems = equipped;
}

function renderInventoryTables() {
  const groups = {
    weapons: getInventoryTableBody('weapons'),
    armor: getInventoryTableBody('armor'),
    other: getInventoryTableBody('other'),
  };
  Object.values(groups).forEach(tbody => {
    if (tbody) tbody.innerHTML = '';
  });
  (state.inventoryItems || []).forEach(item => {
    const targetCategory = item.category === 'pack' ? 'other' : item.category;
    const tbody = groups[targetCategory];
    if (!tbody) return;
    const row = document.createElement('tr');
    const meta = item.category === 'weapons' ? getWeaponMetaByKey(item.key) : null;
    const isShield = item.category === 'armor' && isShieldItem(item);
    const leftActive = state.handEquip.left === item.key;
    const rightActive = state.handEquip.right === item.key;
    const countUsed = getEquippedCountForItem(item, meta);
    const canEquipLeft = item.category === 'weapons' || isShield;
    const canEquipRight = item.category === 'weapons' || isShield;
    if (item.category === 'pack') {
      row.classList.add('pack-row');
      row.innerHTML = `
        <td colspan="3"><strong>${item.name}</strong>${item.qty > 1 ? ` x${item.qty}` : ''}</td>
      `;
      tbody.appendChild(row);
      (item.pack?.items || []).forEach(packItem => {
        const parsed = splitItemQuantity(packItem?.name || packItem);
        const packRow = document.createElement('tr');
        const qty = Number(packItem?.qty) || Number(parsed.qty) || 1;
        const name = parsed.name || packItem?.name || String(packItem || '').trim();
        packRow.innerHTML = `
          <td>${qty}</td>
          <td>${name}</td>
          <td><button type="button" class="equip-btn" data-item="${normalizeItemName(name)}" data-pack="${item.key}" data-action="dec-pack">-</button></td>
        `;
        tbody.appendChild(packRow);
      });
      return;
    }
    if (item.category === 'other') {
      row.innerHTML = `
        <td>${item.qty || 1}</td>
        <td>${item.name}</td>
        <td><button type="button" class="equip-btn" data-item="${item.key}" data-action="dec-other">-</button></td>
      `;
    } else if (item.category === 'armor' && !isShield) {
      const isEquipped = state.equippedArmorKey === item.key;
      row.innerHTML = `
        <td>${item.qty || 1}</td>
        <td>${item.name}</td>
        <td><button type="button" class="equip-btn ${isEquipped ? 'active' : ''}" data-item="${item.key}" data-action="equip-armor">${isEquipped ? 'Unequip' : 'Equip'}</button></td>
        <td>-</td>
      `;
    } else if (item.category === 'weapons') {
      const allowSecondLeft = meta?.versatile && rightActive;
      const allowSecondRight = meta?.versatile && leftActive;
      const leftDisabled = !leftActive && countUsed >= (item.qty || 1) && !allowSecondLeft;
      const rightDisabled = !rightActive && countUsed >= (item.qty || 1) && !allowSecondRight;
      const leftLabel = meta?.twoHanded ? (leftActive ? 'Unequip' : 'Equip 2H') : (leftActive ? 'Unequip' : 'Equip');
      const rightLabel = meta?.twoHanded ? (rightActive ? 'Unequip' : 'Equip 2H') : (rightActive ? 'Unequip' : 'Equip');
      row.innerHTML = `
        <td>${item.qty || 1}</td>
        <td>${item.name}</td>
        <td><button type="button" class="equip-btn ${leftActive ? 'active' : ''}" data-item="${item.key}" data-action="equip-left" ${leftDisabled ? 'disabled' : ''}>${leftLabel}</button></td>
        <td><button type="button" class="equip-btn ${rightActive ? 'active' : ''}" data-item="${item.key}" data-action="equip-right" ${rightDisabled ? 'disabled' : ''}>${rightLabel}</button></td>
      `;
    } else {
      const leftDisabled = !leftActive && countUsed >= (item.qty || 1);
      const rightDisabled = !rightActive && countUsed >= (item.qty || 1);
      const leftLabel = meta?.twoHanded ? (leftActive ? 'Unequip' : 'Equip 2H') : (leftActive ? 'Unequip' : 'Equip');
      const rightLabel = meta?.twoHanded ? (rightActive ? 'Unequip' : 'Equip 2H') : (rightActive ? 'Unequip' : 'Equip');
      row.innerHTML = `
        <td>${item.qty || 1}</td>
        <td>${item.name}</td>
        <td><button type="button" class="equip-btn ${leftActive ? 'active' : ''}" data-item="${item.key}" data-action="equip-left" ${leftDisabled ? 'disabled' : ''}>${leftLabel}</button></td>
        <td><button type="button" class="equip-btn ${rightActive ? 'active' : ''}" data-item="${item.key}" data-action="equip-right" ${rightDisabled ? 'disabled' : ''}>${rightLabel}</button></td>
      `;
    }
    tbody.appendChild(row);
  });
  Object.values(groups).forEach(tbody => {
    if (!tbody) return;
    tbody.querySelectorAll('.equip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.item;
        const action = btn.dataset.action;
        const item = (state.inventoryItems || []).find(entry => entry.key === key);
        if (!item) return;
        if (action === 'equip-left') toggleHandEquip(item, 'left');
        if (action === 'equip-right') toggleHandEquip(item, 'right');
        if (action === 'equip-armor') toggleArmorEquip(item);
        if (action === 'dec-other') {
          const current = Number(item.qty) || 1;
          if (current > 1) {
            item.qty = current - 1;
          } else {
            state.inventoryItems = (state.inventoryItems || []).filter(entry => entry.key !== item.key);
          }
        }
        if (action === 'dec-pack') {
          const packKey = btn.dataset.pack;
          const packItemKey = btn.dataset.item;
          const pack = (state.inventoryItems || []).find(entry => entry.key === packKey && entry.category === 'pack');
          if (pack?.pack?.items) {
            pack.pack.items = pack.pack.items
              .map(packEntry => {
                const parsed = splitItemQuantity(packEntry?.name || packEntry);
                const name = parsed.name || packEntry?.name || String(packEntry || '').trim();
                if (normalizeItemName(name) !== packItemKey) return packEntry;
                const qty = (Number(parsed.qty) || packEntry?.qty || 1) - 1;
                if (qty <= 0) return null;
                const newEntry = { ...packEntry };
                newEntry.qty = qty;
                return newEntry;
              })
              .filter(Boolean);
          }
        }
        renderInventoryTables();
        updateEquippedGearFromInventory();
      });
    });
  });
}

function updateInventory() {
  buildInventoryItems();
  const currentKeys = new Set((state.inventoryItems || []).map(item => item.key));
  const equipped = state.equippedItems || new Set();
  state.equippedItems = new Set(Array.from(equipped).filter(key => currentKeys.has(key)));
  if (state.equippedArmorKey && !currentKeys.has(state.equippedArmorKey)) {
    state.equippedArmorKey = null;
  }
  if (state.handEquip?.left && !currentKeys.has(state.handEquip.left)) {
    state.handEquip.left = null;
  }
  if (state.handEquip?.right && !currentKeys.has(state.handEquip.right)) {
    state.handEquip.right = null;
  }
  if (state.equippedArmorKey) {
    const armorItem = (state.inventoryItems || []).find(entry => entry.key === state.equippedArmorKey);
    if (armorItem && !isArmorTrainedForItem(armorItem)) {
      state.equippedArmorKey = null;
    }
  }
  if (state.handEquip?.left && !isWeaponTrainedForKey(state.handEquip.left)) {
    state.handEquip.left = null;
  }
  if (state.handEquip?.right && !isWeaponTrainedForKey(state.handEquip.right)) {
    state.handEquip.right = null;
  }
  renderInventoryOptions();
  renderInventoryTables();
  updateEquippedGearFromInventory();
  updateCurrencyFromEquipment();
  applyInventoryEnforcement();
}

function formatLevelLabel(level) {
  if (level === 0) return 'Cantrip';
  if (!Number.isFinite(level)) return '';
  return String(level);
}

function buildCrmFlags(spell) {
  const flags = [];
  const duration = String(spell.duration || '');
  const components = String(spell.components || '');
  const description = String(spell.description || '');
  if (/concentration/i.test(duration)) flags.push('C');
  if (/ritual/i.test(description)) flags.push('R');
  if (/\\bM\\b/.test(components) || components.includes('M')) flags.push('M');
  return flags.length ? flags.join(' ') : '-';
}

function buildStatsPayload() {
  const inputs = getAbilityInputs();
  const parts = [
    ['STR', inputs.str?.score?.value],
    ['DEX', inputs.dex?.score?.value],
    ['CON', inputs.con?.score?.value],
    ['INT', inputs.int?.score?.value],
    ['WIS', inputs.wis?.score?.value],
    ['CHA', inputs.cha?.score?.value],
  ];
  return parts
    .map(([label, value]) => {
      const num = Number(value);
      return Number.isFinite(num) ? `${label} ${num}` : null;
    })
    .filter(Boolean)
    .join(', ');
}

function getCantripsFromAttacks() {
  const rows = getAttackRowInputs();
  const names = rows
    .map(row => String(row?.name?.value || '').trim())
    .filter(Boolean);
  return Array.from(new Set(names));
}

function getPreparedSpellNames() {
  const prepared = state.preparedSpellIds || new Set();
  const spells = [];
  const cantrips = [];
  prepared.forEach(spellId => {
    const spell = state.classSpells.find(entry => entry.spell_id === spellId);
    const name = String(spell?.name || '').trim();
    if (!name) return;
    const level = Number(spell?.level);
    if (Number.isFinite(level) && level === 0) {
      cantrips.push(name);
    } else {
      spells.push(name);
    }
  });
  return {
    cantrips: Array.from(new Set(cantrips)),
    spells: Array.from(new Set(spells)),
  };
}

function buildWizardPayload() {
  const classSelect = getClassSelect();
  const subclassSelect = getSubclassSelect();
  const levelSelect = getLevelSelect();
  const backgroundSelect = getBackgroundSelect();
  const speciesSelect = getSpeciesSelect();
  const lineageSelect = getLineageSelect();
  const nameInput = getCharacterNameInput();
  const artNotes = getCharacterArtNotes();
  const backgroundNotes = getBackgroundNotes();
  const personalityNotes = getPersonalityNotes();
  const stats = buildStatsPayload();
  const armorClassInput = getArmorClassInput();
  const maxHpInput = getMaxHpInput();
  const currentHpInput = getCurrentHpInput();
  const tempHpInput = getTempHpInput();
  const heroicInspirationInput = getHeroicInspirationInput();
  const preparedNames = getPreparedSpellNames();
  const cantripNames = new Set(
    state.classSpells
      .filter(spell => Number(spell?.level) === 0)
      .map(spell => normalizeKey(spell.name))
  );
  const cantripFromAttacks = getCantripsFromAttacks()
    .filter(name => cantripNames.has(normalizeKey(name)));
  const cantrips = Array.from(new Set([...cantripFromAttacks, ...preparedNames.cantrips]));
  const classSkills = Array.from(state.classSkillSelections || []).join(', ');
  const languages = readSelectedLanguagesFromBox().join(', ');
  const currencyInputs = getCurrencyInputs();
  const currency = {
    cp: String(currencyInputs.cp?.value || '').trim(),
    sp: String(currencyInputs.sp?.value || '').trim(),
    ep: String(currencyInputs.ep?.value || '').trim(),
    gp: String(currencyInputs.gp?.value || '').trim(),
    pp: String(currencyInputs.pp?.value || '').trim(),
  };
  const inventoryItems = (state.inventoryItems || []).map(item => ({
    name: String(item.name || ''),
    key: String(item.key || ''),
    category: String(item.category || ''),
    qty: Number(item.qty) || 1,
    pack: item.pack ? String(item.pack.name || '') : '',
    pack_items: Array.isArray(item.pack?.items) ? item.pack.items : [],
  }));
  return {
    name: String(nameInput?.value || '').trim(),
    class: String(classSelect?.value || '').trim(),
    level: String(levelSelect?.value || '').trim(),
    background: String(backgroundSelect?.value || '').trim(),
    species: String(speciesSelect?.value || '').trim(),
    lineage: String(lineageSelect?.value || '').trim(),
    subclass: String(subclassSelect?.value || '').trim(),
    stats,
    cantrips: cantrips.join(', '),
    spells: preparedNames.spells.join(', '),
    class_skill_choices: classSkills,
    languages,
    currency: JSON.stringify(currency),
    notes: String(artNotes?.value || '').trim(),
    background_notes: String(backgroundNotes?.value || '').trim(),
    personality_notes: String(personalityNotes?.value || '').trim(),
    feature_choices: JSON.stringify(state.featureSelections || {}),
    wild_shape_forms: (state.wildShapeForms || []).join(', '),
    wild_shape_spent: String(state.wildShapeSpent || 0),
    wild_companion_active: String(state.wildCompanionActive),
    wild_companion_source: String(state.wildCompanionSource || 'wild_shape'),
    spell_slot_expended: JSON.stringify(state.spellSlotExpended || {}),
    manual_inventory: JSON.stringify(state.manualInventoryItems || []),
    inventory_items: JSON.stringify(inventoryItems),
    equipped_items: JSON.stringify(Array.from(state.equippedItems || [])),
    hand_equip: JSON.stringify(state.handEquip || {}),
    equipped_armor_key: String(state.equippedArmorKey || ''),
    combat_ac: String(armorClassInput?.value || '').trim(),
    combat_max_hp: String(maxHpInput?.value || '').trim(),
    combat_current_hp: String(currentHpInput?.value || '').trim(),
    combat_temp_hp: String(tempHpInput?.value || '').trim(),
    heroic_inspiration: String(!!heroicInspirationInput?.checked),
  };
}

async function saveWizardProfile() {
  const saveButton = getSaveButton();
  const status = getSaveStatus();
  if (status) status.textContent = 'Saving...';
  if (saveButton) saveButton.disabled = true;
  try {
    const abilityValidation = validateAbilityScores();
    if (!abilityValidation.ok) {
      if (status) status.textContent = abilityValidation.message || 'Ability scores invalid.';
      if (saveButton) saveButton.disabled = false;
      return;
    }
    const classSkillValidation = validateSkillSelection({
      limit: state.classSkillLimit,
      allowedKeys: Array.from(state.classSkillAllowed || []),
      selectedKeys: Array.from(state.classSkillSelections || []),
    });
    if (!classSkillValidation.ok) {
      if (status) status.textContent = classSkillValidation.message || 'Class skill selections invalid.';
      if (saveButton) saveButton.disabled = false;
      return;
    }
    const subclassEntry = getSelectedSubclassEntry();
    if (subclassEntry) {
      const requiredLevel = parseSubclassRequirement(subclassEntry);
      if (Number.isFinite(requiredLevel) && getCurrentLevel() < requiredLevel) {
        if (status) status.textContent = `Subclass unlocks at level ${requiredLevel}.`;
        if (saveButton) saveButton.disabled = false;
        return;
      }
    }
    if (hasMissingRequiredSelections()) {
      if (status) status.textContent = 'Complete required selections first.';
      maybePromptLevelSelections();
      if (saveButton) saveButton.disabled = false;
      return;
    }
    const payload = buildWizardPayload();
    const response = await fetch('/api/player/wizard/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (status) status.textContent = 'Saved';
  } catch (err) {
    console.warn('Save failed', err);
    if (status) status.textContent = 'Save failed';
  } finally {
    if (saveButton) saveButton.disabled = false;
    if (status) {
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    }
  }
}

function getPreparedLimits() {
  const row = getClassProgressionRow();
  const cantrips = Number(row?.cantrips);
  const prepared = Number(row?.prepared_spells);
  const bonus = getFeatureChoiceEffects().cantripsBonus;
  const totalCantrips = Number.isFinite(cantrips) ? cantrips + bonus : (Number.isFinite(bonus) ? bonus : null);
  let preparedSpellLimit = Number.isFinite(prepared) ? prepared : null;
  if (Number.isFinite(prepared) && Number.isFinite(totalCantrips)) {
    preparedSpellLimit = Math.max(prepared - totalCantrips, 0);
  }
  return {
    cantrips: Number.isFinite(totalCantrips) ? totalCantrips : null,
    prepared: preparedSpellLimit,
  };
}

function getPreparedCounts(maxLevel = null) {
  const prepared = state.preparedSpellIds || new Set();
  let cantrips = 0;
  let spells = 0;
  prepared.forEach(spellId => {
    const spell = state.classSpells.find(entry => entry.spell_id === spellId);
    const level = Number(spell?.level);
    if (!Number.isFinite(level)) return;
    if (level === 0) {
      cantrips += 1;
      return;
    }
    if (Number.isFinite(maxLevel) && level > maxLevel) return;
    spells += 1;
  });
  return { cantrips, spells };
}

function renderPreparedSpells() {
  const tbody = getPreparedSpellsTableBody();
  if (!tbody) return;
  tbody.innerHTML = '';
  const spells = Array.isArray(state.classSpells) ? state.classSpells : [];
  const prepared = state.preparedSpellIds || new Set();
  const maxLevel = Number.isFinite(state.maxSpellLevel) ? state.maxSpellLevel : null;
  const visible = spells
    .filter(spell => prepared.has(spell.spell_id))
    .filter(spell => {
      const level = Number(spell.level);
      if (Number.isNaN(level)) return false;
      if (level === 0) return true;
      if (maxLevel === null) return false;
      return level <= maxLevel;
    })
    .sort((a, b) => {
      const levelA = Number(a.level);
      const levelB = Number(b.level);
      if (levelA === levelB) return a.name.localeCompare(b.name);
      return levelA - levelB;
    });
  visible.forEach(spell => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatLevelLabel(Number(spell.level))}</td>
      <td>${spell.name || ''}</td>
      <td>${spell.casting_time || ''}</td>
      <td>${spell.range || ''}</td>
      <td>${buildCrmFlags(spell)}</td>
      <td>${spell.components || ''}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderSpellBook() {
  const tbody = getSpellBookTableBody();
  if (!tbody) return;
  tbody.innerHTML = '';
  const spells = Array.isArray(state.classSpells) ? state.classSpells : [];
  const prepared = state.preparedSpellIds || new Set();
  const maxLevel = Number.isFinite(state.maxSpellLevel) ? state.maxSpellLevel : null;
  if (!state.canCastSpells) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="7">Spellcasting disabled by untrained armor.</td>';
    tbody.appendChild(row);
    return;
  }
  const limits = getPreparedLimits();
  const counts = getPreparedCounts(maxLevel);
  const sorted = spells.slice().sort((a, b) => {
    const levelA = Number(a.level);
    const levelB = Number(b.level);
    if (levelA === levelB) return a.name.localeCompare(b.name);
    return levelA - levelB;
  });
  sorted.forEach(spell => {
    const level = Number(spell.level);
    if (Number.isNaN(level)) return;
    if (level !== 0) {
      if (maxLevel === null || level > maxLevel) return;
    }
    const row = document.createElement('tr');
    const checked = prepared.has(spell.spell_id) ? 'checked' : '';
    row.innerHTML = `
      <td><input type="checkbox" data-spell-id="${spell.spell_id}" ${checked}></td>
      <td>${formatLevelLabel(Number(spell.level))}</td>
      <td>${spell.name || ''}</td>
      <td>${spell.casting_time || ''}</td>
      <td>${spell.range || ''}</td>
      <td>${buildCrmFlags(spell)}</td>
      <td>${spell.components || ''}</td>
    `;
    tbody.appendChild(row);
  });
  tbody.querySelectorAll('input[type=\"checkbox\"]').forEach(input => {
    input.addEventListener('change', () => {
      const spellId = input.dataset.spellId;
      if (!spellId) return;
      const spell = state.classSpells.find(entry => entry.spell_id === spellId);
      const level = Number(spell?.level);
      const isCantrip = Number.isFinite(level) && level === 0;
      if (input.checked) {
        const nextCounts = getPreparedCounts(maxLevel);
        if (isCantrip && limits.cantrips !== null && nextCounts.cantrips >= limits.cantrips) {
          input.checked = false;
          return;
        }
        if (!isCantrip && limits.prepared !== null && nextCounts.spells >= limits.prepared) {
          input.checked = false;
          return;
        }
        state.preparedSpellIds.add(spellId);
      } else {
        state.preparedSpellIds.delete(spellId);
      }
      renderPreparedSpells();
      renderSpellBook();
    });
  });
  tbody.querySelectorAll('input[type=\"checkbox\"]').forEach(input => {
    const spellId = input.dataset.spellId;
    const spell = state.classSpells.find(entry => entry.spell_id === spellId);
    const level = Number(spell?.level);
    const isCantrip = Number.isFinite(level) && level === 0;
    if (!input.checked) {
      if (isCantrip && limits.cantrips !== null && counts.cantrips >= limits.cantrips) {
        input.disabled = true;
      } else if (!isCantrip && limits.prepared !== null && counts.spells >= limits.prepared) {
        input.disabled = true;
      } else {
        input.disabled = false;
      }
    } else {
      input.disabled = false;
    }
  });
}

function updateMaxSpellLevel() {
  const classEntry = getSelectedClassEntry();
  const fallbackName = classEntry?.name || '';
  const fallbackId = fallbackName ? `CLS_${normalizeKey(fallbackName)}` : '';
  const classId = classEntry?.class_id
    || state.classIdByName?.[normalizeName(fallbackName)]
    || fallbackId;
  const level = getCurrentLevel();
  if (!classId || !Number.isFinite(level)) {
    state.maxSpellLevel = null;
    renderSpellBook();
    renderPreparedSpells();
    return;
  }
  if (!getClassSpellcastingEligibility()) {
    state.maxSpellLevel = null;
    renderSpellBook();
    renderPreparedSpells();
    return;
  }
  const row = (state.classProgression || []).find(entry =>
    String(entry.class_id || '') === String(classId) && String(entry.level || '') === String(level)
  );
  const rawExplicit = row?.spell_level;
  if (rawExplicit !== undefined && rawExplicit !== null && String(rawExplicit).trim() !== '') {
    const explicit = Number(rawExplicit);
    if (Number.isFinite(explicit)) {
      state.maxSpellLevel = explicit;
      renderSpellBook();
      renderPreparedSpells();
      return;
    }
  }
  let maxSlot = null;
  for (let i = 9; i >= 1; i -= 1) {
    const key = `spell_slots_${i}`;
    const altKey = `spell_slots_level_${i}`;
    const value = Number(row?.[key] ?? row?.[altKey]);
    if (Number.isFinite(value) && value > 0) {
      maxSlot = i;
      break;
    }
  }
  state.maxSpellLevel = maxSlot;
  renderSpellBook();
  renderPreparedSpells();
}

async function populateClassSpellList() {
  const classEntry = getSelectedClassEntry();
  const classValue = classEntry?.class_id || classEntry?.name || '';
  if (!classValue) {
    state.classSpells = [];
    renderSpellBook();
    renderPreparedSpells();
    return;
  }
  if (!getClassSpellcastingEligibility()) {
    state.classSpells = [];
    renderSpellBook();
    renderPreparedSpells();
    return;
  }
  try {
    const response = await fetch(`/api/player/wizard/class-spells?class=${encodeURIComponent(classValue)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const spells = Array.isArray(data?.spells) ? data.spells : [];
    state.classSpells = spells.map(spell => ({
      spell_id: spell.spell_id,
      name: spell.name,
      level: Number.isFinite(Number(spell.level)) ? Number(spell.level) : spell.level,
      casting_time: spell.casting_time,
      range: spell.range,
      components: spell.components,
      duration: spell.duration,
      description: spell.description,
    }));
    renderSpellBook();
    renderPreparedSpells();
  } catch (err) {
    console.warn('Unable to load class spell list', err);
  }
}

function applyStandardArrayForClass() {
  if (getAbilityMethod() !== 'standard') return;
  const array = getStandardArrayForClass();
  if (!array) return;
  const toScore = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const bonuses = getAbilityBonusMap();
  const base = Array.isArray(array)
    ? {
        str: toScore(array[0]),
        dex: toScore(array[1]),
        con: toScore(array[2]),
        int: toScore(array[3]),
        wis: toScore(array[4]),
        cha: toScore(array[5]),
      }
    : {
        str: toScore(array.str),
        dex: toScore(array.dex),
        con: toScore(array.con),
        int: toScore(array.int),
        wis: toScore(array.wis),
        cha: toScore(array.cha),
      };
  ABILITY_KEYS.forEach(key => {
    const baseScore = base[key];
    if (!Number.isFinite(baseScore)) return;
    const total = baseScore + (bonuses[key] || 0);
    setAbilityScore(key, total);
  });
  updateAbilityScoreStatus();
}

function renderArmorOptions() {
  const select = getArmorSelect();
  if (!select) return;
  select.innerHTML = '';
  const unarmored = document.createElement('option');
  unarmored.value = '';
  unarmored.textContent = 'Unarmored';
  unarmored.selected = true;
  select.appendChild(unarmored);
  const seen = new Set();
  state.armor.forEach(entry => {
    const name = String(entry?.name || '').trim();
    if (!name) return;
    if (seen.has(name)) return;
    seen.add(name);
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
}

function getInitiativeAdjustment() {
  const select = getInitiativeAdjustSelect();
  const mode = select ? String(select.value || 'normal') : 'normal';
  if (mode === 'advantage') return 5;
  if (mode === 'disadvantage') return -5;
  return 0;
}

function updateInitiativeScore() {
  const scoreInput = getInitiativeScoreInput();
  const dexInput = getAbilityInputs().dex?.score;
  if (!scoreInput || !dexInput) return;
  const dexScore = Number(dexInput.value);
  if (!Number.isFinite(dexScore)) {
    scoreInput.value = '';
    return;
  }
  const mod = getModifierValue(dexScore);
  if (!Number.isFinite(mod)) {
    scoreInput.value = '';
    return;
  }
  const total = 10 + mod + getInitiativeAdjustment();
  scoreInput.value = total >= 0 ? `+${total}` : `${total}`;
}

function parseArmorBase(acText) {
  const raw = String(acText || '').trim();
  if (!raw) return null;
  const match = raw.match(/([+-]?\d+)/);
  if (!match) return null;
  const base = Number(match[1]);
  return Number.isFinite(base) ? base : null;
}

function armorUsesDex(acText) {
  return /dex/i.test(String(acText || ''));
}

function getEquippedShieldBonus() {
  const leftKey = state.handEquip?.left;
  const rightKey = state.handEquip?.right;
  if (!state.armorTraining?.shields) return 0;
  const armorItems = state.armor || [];
  const leftShield = armorItems.find(item =>
    leftKey && normalizeItemName(item?.name) === leftKey && /shield/i.test(String(item?.category || item?.name || ''))
  );
  const rightShield = armorItems.find(item =>
    rightKey && normalizeItemName(item?.name) === rightKey && /shield/i.test(String(item?.category || item?.name || ''))
  );
  const shield = leftShield || rightShield;
  if (!shield) return 0;
  const bonus = parseArmorBase(shield.ac || shield.armor_class);
  return Number.isFinite(bonus) ? bonus : 0;
}

function updateArmorClass() {
  const acInput = getArmorClassInput();
  const armorSelect = getArmorSelect();
  const dexInput = getAbilityInputs().dex?.score;
  if (!acInput || !dexInput) return;
  const selectedName = String(armorSelect?.value || '').trim();
  const equippedKey = state.equippedArmorKey;
  const fallbackArmor = equippedKey
    ? state.armor.find(entry => normalizeItemName(entry?.name) === equippedKey)
    : null;
  const fallbackName = fallbackArmor?.name || '';
  const dexScore = Number(dexInput.value);
  const mod = getModifierValue(dexScore);
  if (!Number.isFinite(mod)) {
    acInput.value = '';
    return;
  }
  let total = 10 + mod;
  const match = (selectedName
    ? state.armor.find(entry => String(entry?.name || '').trim() === selectedName)
    : null) || fallbackArmor;
  if (match) {
    const acText = match?.ac ?? match?.armor_class;
    const base = parseArmorBase(acText);
    if (Number.isFinite(base)) {
      total = base + (armorUsesDex(acText) ? mod : 0);
    }
  }
  total += getEquippedShieldBonus();
  acInput.readOnly = true;
  acInput.value = String(total);
}

async function loadWizardData() {
  const classSelect = getClassSelect();
  if (!classSelect) return;
  classSelect.disabled = true;
  classSelect.innerHTML = '<option value="">Loading classes...</option>';
  try {
    const response = await fetch('/api/player/wizard-data');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.classes = Array.isArray(data?.classes) ? data.classes : [];
    state.subclasses = (Array.isArray(data?.subclasses) ? data.subclasses : []).map(entry => ({
      ...entry,
      __classKeys: buildSubclassClassKeys(entry),
      __levelRequirement: parseSubclassRequirement(entry),
    }));
    state.backgrounds = Array.isArray(data?.backgrounds) ? data.backgrounds : [];
    state.species = Array.isArray(data?.species) ? data.species : [];
    state.lineages = Array.isArray(data?.lineages) ? data.lineages : [];
    state.standardArrayByClass = data?.standardArrayByClass || {};
    state.standardArrayByClassNormalized = data?.standardArrayByClassNormalized || {};
    state.standardArrayByClassId = data?.standardArrayByClassId || {};
    state.standardArrayGlobal = Array.isArray(data?.standardArrayGlobal) ? data.standardArrayGlobal : [];
    state.pointBuyCosts = data?.pointBuyCosts || {};
    state.normalizedClasses = Array.isArray(data?.normalizedClasses) ? data.normalizedClasses : [];
    state.armor = Array.isArray(data?.armor) ? data.armor : [];
    state.weapons = Array.isArray(data?.weapons) ? data.weapons : [];
    state.equipmentOptions = data?.equipmentOptions || {};
    state.adventuringPacks = data?.adventuringPacks || {};
    state.standardLanguages = Array.isArray(data?.standardLanguages) ? data.standardLanguages : [];
    state.rareLanguages = Array.isArray(data?.rareLanguages) ? data.rareLanguages : [];
    state.featureChoices = Array.isArray(data?.featureChoices) ? data.featureChoices : [];
    state.adventuringGear = Array.isArray(data?.adventuringGear) ? data.adventuringGear : [];
    state.creatures = Array.isArray(data?.creatures) ? data.creatures : [];
    state.classProgression = Array.isArray(data?.classProgression)
      ? data.classProgression.map(row => {
          const clean = {};
          Object.entries(row || {}).forEach(([key, value]) => {
            if (!key) return;
            const trimmedKey = String(key).trim();
            const trimmedValue = typeof value === 'string' ? value.trim() : value;
            clean[trimmedKey] = trimmedValue;
          });
          return clean;
        })
      : [];
    state.classIdByName = data?.classIdByName || {};
    renderClassOptions();
    renderBackgroundOptions();
    renderSpeciesOptions();
    renderLineageOptions();
    renderArmorOptions();
    renderInventoryOptions();
    applyInventoryEnforcement();
    renderAbilityBonusOptions();
    setAbilityMethod(state.abilityMethod);
    updateClassSelectAvailability();
    if (getAbilityMethod() === 'standard' && areAbilityScoresEmpty()) {
      applyStandardArrayForClass();
    }
  } catch (err) {
    console.error('Failed to load wizard data', err);
    classSelect.innerHTML = '<option value="">Unable to load classes</option>';
  } finally {
    classSelect.disabled = false;
    renderSubclassOptions();
  }
}

function setSelectByName(select, target) {
  if (!select || !target) return;
  const normalized = normalizeKey(target);
  for (const option of Array.from(select.options)) {
    if (normalizeKey(option.value) === normalized || normalizeKey(option.textContent) === normalized) {
      option.selected = true;
      return;
    }
  }
}

function resetWizardStateForLoad() {
  state.preparedSpellIds = new Set();
  state.classSkillSelections = new Set();
  state.featureSelections = {};
  state.featureSkillSelections = new Set();
  state.backgroundSkillSelections = new Set();
  state.classSkillAllowed = new Set();
  state.classSkillLimit = null;
  state.wildShapeForms = [];
  state.wildShapeSpent = 0;
  state.isWildShaped = false;
  state.wildShapeAttacks = [];
  state.activeWildShapeForm = null;
  state.wildCompanionActive = false;
  state.wildCompanionSource = 'wild_shape';
  state.spellSlotExpended = {};
  state.manualInventoryItems = [];
  state.inventorySelections = { class: 'A', background: 'A' };
  state.equippedItems = new Set();
  state.equippedArmorKey = null;
  state.handEquip = { left: null, right: null };
  state.inventoryItems = [];
  state.inventoryOverride = false;
  state.armorTraining = { light: false, medium: false, heavy: false, shields: false };
  state.weaponTraining = { simpleMelee: false, simpleRanged: false, martialMelee: false, martialRanged: false };
  state.canCastSpells = true;
}

async function applyProfile(profile = {}) {
  const classSelect = getClassSelect();
  const subclassSelect = getSubclassSelect();
  resetWizardStateForLoad();
  if (profile.inventory_items) {
    try {
      const parsed = JSON.parse(profile.inventory_items);
      if (Array.isArray(parsed)) {
        state.inventoryItems = parsed
          .filter(entry => entry && entry.name)
          .map(entry => {
            const packName = String(entry.pack || '').trim();
            const packItems = Array.isArray(entry.pack_items) ? entry.pack_items : [];
            const pack = packName ? getPackByName(packName) || { name: packName, items: packItems } : null;
            return {
              name: String(entry.name),
              key: String(entry.key || normalizeItemName(entry.name)),
              category: String(entry.category || 'other'),
              qty: Number(entry.qty) || 1,
              pack,
            };
          });
        state.inventoryOverride = true;
      }
    } catch (err) {
      console.warn('Failed to parse inventory items', err);
    }
  }
  if (profile.equipped_items) {
    try {
      const parsed = JSON.parse(profile.equipped_items);
      if (Array.isArray(parsed)) {
        state.equippedItems = new Set(parsed.map(item => String(item)));
      }
    } catch (err) {
      console.warn('Failed to parse equipped items', err);
    }
  }
  if (profile.hand_equip) {
    try {
      const parsed = JSON.parse(profile.hand_equip);
      if (parsed && typeof parsed === 'object') {
        state.handEquip = {
          left: parsed.left ? String(parsed.left) : null,
          right: parsed.right ? String(parsed.right) : null,
        };
      }
    } catch (err) {
      console.warn('Failed to parse hand equip', err);
    }
  }
  if (profile.equipped_armor_key) {
    state.equippedArmorKey = String(profile.equipped_armor_key || '') || null;
  }
  if (classSelect) classSelect.value = '';
  if (subclassSelect) subclassSelect.value = '';
  const backgroundSelect = getBackgroundSelect();
  if (backgroundSelect) backgroundSelect.value = '';
  const speciesSelect = getSpeciesSelect();
  if (speciesSelect) speciesSelect.value = '';
  const lineageSelect = getLineageSelect();
  if (lineageSelect) lineageSelect.value = '';
  const nameInput = getCharacterNameInput();
  if (nameInput) nameInput.value = '';
  const artNotes = getCharacterArtNotes();
  if (artNotes) artNotes.value = '';
  const backgroundNotes = getBackgroundNotes();
  if (backgroundNotes) backgroundNotes.value = '';
  const personalityNotes = getPersonalityNotes();
  if (personalityNotes) personalityNotes.value = '';
  const currencyInputs = getCurrencyInputs();
  if (currencyInputs.cp) currencyInputs.cp.value = '';
  if (currencyInputs.sp) currencyInputs.sp.value = '';
  if (currencyInputs.ep) currencyInputs.ep.value = '';
  if (currencyInputs.gp) currencyInputs.gp.value = '';
  if (currencyInputs.pp) currencyInputs.pp.value = '';

  setLevelFromProfile(profile.level);
  if (profile.class && classSelect) {
    setSelectByName(classSelect, profile.class);
    renderSubclassOptions();
    if (profile.subclass && subclassSelect) {
      setSelectByName(subclassSelect, profile.subclass);
    }
  }
  if (profile.background && backgroundSelect) {
    setSelectByName(backgroundSelect, profile.background);
  }
  if (profile.name && nameInput) {
    nameInput.value = String(profile.name);
  }
  if (profile.species && speciesSelect) {
    setSelectByName(speciesSelect, profile.species);
  }
  if (!profile.species && profile.lineage && speciesSelect) {
    const lineageMatch = state.lineages.find(entry =>
      normalizeKey(entry?.name) === normalizeKey(profile.lineage)
    );
    if (lineageMatch?.species_id) {
      const speciesMatch = state.species.find(entry =>
        normalizeKey(entry?.species_id) === normalizeKey(lineageMatch.species_id)
      );
      if (speciesMatch?.name) {
        setSelectByName(speciesSelect, speciesMatch.name);
      }
    }
  }
  renderLineageOptions();
  if (profile.lineage && lineageSelect) {
    setSelectByName(lineageSelect, profile.lineage);
  }
  updateSpeciesTraits();
  updateFeatsFromBackground();
  updateSpellcastingEligibility();
  renderAbilityBonusOptions();
  updateClassSelectAvailability();
  const savedLanguages = String(profile.languages || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  renderLanguagesSelection(savedLanguages);
  updateSavingThrowsFromClass();
  updateSpellcastingStats();
  updateInventory();
  if (profile.class_skill_choices) {
    const skills = String(profile.class_skill_choices || '')
      .split(',')
      .map(item => normalizeName(item))
      .filter(Boolean);
    state.classSkillSelections = new Set(skills);
  }
  refreshSkillProficiencies(false);
  applyStandardArrayForClass();
  updateAbilityScoreStatus();
  updateInitiativeScore();
  updateArmorClass();
  updateHitPoints();
  updateHitDiceTotal();
  if (profile.combat_current_hp) {
    const currentHp = getCurrentHpInput();
    if (currentHp) currentHp.value = String(profile.combat_current_hp || '');
  }
  if (profile.combat_temp_hp) {
    const tempHp = getTempHpInput();
    if (tempHp) tempHp.value = String(profile.combat_temp_hp || '');
  }
  const heroicInspirationInput = getHeroicInspirationInput();
  if (heroicInspirationInput) {
    heroicInspirationInput.checked = String(profile.heroic_inspiration) === 'true';
  }
  const savedCantrips = String(profile.cantrips || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  await populateClassSpellList();
  if (profile.spells || savedCantrips.length) {
    const preparedNames = String(profile.spells || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    const nameToId = new Map(
      state.classSpells.map(spell => [normalizeKey(spell.name), spell.spell_id])
    );
    savedCantrips.forEach(name => {
      const id = nameToId.get(normalizeKey(name));
      if (id) preparedNames.push(name);
    });
    state.preparedSpellIds = new Set(
      preparedNames
        .map(name => nameToId.get(normalizeKey(name)))
        .filter(Boolean)
    );
    renderSpellBook();
    renderPreparedSpells();
  } else {
    renderSpellBook();
    renderPreparedSpells();
  }
    if (profile.feature_choices) {
      try {
        const parsed = JSON.parse(profile.feature_choices);
        if (parsed && typeof parsed === 'object') {
          const normalized = {};
        Object.entries(parsed).forEach(([key, value]) => {
          if (typeof value === 'string') {
            normalized[key] = { option: value };
          } else if (value && typeof value === 'object') {
            normalized[key] = value;
          }
        });
          state.featureSelections = normalized;
          updateFeatureSkillSelections();
          refreshSkillProficiencies(false);
          renderLanguagesSelection(readSelectedLanguagesFromBox());
          updateClassFeatures();
        }
      } catch (err) {
        console.warn('Failed to parse feature choices', err);
      }
    }
  if (profile.wild_shape_forms) {
    state.wildShapeForms = String(profile.wild_shape_forms || '')
      .split(',')
      .map(item => normalizeCreatureName(item))
      .filter(Boolean);
  }
  if (profile.wild_shape_spent) {
    const spent = Number(profile.wild_shape_spent);
    state.wildShapeSpent = Number.isFinite(spent) ? spent : 0;
  }
  if (profile.currency) {
    try {
      const parsed = JSON.parse(profile.currency);
      const inputs = getCurrencyInputs();
      if (parsed && typeof parsed === 'object') {
        if (inputs.cp) inputs.cp.value = parsed.cp ?? '';
        if (inputs.sp) inputs.sp.value = parsed.sp ?? '';
        if (inputs.ep) inputs.ep.value = parsed.ep ?? '';
        if (inputs.gp) inputs.gp.value = parsed.gp ?? '';
        if (inputs.pp) inputs.pp.value = parsed.pp ?? '';
      }
    } catch (err) {
      console.warn('Failed to parse currency', err);
    }
  }
  if (artNotes && profile.notes) artNotes.value = String(profile.notes || '');
  if (backgroundNotes && profile.background_notes) {
    backgroundNotes.value = String(profile.background_notes || '');
  }
  if (personalityNotes && profile.personality_notes) {
    personalityNotes.value = String(profile.personality_notes || '');
  }
  if (profile.wild_companion_active) {
    state.wildCompanionActive = String(profile.wild_companion_active) === 'true';
  }
  if (profile.wild_companion_source) {
    state.wildCompanionSource = String(profile.wild_companion_source);
  }
  if (profile.spell_slot_expended) {
    try {
      const parsed = JSON.parse(profile.spell_slot_expended);
      if (parsed && typeof parsed === 'object') {
        state.spellSlotExpended = parsed;
      }
    } catch (err) {
      console.warn('Failed to parse spell slots', err);
    }
  }
  if (profile.manual_inventory) {
    try {
      const parsed = JSON.parse(profile.manual_inventory);
      if (Array.isArray(parsed)) {
        state.manualInventoryItems = parsed
          .filter(entry => entry && entry.name)
          .map(entry => ({
            name: String(entry.name),
            qty: Number(entry.qty) || 1,
          }));
      }
    } catch (err) {
      console.warn('Failed to parse manual inventory', err);
    }
  }
  updateMaxSpellLevel();
  updateProficiencyBonus();
  updateClassFeatures();
  applyArmorTrainingFromClass();
  applyWeaponTrainingFromClass();
  updateArmorTrainingEffects();
  updateWildShapePanel();
  maybePromptLevelSelections();
}

function getLoadCharacterId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('load');
  return id ? String(id).trim() : '';
}

function getNewCharacterFlag() {
  const params = new URLSearchParams(window.location.search);
  const flag = params.get('new');
  return flag === '1' || flag === 'true';
}

function setLoadCharacterId(id) {
  const url = new URL(window.location.href);
  if (id) {
    url.searchParams.set('load', String(id));
    url.searchParams.delete('new');
  } else {
    url.searchParams.delete('load');
  }
  window.history.replaceState({}, '', url.toString());
}

function showWizardWarning(message) {
  let banner = document.getElementById('wizard-load-warning');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'wizard-load-warning';
    banner.className = 'wizard-warning';
    banner.setAttribute('role', 'alert');
    const nav = document.querySelector('.header-nav');
    if (nav && nav.parentElement) {
      nav.insertAdjacentElement('afterend', banner);
    } else {
      document.body.insertAdjacentElement('afterbegin', banner);
    }
  }
  banner.textContent = message;
  banner.hidden = false;
}

async function loadSavedProfile() {
  const loadId = getLoadCharacterId();
  if (loadId) {
    try {
      const response = await fetch('/api/player/characters/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loadId }),
      });
      if (!response.ok) {
        let detail = '';
        try {
          const errData = await response.json();
          detail = errData?.error ? ` (${errData.error})` : '';
        } catch {
          detail = '';
        }
        throw new Error(`HTTP ${response.status}${detail}`);
      }
      const data = await response.json();
      console.log('[wizard] load id', loadId, 'response', data);
      if (data?.id && data.id !== loadId) {
        showWizardWarning(`Loaded character mismatch: requested ${loadId}, got ${data.id}.`);
        return;
      }
      await applyProfile(data.character || {});
      const loadedName = data?.name || data?.character?.name || loadId;
      const loadedId = data?.id || loadId;
      setLoadCharacterId(loadedId);
      showWizardWarning(`Loaded character: ${loadedName} (id: ${loadedId})`);
      return;
    } catch (err) {
      console.warn('Unable to load character from link', err);
      showWizardWarning(`Unable to load character from link (${loadId}): ${err.message}`);
      return;
    }
  }
  try {
    const response = await fetch('/api/player/profile');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const profile = data.profile || {};
    await applyProfile(profile);
  } catch (err) {
    console.warn('Unable to load saved profile', err);
  }
}

function setLevelFromProfile(value) {
  const select = getLevelSelect();
  if (!select) return;
  const normalized = Number(value);
  const candidate = Number.isFinite(normalized) && normalized >= 1 ? Math.min(20, Math.floor(normalized)) : 1;
  select.value = String(candidate);
}

async function refreshSavedCharactersList() {
  const select = getSidebarLoadSelect();
  if (!select) return;
  select.innerHTML = '<option value="">Select a saved character</option>';
  try {
    const response = await fetch('/api/player/characters/list');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const characters = Array.isArray(data.characters) ? data.characters : [];
    characters.forEach(entry => {
      if (!entry?.id) return;
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.name || 'Unnamed Character';
      select.appendChild(option);
    });
  } catch (err) {
    console.warn('Unable to load character list', err);
  }
}

async function saveCharacterAs() {
  const status = getSaveStatus();
  const list = getSidebarLoadSelect();
  const name = prompt('Save character as:');
  if (!name) return;
  const trimmed = String(name).trim();
  if (!trimmed) return;
  if (status) status.textContent = 'Saving...';
  try {
    const listResponse = await fetch('/api/player/characters/list');
    const listData = listResponse.ok ? await listResponse.json() : {};
    const characters = Array.isArray(listData.characters) ? listData.characters : [];
    const exists = characters.find(entry => normalizeName(entry?.name) === normalizeName(trimmed));
    if (exists) {
      const overwrite = confirm(`Overwrite "${exists.name}"?`);
      if (!overwrite) {
        if (status) status.textContent = '';
        return;
      }
    }
    const payload = buildWizardPayload();
    const response = await fetch('/api/player/characters/save-as', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed, payload }),
    });
    if (!response.ok) {
      let detail = '';
      try {
        const errData = await response.json();
        detail = errData?.error ? ` (${errData.error})` : '';
      } catch {
        detail = '';
      }
      throw new Error(`HTTP ${response.status}${detail}`);
    }
    const data = await response.json();
    await refreshSavedCharactersList();
    if (list && data?.id) list.value = data.id;
    if (status) status.textContent = 'Saved';
  } catch (err) {
    console.warn('Save As failed', err);
    if (status) status.textContent = 'Save failed';
    alert(`Save failed: ${err.message}`);
  } finally {
    if (status) {
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    }
  }
}

async function loadCharacterFromBank() {
  const select = getSidebarLoadSelect();
  const status = getSaveStatus();
  if (!select || !select.value) {
    alert('Select a saved character to load.');
    return;
  }
  if (status) status.textContent = 'Loading...';
  try {
    const response = await fetch('/api/player/characters/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: select.value }),
    });
    if (!response.ok) {
      let detail = '';
      try {
        const errData = await response.json();
        detail = errData?.error ? ` (${errData.error})` : '';
      } catch {
        detail = '';
      }
      throw new Error(`HTTP ${response.status}${detail}`);
    }
    const data = await response.json();
    await applyProfile(data.character || {});
    setLoadCharacterId(data?.id || select.value);
    if (status) status.textContent = 'Loaded';
  } catch (err) {
    console.warn('Load failed', err);
    if (status) status.textContent = 'Load failed';
    alert(`Load failed: ${err.message}`);
  } finally {
    if (status) {
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    }
  }
}

async function startNewCharacter() {
  const confirmReset = confirm('Start a new character? Unsaved changes will be lost.');
  if (!confirmReset) return;
  await applyProfile({ level: 0 });
  setLoadCharacterId('');
  const abilities = getAbilityInputs();
  Object.keys(abilities).forEach(key => {
    setAbilityScore(key, Number.NaN);
  });
  const abilityMethodSelect = getAbilityMethodSelect();
  if (abilityMethodSelect) abilityMethodSelect.value = 'standard';
  const bonusPlus2 = getAbilityBonusPlus2Select();
  if (bonusPlus2) bonusPlus2.value = '';
  const bonusPlus1 = getAbilityBonusPlus1Select();
  if (bonusPlus1) bonusPlus1.value = '';
  state.abilityMethod = 'standard';
  const levelSelect = getLevelSelect();
  if (levelSelect) levelSelect.value = '0';
  const maxHp = getMaxHpInput();
  if (maxHp) maxHp.value = '';
  const tempHp = getTempHpInput();
  if (tempHp) tempHp.value = '';
  const hitDiceTotal = getHitDiceTotalInput();
  if (hitDiceTotal) hitDiceTotal.value = '';
  const hitDiceSpent = getHitDiceSpentInput();
  if (hitDiceSpent) hitDiceSpent.value = '';
  const currentHp = document.querySelector('.hp-current');
  if (currentHp) currentHp.value = '';
  updateEquippedGearFromInventory();
  updateSpellcastingStats();
  updateClassFeatures();
  updateSpeciesTraits();
  updateFeatsFromBackground();
  renderLanguagesSelection([]);
  updateAbilityScoreStatus();
  state.pendingFirstLevelPrompt = true;
  state.forceFirstLevelModal = true;
  const classSelect = getClassSelect();
  if (classSelect && String(classSelect.value || '').trim()) {
    const nextRow = getClassProgressionRowForLevel(1);
    if (nextRow) {
      showLevelUpModal(null, nextRow);
    }
    state.pendingFirstLevelPrompt = false;
  }
}

async function startNewCharacterSilently() {
  await applyProfile({ level: 0 });
  setLoadCharacterId('');
  const abilities = getAbilityInputs();
  Object.keys(abilities).forEach(key => {
    setAbilityScore(key, Number.NaN);
  });
  const abilityMethodSelect = getAbilityMethodSelect();
  if (abilityMethodSelect) abilityMethodSelect.value = 'standard';
  const bonusPlus2 = getAbilityBonusPlus2Select();
  if (bonusPlus2) bonusPlus2.value = '';
  const bonusPlus1 = getAbilityBonusPlus1Select();
  if (bonusPlus1) bonusPlus1.value = '';
  state.abilityMethod = 'standard';
  const levelSelect = getLevelSelect();
  if (levelSelect) levelSelect.value = '0';
  const maxHp = getMaxHpInput();
  if (maxHp) maxHp.value = '';
  const tempHp = getTempHpInput();
  if (tempHp) tempHp.value = '';
  const hitDiceTotal = getHitDiceTotalInput();
  if (hitDiceTotal) hitDiceTotal.value = '';
  const hitDiceSpent = getHitDiceSpentInput();
  if (hitDiceSpent) hitDiceSpent.value = '';
  const currentHp = document.querySelector('.hp-current');
  if (currentHp) currentHp.value = '';
  updateEquippedGearFromInventory();
  updateSpellcastingStats();
  updateClassFeatures();
  updateSpeciesTraits();
  updateFeatsFromBackground();
  renderLanguagesSelection([]);
  updateAbilityScoreStatus();
  state.pendingFirstLevelPrompt = true;
  state.forceFirstLevelModal = true;
  const classSelect = getClassSelect();
  if (classSelect && String(classSelect.value || '').trim()) {
    const nextRow = getClassProgressionRowForLevel(1);
    if (nextRow) {
      showLevelUpModal(null, nextRow);
    }
    state.pendingFirstLevelPrompt = false;
  }
}

function attachListeners() {
  const classSelect = getClassSelect();
  const levelSelect = getLevelSelect();
  const speciesSelect = getSpeciesSelect();
  const backgroundSelect = getBackgroundSelect();
  const initiativeAdjust = getInitiativeAdjustSelect();
  const armorSelect = getArmorSelect();
  const hitDiceSpent = getHitDiceSpentInput();
  const abilityInputs = getAbilityInputs();
  const saveButton = getSaveButton();
  const sidebarSave = getSidebarSaveButton();
  const sidebarSaveAs = getSidebarSaveAsButton();
  const sidebarLoad = getSidebarLoadButton();
  const sidebarNew = getSidebarNewButton();
  const sidebarLevelUp = getSidebarLevelUpButton();
  const sidebarLevelDown = getSidebarLevelDownButton();
  const sidebarShortRest = getSidebarShortRestButton();
  const sidebarLongRest = getSidebarLongRestButton();
  const sidebarBack = getSidebarBackButton();
  const levelUpClose = getLevelUpCloseButton();
  const artInput = getCharacterArtInput();
  const inventoryButtons = getInventoryOptionButtons();
  const inventoryAdd = getInventoryAddButton();
  const inventoryShop = getInventoryShopButton();
  const inventorySell = getInventorySellButton();
  const inventoryTrade = getInventoryTradeButton();
  const wildShapeSpent = getWildShapeSpentInput();
  const wildShapeAdd = getWildShapeAddButton();
  const wildShapeTransform = getWildShapeTransformButton();
  const wildShapeRevert = getWildShapeRevertButton();
  const wildCompanionSource = getWildCompanionSourceSelect();
  const wildCompanionSummon = getWildCompanionSummonButton();
  const wildCompanionDismiss = getWildCompanionDismissButton();
  const currencyInputs = getCurrencyInputs();
  const genName = getGenerateNameButton();
  const genBackground = getGenerateBackgroundButton();
  if (classSelect) {
    classSelect.addEventListener('change', () => {
      state.inventoryOverride = false;
      if (state.pendingFirstLevelPrompt && getCurrentLevel() === 0) {
        const levelSelect = getLevelSelect();
        state.pendingFirstLevelPrompt = false;
        state.deferLevelUpModal = true;
        if (levelSelect) {
          levelSelect.value = '1';
          levelSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      renderSubclassOptions();
      applyStandardArrayForClass();
      updateHitPoints();
      updateHitDiceTotal();
      state.preparedSpellIds = new Set();
      state.featureSelections = {};
      updateSpellcastingEligibility();
      populateClassSpellList();
      updateMaxSpellLevel();
      updateProficiencyBonus();
      updateClassFeatures();
      applyArmorTrainingFromClass();
      applyWeaponTrainingFromClass();
      updateArmorTrainingEffects();
      updateSpellSlotsFromProgression();
      updateWildShapePanel();
      renderLanguagesSelection(readSelectedLanguagesFromBox());
      updateSavingThrowsFromClass();
      updateSpellcastingStats();
      state.inventorySelections.class = 'A';
      updateInventory();
      refreshSkillProficiencies(true);
      if (state.deferLevelUpModal && getCurrentLevel() === 1) {
        const nextRow = getClassProgressionRowForLevel(1);
        if (nextRow) {
          showLevelUpModal(null, nextRow);
        }
      }
      if (state.forceFirstLevelModal) {
        const nextRow = getClassProgressionRowForLevel(getCurrentLevel());
        if (nextRow) {
          showLevelUpModal(null, nextRow);
        }
        state.forceFirstLevelModal = false;
      }
      updateClassSelectAvailability();
    });
  }
  if (levelSelect) {
    levelSelect.addEventListener('change', () => {
      renderSubclassOptions();
      updateHitPoints();
      updateHitDiceTotal();
      updateMaxSpellLevel();
      updateProficiencyBonus();
      updateClassFeatures();
      applyArmorTrainingFromClass();
      applyWeaponTrainingFromClass();
      updateArmorTrainingEffects();
      updateSpellSlotsFromProgression();
      updateWildShapePanel();
      if (state.deferLevelUpModal) {
        state.deferLevelUpModal = false;
        return;
      }
      maybePromptLevelSelections();
    });
  }
  if (speciesSelect) {
    speciesSelect.addEventListener('change', () => {
      renderLineageOptions();
      updateSpeciesTraits();
      renderLanguagesSelection(readSelectedLanguagesFromBox());
      applyStandardArrayForClass();
      updateAbilityScoreStatus();
      updateClassSelectAvailability();
    });
  }
  if (backgroundSelect) {
    backgroundSelect.addEventListener('change', () => {
      state.inventoryOverride = false;
      updateFeatsFromBackground();
      renderLanguagesSelection(readSelectedLanguagesFromBox());
      refreshSkillProficiencies(false);
      state.inventorySelections.background = 'A';
      updateInventory();
      renderAbilityBonusOptions();
      if (getAbilityMethod() === 'standard') {
        applyStandardArrayForClass();
      } else {
        updateAbilityScoreStatus();
      }
      updateClassSelectAvailability();
    });
  }
  if (saveButton) {
    saveButton.addEventListener('click', () => saveWizardProfile());
  }
  if (sidebarSave) {
    sidebarSave.addEventListener('click', () => saveWizardProfile());
  }
  if (sidebarSaveAs) {
    sidebarSaveAs.addEventListener('click', () => {
      saveCharacterAs();
    });
  }
  if (sidebarLoad) {
    sidebarLoad.addEventListener('click', () => {
      loadCharacterFromBank();
    });
  }
  if (sidebarNew) {
    sidebarNew.addEventListener('click', () => {
      startNewCharacter();
    });
  }
  if (sidebarLevelUp) {
    sidebarLevelUp.addEventListener('click', () => {
      const select = getLevelSelect();
      if (!select) return;
      const current = getCurrentLevel();
      if (current >= 20) return;
      const prevRow = getClassProgressionRow();
      select.value = String(current + 1);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(() => {
        const nextRow = getClassProgressionRow();
        showLevelUpModal(prevRow, nextRow);
      }, 0);
    });
  }
  if (sidebarLevelDown) {
    sidebarLevelDown.addEventListener('click', () => {
      const select = getLevelSelect();
      if (!select) return;
      const current = getCurrentLevel();
      if (current <= 0) return;
      select.value = String(current - 1);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  if (sidebarShortRest) {
    sidebarShortRest.addEventListener('click', () => {
      if (state.wildShapeSpent > 0) {
        state.wildShapeSpent -= 1;
        const spentInput = getWildShapeSpentInput();
        if (spentInput) spentInput.value = String(state.wildShapeSpent);
      }
      updateWildShapePanel();
    });
  }
  if (sidebarLongRest) {
    sidebarLongRest.addEventListener('click', () => {
      state.wildShapeSpent = 0;
      const spentInput = getWildShapeSpentInput();
      if (spentInput) spentInput.value = String(state.wildShapeSpent);
      const tempHp = getTempHpInput();
      if (tempHp) tempHp.value = '';
      state.isWildShaped = false;
      state.wildShapeAttacks = [];
      state.activeWildShapeForm = null;
      state.wildCompanionActive = false;
      state.spellSlotExpended = {};
      updateEquippedGearFromInventory();
      updateWildShapePanel();
      updateSpellSlotsFromProgression();
      const refreshable = getRefreshableFeatureChoices();
      if (refreshable.length) {
        const shouldRefresh = confirm('Update long-rest feature choices (e.g., Weapon Mastery)?');
        if (shouldRefresh) {
          clearRefreshableFeatureSelections();
          const row = getClassProgressionRow();
          if (row) {
            showLevelUpModal(null, { ...row, __title: 'Long Rest Choices', __showRefreshable: true, __changes: [] });
          }
        }
      }
    });
  }
  if (sidebarBack) {
    sidebarBack.addEventListener('click', () => window.history.back());
  }
  if (levelUpClose) {
    levelUpClose.addEventListener('click', () => {
      if (!validateLevelUpSelections()) return;
      const modal = getLevelUpModal();
      if (!modal) return;
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    });
  }
  if (artInput) {
    artInput.addEventListener('change', () => {
      const file = artInput.files && artInput.files[0];
      updateCharacterArtPreview(file);
    });
  }

  const artPreview = getCharacterArtPreview();
  if (artPreview) {
    artPreview.addEventListener('click', () => {
      if (artInput) artInput.click();
    });
    artPreview.addEventListener('dragover', event => {
      event.preventDefault();
      artPreview.classList.add('dragover');
    });
    artPreview.addEventListener('dragleave', () => {
      artPreview.classList.remove('dragover');
    });
    artPreview.addEventListener('drop', event => {
      event.preventDefault();
      artPreview.classList.remove('dragover');
      const file = event.dataTransfer?.files && event.dataTransfer.files[0];
      if (!file) return;
      updateCharacterArtPreview(file);
      if (artInput && window.DataTransfer) {
        const data = new DataTransfer();
        data.items.add(file);
        artInput.files = data.files;
      }
    });
  }
  inventoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      const group = button.dataset.optionGroup;
      const option = button.dataset.option;
      if (!group || !option) return;
      state.inventoryOverride = false;
      state.inventorySelections[group] = option;
      updateInventory();
    });
  });
  if (initiativeAdjust) {
    initiativeAdjust.addEventListener('change', () => updateInitiativeScore());
  }
  if (armorSelect) {
    armorSelect.addEventListener('change', () => {
      const selectedName = String(armorSelect.value || '').trim();
      if (selectedName) {
        const armorItem = state.armor.find(entry => normalizeItemName(entry?.name) === normalizeItemName(selectedName));
        if (armorItem && !isArmorTrainedForItem(armorItem)) {
          armorSelect.value = '';
          const warning = getArmorTrainingWarning();
          if (warning) warning.textContent = 'Cannot equip armor you are not trained to use.';
        }
      }
      updateArmorClass();
    });
  }
  if (hitDiceSpent) {
    hitDiceSpent.addEventListener('input', () => updateHitDiceTotal());
  }
  if (wildShapeSpent) {
    wildShapeSpent.addEventListener('input', () => {
      const maxUses = getWildShapeMaxUses();
      const value = Number(wildShapeSpent.value);
      const previous = Number(state.wildShapeSpent) || 0;
      const clamped = Math.max(0, Math.min(Number.isFinite(value) ? value : 0, maxUses));
      state.wildShapeSpent = clamped;
      wildShapeSpent.value = String(clamped);
      if (clamped > previous) {
        const tempHp = getTempHpInput();
        const level = getCurrentLevel();
        if (tempHp) tempHp.value = Number.isFinite(level) ? String(level) : '';
      }
      updateWildShapePanel();
    });
  }
  if (wildShapeAdd) {
    wildShapeAdd.addEventListener('click', () => {
      const select = getWildShapeFormSelect();
      if (!select) return;
      const key = String(select.value || '').trim();
      if (!key) return;
      if (!state.wildShapeForms.includes(key)) {
        state.wildShapeForms.push(key);
      }
      select.value = '';
      updateWildShapePanel();
    });
  }
  if (wildShapeTransform) {
    wildShapeTransform.addEventListener('click', () => {
      const maxUses = getWildShapeMaxUses();
      const spentInput = getWildShapeSpentInput();
      const tempHp = getTempHpInput();
      const formSelect = getWildShapeFormSelect();
      const level = getCurrentLevel();
      const currentSpent = Number(state.wildShapeSpent) || 0;
      if (currentSpent >= maxUses) return;
      let formKey = String(formSelect?.value || '').trim();
      const applyTransform = key => {
        const creature = getCreatureByKey(key);
        const attacks = parseCreatureAttacks(creature?.actions || '');
        state.wildShapeAttacks = attacks;
        state.isWildShaped = true;
        state.activeWildShapeForm = key;
        state.wildShapeSpent = currentSpent + 1;
        if (spentInput) spentInput.value = String(state.wildShapeSpent);
        if (tempHp) tempHp.value = Number.isFinite(level) ? String(level) : '';
        updateEquippedGearFromInventory();
        updateWildShapePanel();
      };
      if (!formKey) {
        const forms = Array.isArray(state.wildShapeForms) ? state.wildShapeForms : [];
        if (forms.length > 1) {
          openWildShapeModal(forms, chosen => applyTransform(chosen));
          return;
        }
        formKey = forms[0] || '';
      }
      if (formKey) {
        applyTransform(formKey);
      }
    });
  }
  if (wildShapeRevert) {
    wildShapeRevert.addEventListener('click', () => {
      state.isWildShaped = false;
      state.wildShapeAttacks = [];
      state.activeWildShapeForm = null;
      updateEquippedGearFromInventory();
      updateWildShapePanel();
    });
  }
  if (wildCompanionSource) {
    wildCompanionSource.addEventListener('change', () => {
      state.wildCompanionSource = String(wildCompanionSource.value || 'wild_shape');
      updateWildShapePanel();
    });
  }
  if (wildCompanionSummon) {
    wildCompanionSummon.addEventListener('click', () => {
      if (state.wildCompanionActive) return;
      const source = state.wildCompanionSource || 'wild_shape';
      if (source === 'wild_shape') {
        const maxUses = getWildShapeMaxUses();
        if (state.wildShapeSpent >= maxUses) return;
        state.wildShapeSpent += 1;
        const spentInput = getWildShapeSpentInput();
        if (spentInput) spentInput.value = String(state.wildShapeSpent);
      }
      state.wildCompanionActive = true;
      updateWildShapePanel();
    });
  }
  if (wildCompanionDismiss) {
    wildCompanionDismiss.addEventListener('click', () => {
      state.wildCompanionActive = false;
      updateWildShapePanel();
    });
  }
  Object.entries(abilityInputs).forEach(([key, inputs]) => {
    if (!inputs?.score) return;
    inputs.score.addEventListener('input', () => {
      const value = Number(inputs.score.value);
      setAbilityScore(key, Number.isFinite(value) ? value : NaN);
      updateAbilityScoreStatus();
    });
  });
  const abilityMethodSelect = getAbilityMethodSelect();
  if (abilityMethodSelect) {
    abilityMethodSelect.addEventListener('change', () => {
      setAbilityMethod(abilityMethodSelect.value);
    });
  }
  const bonusPlus2 = getAbilityBonusPlus2Select();
  if (bonusPlus2) {
    bonusPlus2.addEventListener('change', () => {
      updateAbilityBonusSelectionState();
      if (getAbilityMethod() === 'standard') {
        applyStandardArrayForClass();
        return;
      }
      updateAbilityScoreStatus();
    });
  }
  const bonusPlus1 = getAbilityBonusPlus1Select();
  if (bonusPlus1) {
    bonusPlus1.addEventListener('change', () => {
      updateAbilityBonusSelectionState();
      if (getAbilityMethod() === 'standard') {
        applyStandardArrayForClass();
        return;
      }
      updateAbilityScoreStatus();
    });
  }

  if (currencyInputs.cp) {
    currencyInputs.cp.addEventListener('input', () => normalizeCurrency());
  }

  if (inventoryAdd) {
    inventoryAdd.addEventListener('click', () => {
      openInventoryModal('add');
    });
  }
  if (inventoryShop) {
    inventoryShop.addEventListener('click', () => {
      openInventoryModal('shop');
    });
  }
  if (inventorySell) {
    inventorySell.addEventListener('click', () => {
      openInventoryModal('sell');
    });
  }
  if (inventoryTrade) {
    inventoryTrade.addEventListener('click', () => {
      openTradeModal();
    });
  }
  if (genName) {
    genName.addEventListener('click', generateName);
  }
  if (genBackground) {
    genBackground.addEventListener('click', generateBackground);
  }

  document.querySelectorAll('.skill-row input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => handleSkillToggle(input));
  });
}

if (typeof window !== 'undefined') {
  window.__wizardTestExports = {
    parseClassSkillChoices,
    deriveClassSkillChoices,
    validateSkillSelection,
    parseSubclassRequirement,
    normalizeName,
  };
}

window.addEventListener('DOMContentLoaded', async () => {
  const authed = await ensurePlayerAuth();
  if (!authed) return;
  buildLevelOptions();
  attachListeners();
  await loadWizardData();
  if (getNewCharacterFlag()) {
    await startNewCharacterSilently();
  } else {
    await loadSavedProfile();
  }
  await refreshSavedCharactersList();
  setInterval(() => {
    fetch('/api/player/online/ping', { method: 'POST' }).catch(() => {});
  }, 30000);
});
