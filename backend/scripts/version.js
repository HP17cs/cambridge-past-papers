// Versioned snapshot + change-log manager (PART 13/14 of the recovery plan).
//
// Usage (run from backend/):
//   node scripts/version.js snapshot  <label>        // snapshot the live DB as the next version
//   node scripts/version.js log      <label>         // append a change-log entry (after a snapshot)
//   node scripts/version.js list                     // list all versions
//   node scripts/version.js rollback <version_id>    // restore DB from a snapshot version
//
// Design guarantees:
//   * Every snapshot is a full, immutable SQLite backup (WAL-inclusive) stored
//     under backend/data/versions/<LABEL>.db
//   * A manifest (backend/data/versions/manifest.json) tracks version metadata
//     and an incrementing VERSION number.
//   * Snapshotting NEVER overwrites an existing version; each new snapshot gets
//     a unique, monotonic version id. Existing backups are never destroyed.
//   * rollback restores from a snapshot file; the pre-rollback state can be
//     snapshot by the caller first if they want a rollback trail.

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'cambridge.db');
const VERSIONS_DIR = path.join(DATA_DIR, 'versions');
const MANIFEST_PATH = path.join(VERSIONS_DIR, 'manifest.json');
const CHANGE_LOG = path.join(VERSIONS_DIR, 'CHANGELOG.md');

fs.mkdirSync(VERSIONS_DIR, { recursive: true });

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return { next: 1, versions: [] };
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return { next: 1, versions: [] };
  }
}

function saveManifest(m) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2), 'utf8');
}

function versionLabel(n) {
  return String(n).padStart(3, '0');
}

// A version entry's on-disk location. Older snapshot tooling wrote either a
// single `file` (VACUUM-into db) or a `dir` (recovery artifact folder whose
// database is the largest *.db inside). Resolve both.
function resolveEntryPath(e) {
  if (e.file) return { path: path.join(VERSIONS_DIR, e.file), isDir: false };
  if (e.dir) return { path: path.join(VERSIONS_DIR, e.dir), isDir: true };
  return null;
}

function findDbInDir(dir) {
  const entries = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.db'));
  if (entries.length === 0) return null;
  // Prefer an explicit cambridge.db / PRE-REBUILD db; fall back to the largest.
  const prefer = entries.find((f) => /cambridge\.db$/i.test(f)) || entries.find((f) => /pre-rebuild/i.test(f));
  if (prefer) return path.join(dir, prefer);
  const sized = entries
    .map((f) => ({ f, s: fs.statSync(path.join(dir, f)).size }))
    .sort((a, b) => b.s - a.s);
  return path.join(dir, sized[0].f);
}

function snapshot(label) {
  const m = loadManifest();
  const v = m.next;
  const labelClean = String(label || 'snapshot').replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 40);
  const dest = path.join(VERSIONS_DIR, `V${versionLabel(v)}-${labelClean}.db`);

  // VACUUM INTO produces a complete, self-contained copy of the database
  // (WAL-inclusive and internally consistent). We checkpoint first so all
  // committed WAL frames are folded into the main file before the copy.
  const src = new DatabaseSync(DB_PATH);
  src.exec('PRAGMA wal_checkpoint(FULL)');
  src.exec('PRAGMA integrity_check');
  src.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
  src.close();

  const now = new Date().toISOString();
  const entry = { version: v, label: labelClean, file: path.basename(dest), created_at: now };
  m.versions.push(entry);
  m.next = v + 1;
  saveManifest(m);

  console.log(`Snapshot created: V${versionLabel(v)} (${labelClean}) -> ${dest}`);
  console.log(`Bytes: ${fs.statSync(dest).size}`);
  return entry;
}

function list() {
  const m = loadManifest();
  console.log('VERSIONS:');
  if (m.versions.length === 0) { console.log('  (none)'); return; }
  for (const e of m.versions) {
    const r = resolveEntryPath(e);
    if (!r) { console.log(`  V${versionLabel(e.version)}  ${e.created_at}  ${e.label}  UNRESOLVED PATH`); continue; }
    const kind = r.isDir ? 'dir ' : 'file';
    const exists = fs.existsSync(r.path);
    let sizeTxt = 'MISSING';
    if (exists) {
      sizeTxt = r.isDir
        ? `${fs.readdirSync(r.path).length} files`
        : fs.statSync(r.path).size + ' B';
    }
    console.log(`  V${versionLabel(e.version)}  ${e.created_at}  ${e.label}  [${kind}] ${exists ? sizeTxt : 'MISSING'}`);
  }
  console.log(`Next version: V${versionLabel(m.next)}`);
}

function rollback(versionNum) {
  const m = loadManifest();
  const e = m.versions.find((x) => x.version === Number(versionNum));
  if (!e) { console.error(`No version V${versionLabel(versionNum)} found.`); process.exit(1); }
  const r = resolveEntryPath(e);
  if (!r || !fs.existsSync(r.path)) { console.error(`Snapshot missing for version V${versionLabel(versionNum)}.`); process.exit(1); }

  // Locate the actual database file: directly for `file` snapshots, otherwise
  // the database inside a `dir` artifact snapshot.
  const srcDb = r.isDir ? findDbInDir(r.path) : r.path;
  if (!srcDb) { console.error(`No .db found inside snapshot dir: ${r.path}`); process.exit(1); }

  // Back up the current DB before overwriting (so rollback is itself recoverable).
  const currentLabel = 'PRE-ROLLBACK';
  snapshot('pre-rollback-to-' + e.label);

  fs.copyFileSync(srcDb, DB_PATH);
  console.log(`Rolled back database to V${versionLabel(versionNum)} (${e.label}).`);
  console.log('The previous state was snapshotted as PRE-ROLLBACK (recoverable).');
}

function logEntry(label) {
  if (!fs.existsSync(CHANGE_LOG)) fs.writeFileSync(CHANGE_LOG, '# Paper Data Change Log (PART 14)\n\n', 'utf8');
  const now = new Date().toISOString();
  const line = `- [${now}] ${label}`;
  fs.appendFileSync(CHANGE_LOG, line + '\n', 'utf8');
  console.log('Change-log entry appended: ' + line);
}

const action = process.argv[2];
const arg = process.argv[3] || '';

if (action === 'snapshot') snapshot(arg || 'snapshot');
else if (action === 'list') list();
else if (action === 'rollback') rollback(arg);
else if (action === 'log') logEntry(arg);
else {
  console.log('Usage: node scripts/version.js <snapshot|list|rollback|log> [label]');
}
