require('dotenv').config();
const crypto = require('crypto');
const { db, initDatabase, migrate, rebuildLegacy, snapshotLegacyProgress } = require('./database');
const {
  qualifications,
  SESSIONS,
  YEARS,
  SUBJECTS,
  VERIFIED,
  sessionSeries,
} = require('./data');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

// ---------------------------------------------------------------------------
// Progress migration
// ---------------------------------------------------------------------------

// Build a map: semantic key -> verified variant id in the newly populated DB.
// Runs AFTER the normalized tables are filled.
function buildVariantKeyIndex() {
  const map = {};
  const rows = db.prepare(`
    SELECT v.id AS variant_id, s.code AS subject_code, es.year, es.session,
           c.paper_number, c.paper_type, v.variant_number
    FROM variants v
    JOIN components c ON c.id = v.component_id
    JOIN exam_sessions es ON es.id = c.exam_session_id
    JOIN subjects s ON s.id = es.subject_id
  `).all();
  for (const r of rows) {
    const sessionKey = r.session === 'mj' ? 'May/June' : 'October/November';
    const key = `${r.subject_code}|${r.year}|${sessionKey}|${r.paper_number}|${r.variant_number}`;
    map[key] = r.variant_id;
  }
  return map;
}

function restoreProgress(legacyRows, variantIdByKey) {
  const insert = db.prepare('INSERT INTO user_progress (user_id, variant_id, completed, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');
  const kept = [];
  const dropped = [];
  for (const row of legacyRows) {
    const sessionKey = row.session === 'mj' ? 'May/June' : 'October/November';
    const key = `${row.subject_code}|${row.year}|${sessionKey}|${row.paper_number}|${row.variant}`;
    const variantId = variantIdByKey[key];
    if (variantId == null) {
      dropped.push({ user_id: row.user_id, key, reason: 'no verified matching variant' });
      continue;
    }
    insert.run(row.user_id, variantId, row.completed, row.completed_at || null);
    kept.push({ user_id: row.user_id, variant_id: variantId });
  }
  return { kept, dropped };
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

function upsertQualificationsAndSubjects() {
  const qualMap = {};
  for (const q of qualifications) {
    const existing = db.prepare('SELECT id FROM qualifications WHERE name = ?').get(q.name);
    if (existing) {
      qualMap[q.short_name] = existing.id;
      db.prepare('UPDATE qualifications SET short_name = ? WHERE id = ?').run(q.short_name, existing.id);
    } else {
      const r = db.prepare('INSERT INTO qualifications (name, short_name) VALUES (?, ?)').run(q.name, q.short_name);
      qualMap[q.short_name] = r.lastInsertRowid;
    }
  }

  const insertSubject = db.prepare('INSERT INTO subjects (name, code, qualification_id, description) VALUES (?, ?, ?, ?)');
  for (const s of SUBJECTS) {
    const qualId = qualMap[s.qualification];
    const existing = db.prepare('SELECT id FROM subjects WHERE code = ? AND qualification_id = ?').get(s.code, qualId);
    if (existing) {
      db.prepare('UPDATE subjects SET name = ?, description = ? WHERE id = ?').run(s.name, s.description, existing.id);
    } else {
      insertSubject.run(s.name, s.code, qualId, s.description);
    }
  }
}

// Returns { totalComponents, verifiedComponents, unverifiedComponents, totalVariants, verifiedVariants }
function populateSessions() {
  // Remove any previously seeded structural rows so the dataset is authored
  // fresh and never accumulates stale/duplicate rows.
  db.prepare('DELETE FROM exam_sessions').run();

  const stmtSubject = db.prepare('SELECT id FROM subjects WHERE code = ?');
  const insertSession = db.prepare(`
    INSERT INTO exam_sessions (subject_id, year, session, series_code, verified, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertComponent = db.prepare(`
    INSERT INTO components (exam_session_id, component_code, paper_number, paper_type, verified)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertVariant = db.prepare(`
    INSERT INTO variants (component_id, variant_number, verified)
    VALUES (?, ?, ?)
  `);

  let totalComponents = 0;
  let verifiedComponents = 0;
  let unverifiedComponents = 0;
  let totalVariants = 0;
  let verifiedVariants = 0;

  db.exec('BEGIN');
  try {
    for (const subject of SUBJECTS) {
      const subjectRow = stmtSubject.get(subject.code);
      const subjectId = subjectRow.id;
      for (const year of YEARS) {
        for (const session of SESSIONS) {
          const vkey = `${subject.code}|${year}|${session}`;
          const verifiedPapers = VERIFIED[vkey];
          const sessionVerified = Boolean(verifiedPapers);

          // It is legitimate for a subject to simply have no data for a
          // given year (e.g. not offered, or not verified). We author a
          // structural row only when we have syllabus-level component
          // knowledge OR a verified structure. For the current dataset we
          // author the syllabus component structure for every year/session,
          // clearly flagged UNVERIFIED unless confirmed.
          const series = sessionSeries(year, session);
          const sessionInsert = insertSession.run(subjectId, year, session, series, sessionVerified ? 1 : 0, sessionVerified ? 'verified structure' : 'syllabus-level structure, variants not verified');

          const paperTypes = subject.paperTypes || {};
          const paperNumbers = verifiedPapers
            ? verifiedPapers.map((p) => p.paperNumber)
            : Object.keys(paperTypes).map(Number).sort((a, b) => a - b);

          for (const pn of paperNumbers) {
            const paper = verifiedPapers && verifiedPapers.find((p) => p.paperNumber === pn);
            const paperType = paper ? paper.paperType : (paperTypes[pn] || 'theory');
            const verifiedFlag = paper ? 1 : 0;
            const componentCode = `${subject.code}/${pn}`;
            const compResult = insertComponent.run(sessionInsert.lastInsertRowid, componentCode, pn, paperType, verifiedFlag);
            totalComponents++;
            if (verifiedFlag) verifiedComponents++; else unverifiedComponents++;

            // Only author variants for verified structures. We never invent
            // variant digits for unverified sessions.
            if (paper && Array.isArray(paper.variants)) {
              for (const vn of paper.variants) {
                insertVariant.run(compResult.lastInsertRowid, vn, 1);
                totalVariants++;
                verifiedVariants++;
              }
            }
          }
        }
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { totalComponents, verifiedComponents, unverifiedComponents, totalVariants, verifiedVariants };
}

function seed() {
  // Snapshot legacy progress BEFORE initDatabase drops the legacy flat tables.
  // snapshotLegacyProgress() reads legacy `papers` + `user_progress(paper_id)`;
  // on a fresh DB those tables do not exist yet and it safely returns [].
  const legacySnapshot = snapshotLegacyProgress();
  console.log(`Legacy progress snapshot: ${legacySnapshot.length} rows.`);

  initDatabase();
  migrate();
  rebuildLegacy();

  // Populate the normalized structure.
  const counts = populateSessions();

  // Re-attach progress by logical identity.
  const variantIdByKey = buildVariantKeyIndex();
  const restore = restoreProgress(legacySnapshot, variantIdByKey);
  console.log(`Progress restored: ${restore.kept.length} kept, ${restore.dropped.length} dropped (no verified matching variant).`);
  if (restore.dropped.length > 0) {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(__dirname, 'data', 'unmatched-progress-backup.json');
    fs.writeFileSync(file, JSON.stringify(restore.dropped, null, 2), 'utf-8');
    console.log(`Written ${restore.dropped.length} recoverable progress rows to ${file} for manual review.`);
    console.log('Recoverable unmatched progress (kept for review):');
    for (const d of restore.dropped) console.log(`  user ${d.user_id} -> ${d.key} (${d.reason})`);
  }

  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@cambridgepapers.com');
  if (!existingAdmin) {
    const hash = hashPassword('admin123');
    db.prepare('INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, 1)').run('Administrator', 'admin@cambridgepapers.com', hash);
    console.log('Created admin user: admin@cambridgepapers.com / admin123');
  }

  console.log(`Seeded ${SUBJECTS.length} subjects.`);
  console.log(`Components: ${counts.totalComponents} (${counts.verifiedComponents} verified, ${counts.unverifiedComponents} unverified).`);
  console.log(`Variants: ${counts.totalVariants} (${counts.verifiedVariants} verified).`);
}

seed();
