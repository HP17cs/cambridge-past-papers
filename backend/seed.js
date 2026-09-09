#!/usr/bin/env node
require('dotenv').config();
const crypto = require('crypto');
const { db, initDatabase, snapshotNormalizedProgress } = require('./database');
const {
  O_LEVEL_PAPERS,
  YEARS,
  sessionToCode,
  sessionSeries,
  inferPaperType,
} = require('./data');

// `npm run reset` (seed.js --reset) wipes user progress and starts fresh.
// Default seed preserves user progress across re-seeds (PART 15).
const RESET = process.argv.includes('--reset');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function count(table) {
  return db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
}

// PART 15: re-attach a snapshot of normalized user progress to the current
// variant ids by semantic identity (subject_code|year|session|paper_number|
// variant_number). Rows whose variant no longer exists are skipped.
function restoreProgress(snapshot) {
  if (!snapshot || snapshot.length === 0) return 0;
  const findVariant = db.prepare(`
    SELECT v.id FROM variants v
    JOIN components c ON c.id = v.component_id
    JOIN exam_sessions es ON es.id = c.exam_session_id
    JOIN subjects s ON s.id = es.subject_id
    WHERE s.code = ? AND es.year = ? AND es.session = ? AND c.paper_number = ? AND v.variant_number = ?
  `);
  const exists = db.prepare('SELECT id FROM user_progress WHERE user_id = ? AND variant_id = ?');
  const insert = db.prepare(
    'INSERT INTO user_progress (user_id, variant_id, completed, ignored, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
  );
  let restored = 0;
  let skipped = 0;
  for (const p of snapshot) {
    const v = findVariant.get(p.subject_code, p.year, p.session, p.paper_number, p.variant_number);
    if (!v) {
      skipped++;
      continue;
    }
    if (exists.get(p.user_id, v.id)) continue;
    insert.run(p.user_id, v.id, p.completed || 0, p.ignored || 0, p.completed_at);
    restored++;
  }
  if (restored || skipped) {
    console.log(`\nProgress restored: ${restored} row(s) preserved${skipped ? `, ${skipped} row(s) skipped (variant no longer in catalogue)` : ''}.`);
  }
  return restored;
}

function seed() {
  console.log('=== Cambridge O-Level Seed ===\n');

  // Snapshot current progress BEFORE initDatabase/clearing so a re-seed never
  // destroys user progress (PART 15). Reset mode wipes progress on purpose.
  const progressSnapshot = RESET ? null : snapshotNormalizedProgress();

  initDatabase();

  // Clear old paper data (preserve users; progress is re-attached after seed)
  console.log(RESET
    ? 'RESET mode: clearing paper data AND user progress...'
    : 'Clearing old paper data (user progress will be preserved)...');
  db.prepare('DELETE FROM user_progress').run();
  db.prepare('DELETE FROM paper_resources').run();
  db.prepare('DELETE FROM variants').run();
  db.prepare('DELETE FROM components').run();
  db.prepare('DELETE FROM exam_sessions').run();
  db.prepare('DELETE FROM sqlite_sequence WHERE name IN (?, ?, ?, ?, ?)').run(
    'user_progress', 'paper_resources', 'variants', 'components', 'exam_sessions'
  );

  // Upsert qualifications from the dataset
  const qualMap = {};
  for (const paper of O_LEVEL_PAPERS) {
    const qualName = paper.qualification || 'O Level';
    const shortName = qualName === 'O Level' ? 'O Level' : qualName;
    const fullName = qualName === 'O Level' ? 'Cambridge O Level' : `Cambridge ${qualName}`;
    if (!qualMap[qualName]) {
      const existing = db.prepare('SELECT id FROM qualifications WHERE short_name = ?').get(shortName);
      if (existing) {
        qualMap[qualName] = existing.id;
      } else {
        const r = db.prepare('INSERT INTO qualifications (name, short_name) VALUES (?, ?)').run(fullName, shortName);
        qualMap[qualName] = r.lastInsertRowid;
      }
    }
  }

  // Purge non-current qualifications and their subjects
  const validQualIds = Object.values(qualMap);
  const qPlaceholders = validQualIds.map(() => '?').join(',');
  db.prepare(`DELETE FROM qualifications WHERE id NOT IN (${qPlaceholders})`).run(...validQualIds);
  db.prepare(`DELETE FROM subjects WHERE qualification_id NOT IN (${qPlaceholders})`).run(...validQualIds);

  // Remove subjects not in current dataset
  const validCodes = O_LEVEL_PAPERS.map(p => p.code);
  const placeholders = validCodes.map(() => '?').join(',');
  db.prepare(
    `DELETE FROM subjects WHERE code NOT IN (${placeholders})`
  ).run(...validCodes);

  // Upsert subjects
  const insertSubject = db.prepare(
    'INSERT OR IGNORE INTO subjects (name, code, qualification_id) VALUES (?, ?, ?)'
  );
  const updateSubject = db.prepare(
    'UPDATE subjects SET name = ?, qualification_id = ? WHERE code = ?'
  );
  for (const paper of O_LEVEL_PAPERS) {
    const qualName = paper.qualification || 'O Level';
    const qualId = qualMap[qualName];
    const existing = db.prepare(
      'SELECT id FROM subjects WHERE code = ?'
    ).get(paper.code);
    if (existing) {
      updateSubject.run(paper.name, qualId, paper.code);
    } else {
      insertSubject.run(paper.name, paper.code, qualId);
    }
  }

  // Build subject code -> id map
  const subjectMap = {};
  const allSubjects = db.prepare('SELECT id, code FROM subjects').all();
  for (const s of allSubjects) {
    subjectMap[s.code] = s.id;
  }

  // Populate exam_sessions, components, variants
  // BUG FIX: `INSERT OR IGNORE` + `lastInsertRowid` is unreliable on re-seed
  // (ignored rows do not advance the rowid). Always look the id back up by the
  // row's UNIQUE key instead.
  const insertSession = db.prepare(
    'INSERT OR IGNORE INTO exam_sessions (subject_id, year, session, series_code, verified, notes) VALUES (?, ?, ?, ?, 0, ?)'
  );
  const findSession = db.prepare('SELECT id FROM exam_sessions WHERE subject_id = ? AND year = ? AND session = ?');
  const insertComponent = db.prepare(
    'INSERT OR IGNORE INTO components (exam_session_id, component_code, paper_number, paper_type, paper_label, verified) VALUES (?, ?, ?, ?, ?, 0)'
  );
  const findComponent = db.prepare('SELECT id FROM components WHERE exam_session_id = ? AND paper_number = ?');
  const insertVariant = db.prepare(
    'INSERT OR IGNORE INTO variants (component_id, variant_number, verified) VALUES (?, ?, 0)'
  );
  const findVariant = db.prepare('SELECT id FROM variants WHERE component_id = ? AND variant_number = ?');

  let sessionCount = 0;
  let componentCount = 0;
  let variantCount = 0;

  db.exec('BEGIN');
  try {
    for (const paper of O_LEVEL_PAPERS) {
      const subjectId = subjectMap[paper.code];
      if (!subjectId) {
        console.warn(`  WARNING: Subject ${paper.code} not found, skipping`);
        continue;
      }

      // Iterate over each session defined for this subject
      for (const [sessionLabel, sessionData] of Object.entries(paper.sessions)) {
        const sessionCode = sessionToCode(sessionLabel);

        for (const year of YEARS) {
          const series = sessionSeries(year, sessionCode);
          const sessNote = `${paper.code} ${year} ${sessionLabel}`;

          insertSession.run(
            subjectId, year, sessionCode, series, sessNote
          );
          const sessionId = findSession.get(subjectId, year, sessionCode).id;
          sessionCount++;

          // Use the session-specific paper list
          for (const p of sessionData.papers) {
            const componentCode = `${paper.code}/${p.number}`;
            const paperType = inferPaperType(p.name);

            insertComponent.run(
              sessionId, componentCode, p.number, paperType, p.name
            );
            const componentId = findComponent.get(sessionId, p.number).id;
            componentCount++;

            // Use the session-specific variant list
            for (const componentStr of p.components) {
              const variantNumber = parseInt(componentStr, 10);
              insertVariant.run(componentId, variantNumber);
              findVariant.get(componentId, variantNumber);
              variantCount++;
            }
          }
        }
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('SEED FAILED:', err);
    process.exit(1);
  }

  // Ensure admin user with a strong random password
  const existingAdmin = db.prepare(
    "SELECT id FROM users WHERE email = 'admin@cambridgepapers.com'"
  ).get();
  const adminPassword = crypto.randomBytes(18).toString('base64url');
  const adminHash = hashPassword(adminPassword);
  if (!existingAdmin) {
    db.prepare(
      "INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, 1)"
    ).run('Administrator', 'admin@cambridgepapers.com', adminHash);
  } else {
    db.prepare(
      "UPDATE users SET password_hash = ?, is_admin = 1 WHERE id = ?"
    ).run(adminHash, existingAdmin.id);
  }
  console.log(`\nAdmin credentials (SAVE THIS — shown once):\n  Email:    admin@cambridgepapers.com\n  Password: ${adminPassword}\n`);

  // Summary
  console.log('\n=== Seed Complete ===');
  console.log(`Subjects:     ${O_LEVEL_PAPERS.length}`);
  console.log(`Sessions:     ${sessionCount}`);
  console.log(`Components:   ${componentCount}`);
  console.log(`Variants:     ${variantCount}`);
  console.log(`Users:        ${count('users')}`);

  // PART 15: re-attach preserved user progress to the re-seeded variants.
  restoreProgress(progressSnapshot);
  console.log(`Progress:     ${count('user_progress')}`);

  // Per-subject breakdown
  console.log('\n=== Per-Subject Breakdown ===');
  for (const paper of O_LEVEL_PAPERS) {
    const subjectId = subjectMap[paper.code];
    const sesCount = db.prepare(
      'SELECT COUNT(*) AS c FROM exam_sessions WHERE subject_id = ?'
    ).get(subjectId).c;
    const compCount = db.prepare(`
      SELECT COUNT(*) AS c FROM components comp
      JOIN exam_sessions es ON es.id = comp.exam_session_id
      WHERE es.subject_id = ?
    `).get(subjectId).c;
    const varCount = db.prepare(`
      SELECT COUNT(*) AS c FROM variants v
      JOIN components comp ON comp.id = v.component_id
      JOIN exam_sessions es ON es.id = comp.exam_session_id
      WHERE es.subject_id = ?
    `).get(subjectId).c;

    // Show session-specific details
    const sessionDetails = [];
    for (const [sessionLabel, sessionData] of Object.entries(paper.sessions)) {
      const pCount = sessionData.papers.length;
      const vCount = sessionData.papers.reduce((sum, p) => sum + p.components.length, 0);
      sessionDetails.push(`${sessionLabel}: ${pCount} papers, ${vCount} variants`);
    }

    console.log(`  ${paper.code} ${paper.name}: ${sesCount} sessions, ${compCount} components, ${varCount} variants`);
    for (const detail of sessionDetails) {
      console.log(`    ${detail}`);
    }
  }
}

seed();
