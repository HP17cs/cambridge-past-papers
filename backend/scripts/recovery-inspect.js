const { DatabaseSync } = require('node:sqlite');
const path = require('path');

function inspect(label, name) {
  console.log('==============================');
  console.log(label + ' : ' + name);
  console.log('==============================');
  const db = new DatabaseSync(name);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name);
  console.log('TABLES:', tables.join(', '));
  const pc = db.prepare('PRAGMA page_count').get();
  const fl = db.prepare('PRAGMA freelist_count').get();
  const pageSize = db.prepare('PRAGMA page_size').get();
  console.log(`page_count=${pc.page_count} freelist_count=${fl.freelist_count} page_size=${pageSize.page_size}`);
  console.log('approx committed bytes:', pc.page_count * pageSize.page_size);
  db.close();
}

inspect('CURRENT DB', path.join(__dirname, '..', 'data', 'cambridge.db'));
inspect('PRE-RECOVERY BACKUP', path.join(__dirname, '..', 'data', 'backups', 'PRE-RECOVERY-cambridge.db'));
