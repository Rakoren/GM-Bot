import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

export async function createDataStore({ rootDir, datasetGroup }) {
  const datasetName = datasetGroup || 'D&D';
  const DATASET_ROOT = path.join(rootDir, 'data_sets', datasetName);
  const DB_PATH = path.join(rootDir, 'character_bank.sqlite');

  const SQL = await initSqlJs({
    locateFile: file => path.join(rootDir, 'node_modules', 'sql.js', 'dist', file),
  });

  function loadDatabase() {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH);
      return new SQL.Database(new Uint8Array(data));
    }
    return new SQL.Database();
  }

  const db = loadDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      class TEXT,
      subclass TEXT,
      level TEXT,
      species TEXT,
      lineage TEXT,
      background TEXT,
      languages TEXT,
      feat TEXT,
      trait TEXT,
      goal TEXT,
      equipment TEXT,
      instruments TEXT,
      alignment TEXT,
      stats TEXT,
      cantrips TEXT,
      spells TEXT,
      createdBy TEXT,
      createdAt TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      class_id TEXT PRIMARY KEY,
      name TEXT,
      name_norm TEXT,
      primary_ability TEXT,
      hit_die TEXT,
      armor_proficiencies TEXT,
      weapon_proficiencies TEXT,
      tool_proficiencies TEXT,
      saving_throws TEXT,
      skill_choices TEXT,
      starting_equipment_notes TEXT,
      spellcasting TEXT,
      source TEXT,
      version TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_classes_name_norm ON classes(name_norm);

    CREATE TABLE IF NOT EXISTS subclasses (
      subclass_id TEXT PRIMARY KEY,
      class_id TEXT,
      name TEXT,
      name_norm TEXT,
      level_gained TEXT,
      summary TEXT,
      source TEXT,
      version TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_subclasses_name_norm ON subclasses(name_norm);

    CREATE TABLE IF NOT EXISTS species (
      species_id TEXT PRIMARY KEY,
      name TEXT,
      name_norm TEXT,
      size TEXT,
      speed TEXT,
      languages TEXT,
      special_traits TEXT,
      source TEXT,
      version TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_species_name_norm ON species(name_norm);

    CREATE TABLE IF NOT EXISTS species_traits (
      trait_id TEXT PRIMARY KEY,
      species_id TEXT,
      name TEXT,
      summary TEXT,
      source TEXT,
      version TEXT
    );

    CREATE TABLE IF NOT EXISTS species_lineages (
      lineage_id TEXT PRIMARY KEY,
      species_id TEXT,
      name TEXT,
      name_norm TEXT,
      level1 TEXT,
      level3 TEXT,
      level5 TEXT,
      source TEXT,
      version TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_species_lineages_name_norm ON species_lineages(name_norm);

    CREATE TABLE IF NOT EXISTS backgrounds (
      background_id TEXT PRIMARY KEY,
      name TEXT,
      name_norm TEXT,
      ability_scores TEXT,
      skill_proficiencies TEXT,
      tool_proficiencies TEXT,
      languages TEXT,
      equipment TEXT,
      feat_granted TEXT,
      source TEXT,
      version TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_backgrounds_name_norm ON backgrounds(name_norm);

    CREATE TABLE IF NOT EXISTS background_benefits (
      benefit_id TEXT PRIMARY KEY,
      background_id TEXT,
      name TEXT,
      summary TEXT,
      source TEXT,
      version TEXT
    );

    CREATE TABLE IF NOT EXISTS feats (
      feat_id TEXT PRIMARY KEY,
      name TEXT,
      name_norm TEXT,
      prerequisites TEXT,
      type TEXT,
      level_requirement TEXT,
      benefit_summary TEXT,
      source TEXT,
      version TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_feats_name_norm ON feats(name_norm);

    CREATE TABLE IF NOT EXISTS spells (
      spell_id TEXT PRIMARY KEY,
      name TEXT,
      name_norm TEXT,
      level TEXT,
      cantrip TEXT,
      school TEXT,
      casting_time TEXT,
      range TEXT,
      components TEXT,
      duration TEXT,
      concentration TEXT,
      ritual TEXT,
      attack_save TEXT,
      damage_type TEXT,
      short_effect TEXT,
      source TEXT,
      version TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_spells_name_norm ON spells(name_norm);

    CREATE TABLE IF NOT EXISTS class_features (
      feature_id TEXT PRIMARY KEY,
      class_id TEXT,
      subclass_id TEXT,
      level_gained TEXT,
      name TEXT,
      summary TEXT,
      action_type TEXT,
      uses TEXT,
      recharge TEXT,
      source TEXT,
      version TEXT
    );

    CREATE TABLE IF NOT EXISTS class_spell_lists (
      class_id TEXT,
      spell_id TEXT,
      is_prepared_by_default TEXT,
      source TEXT,
      version TEXT
    );

    CREATE TABLE IF NOT EXISTS class_progression (
      class_id TEXT,
      level TEXT,
      proficiency_bonus TEXT,
      class_features TEXT,
      rages TEXT,
      rage_damage TEXT,
      weapon_mastery TEXT,
      bardic_die TEXT,
      cantrips TEXT,
      prepared_spells TEXT,
      spell_slots_1 TEXT,
      spell_slots_2 TEXT,
      spell_slots_3 TEXT,
      spell_slots_4 TEXT,
      spell_slots_5 TEXT,
      spell_slots_6 TEXT,
      spell_slots_7 TEXT,
      spell_slots_8 TEXT,
      spell_slots_9 TEXT,
      source TEXT,
      version TEXT
    );

    CREATE TABLE IF NOT EXISTS subclass_spells (
      subclass_id TEXT,
      level TEXT,
      spells TEXT,
      source TEXT,
      version TEXT
    );

    CREATE TABLE IF NOT EXISTS avrae_imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      query TEXT,
      response TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS npcs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      role TEXT,
      stat_block TEXT,
      notes TEXT,
      createdBy TEXT,
      createdAt TEXT
    );
  `);

  function saveDatabase() {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  function execToRows(result) {
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(row => {
      const obj = {};
      for (let i = 0; i < columns.length; i += 1) obj[columns[i]] = row[i];
      return obj;
    });
  }

  function normalizeKey(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  function parseCsvLine(line) {
    const out = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === ',' && !inQuotes) {
        out.push(current);
        current = '';
        continue;
      }
      current += ch;
    }
    out.push(current);
    return out;
  }

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (!lines.length) return { headers: [], rows: [] };
    const headers = parseCsvLine(lines[0]).map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = parseCsvLine(line);
      const row = {};
      for (let i = 0; i < headers.length; i += 1) {
        row[headers[i]] = values[i] ?? '';
      }
      return row;
    });
    return { headers, rows };
  }

  function tableIsEmpty(tableName) {
    const result = db.exec(`SELECT COUNT(1) AS count FROM ${tableName}`);
    const row = execToRows(result)[0];
    return !row || Number(row.count) === 0;
  }

  function getTableColumns(tableName) {
    const result = db.exec(`PRAGMA table_info(${tableName})`);
    const rows = execToRows(result);
    return rows.map(r => r.name);
  }

  function ensureCharacterColumns() {
    const columns = getTableColumns('characters');
    const needed = ['subclass', 'lineage', 'instruments', 'cantrips', 'spells', 'languages', 'feat'];
    for (const col of needed) {
      if (!columns.includes(col)) {
        db.run(`ALTER TABLE characters ADD COLUMN ${col} TEXT`);
      }
    }
  }

  function ensureSpellsColumns() {
    const columns = getTableColumns('spells');
    if (!columns.includes('cantrip')) {
      db.run('ALTER TABLE spells ADD COLUMN cantrip TEXT');
    }
  }

  function ensureLineageColumns() {
    const columns = getTableColumns('species_lineages');
    if (!columns.includes('name_norm')) {
      db.run('ALTER TABLE species_lineages ADD COLUMN name_norm TEXT');
    }
  }

  ensureCharacterColumns();
  ensureSpellsColumns();
  ensureLineageColumns();

  function loadCsvIntoTable(tableName, filePath, nameColumn, idColumn) {
    if (!fs.existsSync(filePath)) return;
    if (!tableIsEmpty(tableName)) return;
    const text = fs.readFileSync(filePath, 'utf8');
    const { headers, rows } = parseCsv(text);
    if (!headers.length || !rows.length) return;

    const tableColumns = getTableColumns(tableName);
    const insertColumns = headers.filter(h => tableColumns.includes(h));
    if (nameColumn && tableColumns.includes('name_norm') && !insertColumns.includes('name_norm')) {
      insertColumns.push('name_norm');
    }

    const placeholders = insertColumns.map(() => '?').join(', ');
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO ${tableName} (${insertColumns.join(', ')}) VALUES (${placeholders})`
    );

    for (const row of rows) {
      const values = insertColumns.map(col => {
        if (col === 'name_norm') return normalizeKey(row[nameColumn]);
        return row[col] ?? '';
      });
      if (idColumn && !row[idColumn]) continue;
      stmt.run(values);
    }
    stmt.free();
    saveDatabase();
  }

  function loadReferenceData() {
    const base = DATASET_ROOT;
    loadCsvIntoTable('classes', path.join(base, 'classes.csv'), 'name', 'class_id');
    loadCsvIntoTable('subclasses', path.join(base, 'subclasses.csv'), 'name', 'subclass_id');
    loadCsvIntoTable('species', path.join(base, 'species.csv'), 'name', 'species_id');
    loadCsvIntoTable('species_traits', path.join(base, 'species_traits.csv'), null, 'trait_id');
    loadCsvIntoTable('species_lineages', path.join(base, 'species_lineages.csv'), 'name', 'lineage_id');
    loadCsvIntoTable('backgrounds', path.join(base, 'backgrounds.csv'), 'name', 'background_id');
    loadCsvIntoTable('background_benefits', path.join(base, 'background_benefits.csv'), null, 'benefit_id');
    loadCsvIntoTable('feats', path.join(base, 'feats.csv'), 'name', 'feat_id');
    loadCsvIntoTable('spells', path.join(base, 'spells.csv'), 'name', 'spell_id');
    loadCsvIntoTable('class_features', path.join(base, 'class_features.csv'), 'name', 'feature_id');
    loadCsvIntoTable('class_spell_lists', path.join(base, 'class_spell_lists.csv'), null, null);
    loadCsvIntoTable('class_progression', path.join(base, 'class_progression.csv'), null, null);
    loadCsvIntoTable('subclass_spells', path.join(base, 'subclass_spells.csv'), null, null);
  }

  function reloadReferenceData() {
    const tables = [
      'classes',
      'subclasses',
      'species',
      'species_traits',
      'species_lineages',
      'backgrounds',
      'background_benefits',
      'feats',
      'spells',
      'class_features',
      'class_spell_lists',
      'class_progression',
      'subclass_spells',
    ];
    for (const table of tables) {
      db.run(`DELETE FROM ${table}`);
    }
    loadReferenceData();
    saveDatabase();
  }

  loadReferenceData();

  return {
    db,
    DATASET_ROOT,
    DB_PATH,
    saveDatabase,
    execToRows,
    normalizeKey,
    parseCsv,
    loadReferenceData,
    reloadReferenceData,
    getTableColumns,
  };
}
