const { spawn } = require('child_process');
const path = require('path');
const { O_LEVEL_PAPERS } = require('../data.js');

const PORT = 5599;
const BASE = `http://localhost:${PORT}/api`;

const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
server.stdout.on('data', (d) => (output += d));
server.stderr.on('data', (d) => (output += d));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(name, cond) {
  if (cond) console.log(`  PASS  ${name}`);
  else { console.log(`  FAIL  ${name}`); failures++; }
}

async function main() {
  await sleep(1500);
  try {
    // Health
    const health = await (await fetch(`${BASE}/health`)).json();
    check('health ok', health.status === 'ok');

    // Register a test user (or login existing)
    let token;
    const reg = await fetch(`${BASE}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Smoke Tester', email: 'smoke@test.local', password: 'password123' }),
    });
    if (reg.status === 200 || reg.status === 201) {
      const j = await reg.json();
      token = j.token;
    }
    if (!token) {
      const login = await fetch(`${BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'smoke@test.local', password: 'password123' }),
      });
      const j = await login.json();
      token = j.token;
    }
    check('auth token obtained', !!token);
    const authHeaders = { Authorization: `Bearer ${token}` };

    // Subjects count (should match the authored catalogue)
    const subjects = await (await fetch(`${BASE}/papers/subjects`)).json();
    check(`subjects count = ${O_LEVEL_PAPERS.length}`, Array.isArray(subjects) && subjects.length === O_LEVEL_PAPERS.length);

    // Find 4024
    const m4024 = subjects.find((s) => s.code === '4024');
    check('4024 subject present', !!m4024);
    check('4024 total variants > 0', m4024 && m4024.paper_count > 0);

    // Subject grouped detail (4024)
    const detail = await (await fetch(`${BASE}/papers/subject/${m4024.id}`, { headers: authHeaders })).json();
    check('subject detail loads', !!detail.subject);
    const totalVariants = detail.total;
    check('4024 has variants', totalVariants > 0);
    // 2025 MJ verified papers should be present with variants 12/13, 22/23
    const year2025 = detail.grouped['2025'];
    check('4024 has 2025 sessions', !!year2025);
    if (year2025) {
      const mj = year2025['mj'];
      check('4024 has May/June 2025', !!mj);
      if (mj) {
        check('4024 MJ P1 variants = 2', mj['1'] && mj['1'].variants.length === 2);
        check('4024 MJ P2 variants = 2', mj['2'] && mj['2'].variants.length === 2);
      }
    }

    // Search for an ATP paper
    const atpSearch = await (await fetch(`${BASE}/papers?q=chemistry+alternative+to+practical&limit=100`, { headers: authHeaders })).json();
    check('ATP search returns results', atpSearch.total > 0);
    if (atpSearch.papers.length) {
      check('ATP result has paper_type=alternative_to_practical',
        atpSearch.papers.every((p) => p.paper_type === 'alternative_to_practical'));
    }

    // Search by component code 4024/13
    const compSearch = await (await fetch(`${BASE}/papers?q=4024/13`, { headers: authHeaders })).json();
    check('component-code search matches', compSearch.total >= 1);

    // Toggle progress on the first verified 4024 MJ P1 variant.
    // Make this idempotent across repeated runs: force a known "off" start,
    // then toggle on (expect true), then toggle back off to leave no artifact.
    const p1 = year2025 && year2025['mj'] && year2025['mj']['1'] && year2025['mj']['1'].variants[0];
    if (p1) {
      await fetch(`${BASE}/progress/bulk-toggle`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperIds: [p1.id], completed: false }),
      });
      const toggledOn = await (await fetch(`${BASE}/progress/toggle`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId: p1.id }),
      })).json();
      check('progress toggle on', toggledOn.completed === true);
      const prog = await (await fetch(`${BASE}/progress`, { headers: authHeaders })).json();
      check('progress lists variant_id', Array.isArray(prog) && prog.some((r) => r.variant_id === p1.id));
      const detail2 = await (await fetch(`${BASE}/papers/${p1.id}`, { headers: authHeaders })).json();
      check('paper detail has variant', detail2.variant && detail2.variant.id === p1.id);
      // Leave no test artifact behind.
      await fetch(`${BASE}/progress/bulk-toggle`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperIds: [p1.id], completed: false }),
      });
    }

    // Filters
    const filters = await (await fetch(`${BASE}/papers/filters`)).json();
    check('filters have verificationStatuses', Array.isArray(filters.verificationStatuses) && filters.verificationStatuses.length === 2);
    check('filters have sessions', Array.isArray(filters.sessions) && filters.sessions.length > 0);

    // Admin: sessions list for 4024
    const adminLogin = await (await fetch(`${BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cambridgepapers.com', password: 'admin123' }),
    })).json();
    const adminHeaders = { Authorization: `Bearer ${adminLogin.token}` };
    const sessions = await (await fetch(`${BASE}/admin/subjects/${m4024.id}/sessions`, { headers: adminHeaders })).json();
    check('admin sessions fetch', Array.isArray(sessions) && sessions.length > 0);

  } catch (err) {
    console.error('ERROR: ', err.message);
    failures++;
  } finally {
    server.kill();
    await sleep(300);
  }
  console.log(`\n${failures === 0 ? 'ALL TESTS PASSED' : failures + ' FAILURES'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
