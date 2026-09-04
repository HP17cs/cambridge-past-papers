// Restore the 2 progress rows that the seed cascade deleted (PART 15).
// Maps semantic identity (subject|year|session|paper_number|variant) to the
// current variant id, then re-inserts the preserved progress rows.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'cambridge.db');
const db = new DatabaseSync(DB_PATH);

// The preserved progress rows (captured from the V003 pre-seed snapshot).
// user_id, subject_code, year, session, paper_number, variant_number, completed, completed_at, user_email
const progressToRestore = [
  { user_id: 5, subject_code: '4024', year: 2025, session: 'mj', paper_number: 1, variant_number: 12, completed: 1, completed_at: '2026-09-02 19:05:48', label: 'smoke@test.local - 4024/2025 MJ P1 V12 (completed)' },
  { user_id: 4, subject_code: '0580', year: 2025, session: 'mj', paper_number: 1, variant_number: 11, completed: 0, completed_at: null, label: 'peerbocushamdi17109@gmail.com - 0580/2025 MJ P1 V11 (in-progress)' },
];

const findVariant = db.prepare(`
  SELECT v.id FROM variants v
  JOIN components c ON c.id = v.component_id
  JOIN exam_sessions es ON es.id = c.exam_session_id
  JOIN subjects s ON s.id = es.subject_id
  WHERE s.code = ? AND es.year = ? AND es.session = ? AND c.paper_number = ? AND v.variant_number = ?
`);

const insert = db.prepare(
  'INSERT INTO user_progress (user_id, variant_id, completed, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
);

let restored = 0;
for (const p of progressToRestore) {
  const v = findVariant.get(p.subject_code, p.year, p.session, p.paper_number, p.variant_number);
  if (!v) {
    console.log(`SKIP (no matching variant in current DB): ${p.label}`);
    continue;
  }
  // Avoid duplicate if already present.
  const exists = db.prepare('SELECT id FROM user_progress WHERE user_id = ? AND variant_id = ?').get(p.user_id, v.id);
  if (exists) {
    console.log(`ALREADY EXISTS: ${p.label}`);
    continue;
  }
  insert.run(p.user_id, v.id, p.completed, p.completed_at,);
  restored++;
  console.log(`RESTORED: ${p.label} -> variant_id=${v.id}`);
}

console.log(`\nRestored ${restored} progress row(s).`);
console.log('Total user_progress now:', db.prepare('SELECT count(*) c FROM user_progress').get().c);
db.close();
