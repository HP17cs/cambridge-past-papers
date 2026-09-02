const BASE = 'http://localhost:5000/api';

async function j(method, url, body, token) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + url, opts);
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

(async () => {
  const pass = [];
  const fail = [];

  // Login
  const login = await j('POST', '/auth/login', { email: 'admin@cambridgepapers.com', password: 'admin123' });
  const token = login.data.token;
  login.status === 200 ? pass.push('Login') : fail.push('Login');

  // Find Physics 5054
  const subs = await j('GET', '/papers/subjects', null, token);
  const phys = subs.data.find(s => s.code === '5054');
  phys ? pass.push('Find Physics 5054') : fail.push('Find Physics 5054');

  // Grouped subject endpoint
  const detail = await j('GET', `/papers/subject/${phys.id}`, null, token);
  if (detail.status === 200 && detail.data.subject) {
    pass.push('Grouped subject endpoint');
  } else {
    fail.push('Grouped subject endpoint: ' + JSON.stringify(detail.data));
  }

  const papers = detail.data.papers;
  const p2 = papers.find(p => p.paper_number === 2 && p.variant === 21);
  const p2v22 = papers.find(p => p.paper_number === 2 && p.variant === 22);

  // Test A: toggle variant 21 of Paper 2
  const t1 = await j('POST', '/progress/toggle', { paperId: p2.id }, token);
  t1.data.completed === true ? pass.push('Test A: toggle on') : fail.push('Test A: toggle on=' + t1.data.completed);

  // Test B: refresh (re-fetch subject) - should still be completed
  const detailB = await j('GET', `/papers/subject/${phys.id}`, null, token);
  const p2B = detailB.data.papers.find(p => p.id === p2.id);
  p2B && p2B.completed === 1 ? pass.push('Test B: persists after refresh') : fail.push('Test B: refresh, completed=' + p2B?.completed);

  // Test C: Past Papers /papers endpoint shows same paper completed
  const pp = await j('GET', '/papers?subject=5054&limit=200', null, token);
  const ppP2 = pp.data.papers.find(p => p.id === p2.id);
  ppP2 && ppP2.completed === 1 ? pass.push('Test C: cross-page sync (Past Papers shows completed)') : fail.push('Test C: PastPapers completed=' + ppP2?.completed);

  // Test E: variant 22 still incomplete
  const p22B = detailB.data.papers.find(p => p.id === p2v22.id);
  (p22B && (p22B.completed === null || p22B.completed === 0)) ? pass.push('Test E: unrelated variant stays incomplete') : fail.push('Test E: v22 completed=' + p22B?.completed);

  // Test D: uncheck from Subjects (toggle back)
  const t2 = await j('POST', '/progress/toggle', { paperId: p2.id }, token);
  t2.data.completed === false ? pass.push('Test D: uncheck') : fail.push('Test D: uncheck=' + t2.data.completed);

  // Test D2: Past Papers now shows incomplete
  const pp2 = await j('GET', '/papers?subject=5054&limit=200', null, token);
  const ppP2b = pp2.data.papers.find(p => p.id === p2.id);
  (ppP2b && (ppP2b.completed === null || ppP2b.completed === 0)) ? pass.push('Test D2: Past Papers shows unchecked after Subjects uncheck') : fail.push('Test D2: PastPapers completed=' + ppP2b?.completed);

  // ATP: check paper types present. 5054 Paper 3 is 'practical' (Practical Test)
  // so verify ATP on IGCSE Physics 0625 which has Paper 6 = Alternative to Practical.
  const physIg = subs.data.find(s => s.code === '0625');
  const detailIg = await j('GET', `/papers/subject/${physIg.id}`, null, token);
  const types = detailIg.data.paperTypes || [];
  types.includes('alternative_to_practical') ? pass.push('ATP type present for IGCSE Physics') : fail.push('ATP type missing');

  // Test F: mark 2 variants of paper 2, verify count 2/x (via /progress)
  await j('POST', '/progress/toggle', { paperId: p2.id }, token);
  await j('POST', '/progress/toggle', { paperId: p2v22.id }, token);
  const prog = await j('GET', '/progress', null, token);
  const paper2Ids = papers.filter(p => p.paper_number === 2).map(p => p.id);
  const doneInPaper2 = paper2Ids.filter(id => prog.data.find(p => p.paper_id === id && p.completed)).length;
  doneInPaper2 === 2 ? pass.push('Test F: Paper 2 shows 2/' + paper2Ids.length + ' completed') : fail.push('Test F: done=' + doneInPaper2);

  // cleanup
  await j('POST', '/progress/toggle', { paperId: p2.id }, token);
  await j('POST', '/progress/toggle', { paperId: p2v22.id }, token);

  // ATP search (IGCSE Physics 0625 has real ATP papers)
  const atp1 = await j('GET', '/papers?q=' + encodeURIComponent('Alternative to Practical') + '&subject=0625&limit=5', null, token);
  const atp2 = await j('GET', '/papers?q=ATP&subject=0625&limit=5', null, token);
  const atp3 = await j('GET', '/papers?q=' + encodeURIComponent('Physics ATP') + '&limit=5', null, token);
  const allAtp = (atp1.data.papers || []).every(p => p.paper_type === 'alternative_to_practical');
  allAtp ? pass.push('ATP search (full phrase) returns only ATP') : fail.push('ATP search full phrase');
  ((atp2.data.papers || []).length > 0) ? pass.push('ATP search (abbrev) returns results') : fail.push('ATP search abbrev');
  ((atp3.data.papers || []).length > 0) ? pass.push('ATP search (Physics ATP) returns results') : fail.push('ATP search Physics ATP');

  // Paper type filter
  const ft = await j('GET', '/papers?paper_type=alternative_to_practical&subject=0625&limit=5', null, token);
  ((ft.data.papers || []).length > 0 && ft.data.papers.every(p => p.paper_type === 'alternative_to_practical'))
    ? pass.push('Paper type filter') : fail.push('Paper type filter');

  // Component code search: 4024/13 (April 2025 MJ verified variant)
  const comp = await j('GET', '/papers?q=' + encodeURIComponent('4024/13') + '&limit=5', null, token);
  const compHit = (comp.data.papers || []).find(p => p.component_code === '4024/13');
  compHit ? pass.push('Component code search (4024/13)') : fail.push('Component code search');

  // New fields surfaced on list query
  const fieldCheck = (comp.data.papers || []).every(p => 'series_code' in p && 'verification_status' in p)
    ? pass.push('List query surfaces series_code + verification_status')
    : fail.push('List query missing new fields');

  // filters endpoint has paperTypes + verificationStatuses
  const filt = await j('GET', '/papers/filters', null, token);
  (filt.data.paperTypes && filt.data.paperTypes.includes('alternative_to_practical'))
    ? pass.push('/papers/filters includes paperTypes') : fail.push('filters paperTypes');
  (filt.data.verificationStatuses && filt.data.verificationStatuses.includes('verified'))
    ? pass.push('/papers/filters includes verificationStatuses') : fail.push('filters verificationStatuses');

  // Stats still works
  const stats = await j('GET', '/papers/stats', null, token);
  stats.status === 200 ? pass.push('Stats endpoint') : fail.push('Stats endpoint');

  console.log('\n===== PASS (' + pass.length + ') =====');
  pass.forEach(p => console.log('  [PASS] ' + p));
  console.log('\n===== FAIL (' + fail.length + ') =====');
  fail.forEach(f => console.log('  [FAIL] ' + f));
})();
