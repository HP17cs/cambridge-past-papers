const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'cambridge.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function initDatabase() {
  // Migrate legacy schema before creating the current (normalized) tables.
  // The seed module snapshots legacy progress BEFORE calling initDatabase, so
  // it is safe to drop the legacy flat `papers` table and rebuild
  // `user_progress` here.
  if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='papers'").get()) {
    db.exec('DROP TABLE IF EXISTS papers');
  }
  const upCols = db.prepare('PRAGMA table_info(user_progress)').all().map((c) => c.name);
  if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_progress'").get() && upCols.includes('paper_id')) {
    db.exec('DROP TABLE IF EXISTS user_progress');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      google_id TEXT,
      profile_picture TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
      onboarding_completed INTEGER DEFAULT 0,
      show_only_selected_subjects INTEGER DEFAULT 0,
      preferences_updated_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS qualifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      short_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      qualification_id INTEGER NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (qualification_id) REFERENCES qualifications(id),
      UNIQUE(code, qualification_id)
    );

    -- One row per (subject, year, session) that has any verified or
    -- syllabus-known component data. series_code is the Cambridge series
    -- label (e.g. 's25', 'w25').
    CREATE TABLE IF NOT EXISTS exam_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      session TEXT NOT NULL,
      series_code TEXT,
      verified INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE(subject_id, year, session)
    );

    -- A Component/Paper within a session. component_code is the leading
    -- component identifier, e.g. '4024/1' (paper 1 common core). The full
    -- paper is identified by component_code + variant_number.
    --
    -- IMPORTANT (PART 5/6): component_code (e.g. '4024/3') is the machine key.
    -- paper_label (e.g. 'Paper 3 (Practical Test)') is the verified
    -- human-readable Cambridge description and is NEVER derived from the
    -- component code's digits - it is authored per subject. paper_type is the
    -- controlled vocabulary classification (theory/practical/...).
    CREATE TABLE IF NOT EXISTS components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_session_id INTEGER NOT NULL,
      component_code TEXT NOT NULL,
      paper_number INTEGER NOT NULL,
      paper_type TEXT NOT NULL DEFAULT 'theory',
      paper_label TEXT,
      title TEXT,
      verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE,
      UNIQUE(exam_session_id, paper_number)
    );

    -- A Variant of a Component. variant_number is the variant digit. The
    -- canonical Cambridge label is component_code + variant_number, e.g.
    -- '4024/12' for Paper 1 Variant 2.
    CREATE TABLE IF NOT EXISTS variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      component_id INTEGER NOT NULL,
      variant_number INTEGER,
      verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
      UNIQUE(component_id, variant_number)
    );

    -- Resources belong to an exact Variant and are stored at the
    -- granularity of a single resource (question paper / mark scheme /
    -- examiner report / insert / etc). provider_url is optional; it is only
    -- set when the resource has been confirmed to point at the correct file.
    CREATE TABLE IF NOT EXISTS paper_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL,
      resource_type TEXT NOT NULL DEFAULT 'question_paper',
      title TEXT,
      url TEXT,
      provider TEXT,
      verified INTEGER DEFAULT 0,
      source TEXT,
      source_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE,
      UNIQUE(variant_id, resource_type)
    );

    -- User progress references an exact Variant (the unique deliverable).
    CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      variant_id INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      ignored INTEGER DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE,
      UNIQUE(user_id, variant_id)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_subject ON exam_sessions(subject_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_year ON exam_sessions(year);
    CREATE INDEX IF NOT EXISTS idx_sessions_subject_year ON exam_sessions(subject_id, year);
    CREATE INDEX IF NOT EXISTS idx_components_session ON components(exam_session_id);
    CREATE INDEX IF NOT EXISTS idx_variants_component ON variants(component_id);
    CREATE INDEX IF NOT EXISTS idx_resources_variant ON paper_resources(variant_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_progress_variant ON user_progress(variant_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user_variant ON user_progress(user_id, variant_id);
    CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
    CREATE INDEX IF NOT EXISTS idx_subjects_qualification ON subjects(qualification_id);

    -- A user's selected subjects (onboarding / subject preferences). The rows
    -- are scoped to the authenticated user server-side; clients never supply a
    -- user id.
    CREATE TABLE IF NOT EXISTS user_subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE(user_id, subject_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_subjects_user ON user_subjects(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_subjects_subject ON user_subjects(subject_id);
  `);

  // Apply column-level migrations whenever the DB is initialized so existing
  // databases get schema additions even though CREATE TABLE IF NOT EXISTS
  // leaves untouched tables alone. migrate() is idempotent (PRAGMA-guarded).
  migrate();
}

// ---------------------------------------------------------------------------
// Migration from the legacy flat `papers` model to the normalized model.
//
// The legacy `papers` table and its `user_progress.paper_id` FK are replaced
// by the normalized tables above. Descendant data (users, qualifications,
// subjects) is preserved. Existing user progress is snapshotted and re-attached
// by the seed step; here we only handle structural changes that SQLite cannot
// express inline (dropping the legacy tables).
// ---------------------------------------------------------------------------
function migrate() {
  const hasPapers = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='papers'").get();
  const hasProgressOldFk = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_progress'").get();
  const cols = hasProgressOldFk ? db.prepare('PRAGMA table_info(user_progress)').all().map((c) => c.name) : [];

  // If user_progress still references paper_id (legacy), it must be rebuilt
  // against the new normalized tables. We drop the legacy paper_id-progress
  // and re-create user_progress referencing variants(id). The seed step is
  // guaranteed to run after migrate() and re-populates the new tables, so any
  // legacy user_progress rows must be snapshotted *before* this drop. The
  // seed module handles that snapshot by calling snapshotProgress() via the
  // legacy tables before invoking the rebuild. To keep ordering safe, drop the
  // legacy progress table here only after the seed has snapshotted; since the
  // seed reads from legacy `papers` and `user_progress`, we must NOT drop them
  // inside migrate(). Instead, the seed performs the drop via rebuildLegacy.

  // Migration: ensure components has the paper_label column (PART 5/6).
  const compTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='components'").get();
  const compHasLabel = compTableExists ? db.prepare('PRAGMA table_info(components)').all().some((c) => c.name === 'paper_label') : false;
  if (compTableExists && !compHasLabel) {
    db.exec('ALTER TABLE components ADD COLUMN paper_label TEXT');
  }

  const progressHasIgnored = hasProgressOldFk ? db.prepare('PRAGMA table_info(user_progress)').all().some((c) => c.name === 'ignored') : false;
  if (hasProgressOldFk && !progressHasIgnored) {
    db.exec('ALTER TABLE user_progress ADD COLUMN ignored INTEGER DEFAULT 0');
  }

  // Migration: subject-preference columns on users (PART: onboarding).
  const usersTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (usersTableExists) {
    const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
    if (!userCols.includes('onboarding_completed')) {
      db.exec('ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0');
    }
    if (!userCols.includes('show_only_selected_subjects')) {
      db.exec('ALTER TABLE users ADD COLUMN show_only_selected_subjects INTEGER DEFAULT 0');
    }
    if (!userCols.includes('preferences_updated_at')) {
      db.exec('ALTER TABLE users ADD COLUMN preferences_updated_at DATETIME');
    }
  }

  void hasPapers;
  void cols;
}

function rebuildLegacy() {
  // Called by seed after snapshotting legacy progress. Removes the legacy
  // flat tables so the normalized schema is the single source of truth.
  const legacyTables = ['papers'];
  for (const t of legacyTables) {
    if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t)) {
      db.exec(`DROP TABLE IF EXISTS ${t}`);
    }
  }
  // user_progress references variants(id) after init; if it still has the old
  // paper_id column, rebuild it targeting variants(id).
  const cols = db.prepare('PRAGMA table_info(user_progress)').all().map((c) => c.name);
  if (cols.includes('paper_id')) {
    db.exec(`DROP TABLE IF EXISTS user_progress`);
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        variant_id INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      ignored INTEGER DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE,
      UNIQUE(user_id, variant_id)
    );

    CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_progress_variant ON user_progress(variant_id);
      CREATE INDEX IF NOT EXISTS idx_progress_user_variant ON user_progress(user_id, variant_id);
    `);
  }
}

function snapshotLegacyProgress() {
  // Returns progress rows keyed by the semantic (subject_code, year, session,
  // paper_number, variant) so they can be re-attached to new variant rows.
  try {
    return db.prepare(`
      SELECT up.user_id, up.completed, up.completed_at,
             s.code AS subject_code, p.year, p.session, p.paper_number, p.variant,
             p.paper_type, p.component_code
      FROM user_progress up
      JOIN papers p ON p.id = up.paper_id
      JOIN subjects s ON s.id = p.subject_id
    `).all();
  } catch (e) {
    return [];
  }
}

// PART 15: Snapshot CURRENT normalized user progress keyed by semantic
// identity (subject_code|year|session|paper_number|variant_number) so it can
// be re-attached to whatever variant ids exist after a structural re-seed.
// By default incomplete (completed=0) rows are also preserved so an in-progress
// record is never silently dropped.
function snapshotNormalizedProgress() {
  try {
    return db.prepare(`
      SELECT up.user_id, up.completed, up.ignored, up.completed_at,
             s.code AS subject_code, es.year, es.session,
             c.paper_number, v.variant_number
      FROM user_progress up
      JOIN variants v ON v.id = up.variant_id
      JOIN components c ON c.id = v.component_id
      JOIN exam_sessions es ON es.id = c.exam_session_id
      JOIN subjects s ON s.id = es.subject_id
    `).all();
  } catch (e) {
    return [];
  }
}

module.exports = { db, initDatabase, migrate, rebuildLegacy, snapshotLegacyProgress, snapshotNormalizedProgress };
