const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// Flattened query fragments over the normalized schema.
// An "atomic paper" is a Variant (component + variant).
// ---------------------------------------------------------------------------

// Returns resource URL columns (question paper etc.) for a variant via the
// paper_resources table. Aliased to a single letter to keep queries short.
function resourceSelect(alias) {
  return `
    (SELECT url FROM paper_resources pr
      WHERE pr.variant_id = ${alias}.id AND pr.resource_type = 'question_paper' LIMIT 1) AS question_paper_url,
    (SELECT url FROM paper_resources pr
      WHERE pr.variant_id = ${alias}.id AND pr.resource_type = 'mark_scheme' LIMIT 1) AS mark_scheme_url,
    (SELECT url FROM paper_resources pr
      WHERE pr.variant_id = ${alias}.id AND pr.resource_type = 'examiner_report' LIMIT 1) AS examiner_report_url
  `;
}

const VARIANT_COLS = `
  v.id AS id,
  v.variant_number AS variant,
  v.verified AS variant_verified,
  c.component_code,
  c.paper_number,
  c.paper_type,
  c.paper_label,
  c.title AS component_title,
  c.verified AS component_verified,
  es.year,
  es.session,
  es.series_code,
  es.verified AS session_verified,
  ${verificationLabel('c')} AS verification_status,
  s.id AS subject_id,
  s.name AS subject_name,
  s.code AS subject_code,
  q.name AS qualification_name,
  q.short_name AS qualification_short_name,
  ${resourceSelect('v')}
`;

const VARIANT_FROM = `
  FROM variants v
  JOIN components c ON c.id = v.component_id
  JOIN exam_sessions es ON es.id = c.exam_session_id
  JOIN subjects s ON s.id = es.subject_id
  JOIN qualifications q ON q.id = s.qualification_id
`;

// A variant is "verified" only if its component is verified (variants inherit).
function verificationLabel(alias) {
  return `CASE WHEN ${alias}.verified = 1 THEN 'verified' ELSE 'unverified' END`;
}

// Public endpoint: list all subjects with variant counts + verified counts
router.get('/subjects', (req, res) => {
  try {
    const subjects = db.prepare(`
      SELECT s.id, s.name, s.code, s.description,
        q.name as qualification_name, q.short_name as qualification_short_name,
        (SELECT COUNT(*) FROM variants v
          JOIN components c ON c.id = v.component_id
          JOIN exam_sessions es ON es.id = c.exam_session_id
          WHERE es.subject_id = s.id) as paper_count,
        (SELECT COUNT(*) FROM variants v
          JOIN components c ON c.id = v.component_id
          JOIN exam_sessions es ON es.id = c.exam_session_id
          WHERE es.subject_id = s.id AND c.verified = 1) as verified_count
      FROM subjects s
      JOIN qualifications q ON s.qualification_id = q.id
      ORDER BY s.code
    `).all();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// ---------------------------------------------------------------------------
// Smart, forgiving search parsing.
// Users can type a paper however it comes to mind — the code, year, session,
// paper & variant can appear in any order and format ("4024/12", "p1 v2 4024",
// "June 2023 maths", "9702/22 o/n", "v32 chemistry"). Punctuation is stripped
// and common aliases/synonyms are expanded so exact formatting isn't required.
// ---------------------------------------------------------------------------

const SESSION_ALIASES = {
  'mayjune': 'mj', 'may/june': 'mj', 'mj': 'mj', 'm/j': 'mj',
  'june': 'mj', 'may': 'mj', 'summer': 'mj',
  'octobernovember': 'on', 'october/november': 'on', 'on': 'on', 'o/n': 'on',
  'octnov': 'on', 'oct/nov': 'on', 'octnovember': 'on', 'octnov': 'on',
  'november': 'on', 'nov': 'on', 'october': 'on', 'oct': 'on', 'winter': 'on',
};

// Common subject synonyms so short/alternate spellings still hit the right name.
const TERM_ALIASES = {
  maths: ['mathematics'], math: ['mathematics'], mathematics: ['maths', 'math'],
  bio: ['biology'], biology: ['bio'],
  chem: ['chemistry'], chemistry: ['chem'],
  phy: ['physics'], phys: ['physics'], physics: ['phy', 'phys'],
  comp: ['computer'], computer: ['comp'], compute: ['computer'],
  eng: ['english'], english: ['eng'], language: ['english'],
  sci: ['science'], science: ['sci'],
  ict: [], inform: ['information'], information: ['inform'], info: ['information'],
  econ: ['economics'], economics: ['econ'],
  acc: ['accounting'], accounting: ['acc'], accounts: ['accounting'],
  geo: ['geography'], geography: ['geo'],
  his: ['history'], history: ['his'],
  lit: ['literature'], literature: ['lit'], literacy: ['literature'],
  bus: ['business'], business: ['bus'], businessstudies: ['business', 'business studies'],
  soci: ['sociology'], sociology: ['soci'],
  psych: ['psychology'], psychology: ['psych'],
  design: ['design'], 'design&tech': ['design and technology'], tech: ['technology'],
  art: ['art'], 'visual': ['art'],
  atp: ['alternative to practical'], alt: ['alternative to practical'],
  'alternative to practical': ['atp', 'alt'],
};

const retainNorm = (t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, '');

// Parse a free-text search string into structured filters + leftover terms.
function parseSearchQuery(raw) {
  const result = { year: null, session: null, paper: null, variant: null, subjectCode: null, terms: [] };

  const tokens = String(raw || '').replace(/\s+/g, ' ').trim().split(' ');
  const used = new Array(tokens.length).fill(false);

  const mark = (i) => { used[i] = true; };
  const tok = (i) => (tokens[i] || '').toLowerCase();

  for (let i = 0; i < tokens.length; i++) {
    if (used[i]) continue;
    const t = tok(i);
    const norm = retainNorm(t);
    if (!t) { mark(i); continue; }

    // 4-digit year (20xx)
    if (/^20\d{2}$/.test(t) && !result.year) { result.year = t; mark(i); continue; }

    // Session aliases — check two-word form first ("may june", "oct nov")
    if (!result.session && /[a-z]/.test(t)) {
      const pair = retainNorm(t + (tokens[i + 1] ? ' ' + tokens[i + 1] : ''));
      if (SESSION_ALIASES[pair]) { result.session = SESSION_ALIASES[pair]; mark(i); if (tokens[i + 1]) mark(i + 1); continue; }
      if (SESSION_ALIASES[norm]) { result.session = SESSION_ALIASES[norm]; mark(i); continue; }
    }

    // "paper N" (possibly split) / "paperN" / "pN"
    // A 2-digit "paper" number (>=10) follows CIE convention: paper = 1st digit,
    // variant = 2nd digit (e.g. "paper 12" => Paper 1, Variant 2).
    if (!/^\d{4}$/.test(t)) {
      const paperPair = /^\d+$/.test(tokens[i + 1] || '')
        ? (t + ' ' + tokens[i + 1]).toLowerCase()
        : t.toLowerCase();
      const pm = paperPair.match(/^papers?\s+(\d+)$/);
      if (pm && !result.paper && !result.variant) {
        const n = parseInt(pm[1]);
        if (n >= 10 && n <= 62) { result.paper = String(Math.floor(n / 10)); result.variant = String(n % 10); }
        else if (n >= 1 && n <= 9) { result.paper = pm[1]; }
        mark(i); if (/^paper/i.test(t) && tokens[i + 1]) mark(i + 1);
        continue;
      }
      const pm2 = t.match(/^papers?(\d+)$/) || t.match(/^p(\d+)$/);
      if (pm2 && !result.paper) { const n = parseInt(pm2[1]); if (n >= 10 && n <= 62) { result.paper = String(Math.floor(n / 10)); result.variant = String(n % 10); } else { result.paper = pm2[1]; } mark(i); continue; }
    }

    // "variant N" (possibly split) / "variantN" / "vN"
    if (/^v/i.test(t)) {
      const vPair = /^\d+$/.test(tokens[i + 1] || '')
        ? (t + ' ' + tokens[i + 1]).toLowerCase()
        : t.toLowerCase();
      const vm = vPair.match(/^variants?\s+(\d{1,2})$/) || (/^v\d{1,2}$/.test(t) && [null, t.slice(1)]);
      if (vm && vm[1] && !result.variant) { result.variant = String(parseInt(vm[1])); mark(i); if (/^variant/i.test(t) && tokens[i + 1]) mark(i + 1); continue; }
    }

    // "code/paper[/variant]" slash/dash notation, e.g. 4024/12, 4024-1, 9702/22
    const cm = t.match(/^(\d{4})[\/\-](\d{1,2})(?:[\/\-](\d{1,2}))?$/);
    if (cm) {
      if (!result.subjectCode) result.subjectCode = cm[1];
      if (cm[3]) { result.paper = cm[2]; result.variant = cm[3]; }
      else if (cm[2].length === 2 && parseInt(cm[2]) >= 10) { result.variant = cm[2]; }
      else { result.paper = cm[2]; }
      mark(i); continue;
    }

    // bare 4-digit subject code
    if (/^\d{4}$/.test(t) && !result.subjectCode) { result.subjectCode = t; mark(i); continue; }

    // bare 2-digit: variant if 10-62, else paper (1-9)
    if (/^\d{1,2}$/.test(t)) {
      const n = parseInt(t);
      if (n >= 10 && n <= 62 && !result.variant) { result.variant = t; mark(i); continue; }
      if (n >= 1 && n <= 9 && !result.paper) { result.paper = t; mark(i); continue; }
    }
  }

  tokens.forEach((t, i) => {
    if (!used[i]) { const n = retainNorm(t); if (n) result.terms.push(n); }
  });

  return result;
}

// Build OR-predicate (and params) for one free-text term, expanding aliases
// and matching with forgiving substring semantics.
function termPredicate(term, params) {
  const names = [term, ...(TERM_ALIASES[term] || []), ...(TERM_ALIASES[retainNorm(term)] || [])]
    .filter((v, idx, a) => v && a.indexOf(v) === idx);

  const preds = [];
  const termParams = [];
  const addCol = (col) => { preds.push(`${col} LIKE ?`); termParams.push(`%${term}%`); };
  addCol('s.name');
  addCol('s.code');
  addCol('c.component_code');
  addCol('c.paper_type');
  addCol('c.title');
  addCol('q.short_name');
  addCol('q.name');
  addCol('CAST(es.year AS TEXT)');
  addCol('CAST(c.paper_number AS TEXT)');
  addCol('CAST(v.variant_number AS TEXT)');
  // subject-name matches against each alias too
  for (const alias of names.slice(1)) {
    preds.push('s.name LIKE ?');
    termParams.push(`%${alias}%`);
    preds.push('c.paper_type LIKE ?');
    termParams.push(`%${alias}%`);
    preds.push('c.paper_label LIKE ?');
    termParams.push(`%${alias}%`);
    preds.push('c.title LIKE ?');
    termParams.push(`%${alias}%`);
  }
  params.push(...termParams);
  return `(${preds.join(' OR ')})`;
}

// Protected: search/filter variants (each row is one variant = one paper)
router.get('/', authenticateToken, (req, res) => {
  try {
    const { q, subject, qualification, session, year, paper_number, variant, paper_type, verification_status, status, sort, page = 1, limit = 50 } = req.query;

    const conditions = [];
    const params = [];

    if (qualification) { conditions.push('q.short_name = ?'); params.push(qualification); }
    if (paper_type && paper_type !== 'all') { conditions.push('c.paper_type = ?'); params.push(paper_type); }
    if (verification_status && verification_status !== 'all') {
      conditions.push(`${verificationLabel('c')} = ?`);
      params.push(verification_status);
    }

    // Smart, forgiving search parsing — free-text `q` may mix any format/order.
    const parsed = q ? parseSearchQuery(q) : { year: null, session: null, paper: null, variant: null, subjectCode: null, terms: [] };

    const effYear = parsed.year || year;
    const effSession = ((raw) => {
      if (!raw) return null;
      const norm = retainNorm(String(raw));
      return SESSION_ALIASES[norm] || norm;
    })(parsed.session || (session && session !== 'all' ? session : null));
    const effPaper = parsed.paper || paper_number;
    const effVariant = parsed.variant || variant;
    const effSubject = parsed.subjectCode || subject;

    if (effSubject) { conditions.push('s.code = ?'); params.push(effSubject); }
    if (effYear) { conditions.push('es.year = ?'); params.push(parseInt(effYear)); }
    if (effSession) { conditions.push('es.session = ?'); params.push(effSession); }
    if (effPaper) { conditions.push('c.paper_number = ?'); params.push(parseInt(effPaper)); }
    if (effVariant) { conditions.push('v.variant_number = ?'); params.push(parseInt(effVariant)); }

    // Remaining free-text terms (aliases + forgiving substring matching)
    for (const term of parsed.terms) {
      conditions.push(termPredicate(term, params));
    }

    const uid = req.user ? req.user.id : null;

    if (status === 'completed' && uid) {
      conditions.push('up.completed = 1 AND up.user_id = ?'); params.push(uid);
    } else if (status === 'not_completed' && uid) {
      conditions.push('(up.completed IS NULL OR up.completed = 0 OR up.user_id != ?)'); params.push(uid);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const joinClause = 'LEFT JOIN user_progress up ON v.id = up.variant_id' + (uid ? ' AND up.user_id = ?' : '');
    const joinParams = uid ? [uid, ...params] : [...params];

    let orderClause = 'ORDER BY s.code, es.year DESC, es.session, c.paper_number, v.variant_number';
    if (sort === 'newest') orderClause = 'ORDER BY es.year DESC, s.code, c.paper_number, v.variant_number';
    if (sort === 'oldest') orderClause = 'ORDER BY es.year ASC, s.code, c.paper_number, v.variant_number';
    if (sort === 'subject') orderClause = 'ORDER BY s.name, es.year DESC, c.paper_number';
    if (sort === 'paper') orderClause = 'ORDER BY c.paper_number, s.code, es.year DESC';
    if (sort === 'recently_completed') orderClause = 'ORDER BY up.completed_at DESC NULLS LAST, s.code, es.year DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countQuery = `
      SELECT COUNT(DISTINCT v.id) as total
      ${VARIANT_FROM}
      ${joinClause}
      ${whereClause}
    `;
    const total = db.prepare(countQuery).get(...joinParams);

    const dataQuery = `
      SELECT DISTINCT ${VARIANT_COLS},
        up.completed, up.completed_at
      ${VARIANT_FROM}
      ${joinClause}
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;
    const variants = db.prepare(dataQuery).all(...joinParams, parseInt(limit), offset);

    res.json({ papers: variants, total: total.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Papers search error:', err);
    res.status(500).json({ error: 'Failed to fetch papers' });
  }
});

router.get('/filters', (req, res) => {
  try {
    const qualifications = db.prepare('SELECT DISTINCT q.short_name as name FROM qualifications q JOIN subjects s ON q.id = s.qualification_id ORDER BY q.short_name').all();
    const subjects = db.prepare('SELECT s.id, s.name, s.code, q.short_name as qualification FROM subjects s JOIN qualifications q ON s.qualification_id = q.id ORDER BY s.code').all();
    const years = db.prepare('SELECT DISTINCT year FROM exam_sessions ORDER BY year DESC').all();
    const sessions = db.prepare('SELECT DISTINCT session FROM exam_sessions ORDER BY session').all();
    const paperNumbers = db.prepare('SELECT DISTINCT paper_number FROM components ORDER BY paper_number').all();
    const variants = db.prepare('SELECT DISTINCT variant_number FROM variants ORDER BY variant_number').all();
    const paperTypes = db.prepare('SELECT DISTINCT paper_type FROM components WHERE paper_type IS NOT NULL ORDER BY paper_type').all();
    const verificationStatuses = [
      { name: 'verified' },
      { name: 'unverified' },
    ];
    const resourceTypes = db.prepare('SELECT DISTINCT resource_type FROM paper_resources ORDER BY resource_type').all();

    res.json({
      qualifications: qualifications.map((x) => x.name),
      subjects,
      years: years.map((y) => y.year),
      sessions: sessions.map((s) => (s.session === 'mj' ? 'May/June' : 'October/November')),
      paperNumbers: paperNumbers.map((p) => p.paper_number),
      variants: variants.map((v) => v.variant_number),
      paperTypes: paperTypes.map((p) => p.paper_type),
      verificationStatuses: verificationStatuses.map((v) => v.name),
      resourceTypes: resourceTypes.map((r) => r.resource_type),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

// Grouped subject view: Subject -> Year -> Session -> Component -> Variants
router.get('/subject/:id', authenticateToken, (req, res) => {
  try {
    const subjectId = req.params.id;
    const subject = db.prepare(
      'SELECT s.*, q.name as qualification_name, q.short_name as qualification_short_name FROM subjects s JOIN qualifications q ON s.qualification_id = q.id WHERE s.id = ?'
    ).get(subjectId);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const uid = req.user ? req.user.id : null;

    const rows = db.prepare(`
      SELECT v.id, v.variant_number, es.year, es.session, c.component_code, c.paper_number,
        c.paper_type, c.paper_label, es.series_code, c.verified,
        ${resourceSelect('v')},
        up.completed, up.completed_at
      FROM variants v
      JOIN components c ON c.id = v.component_id
      JOIN exam_sessions es ON es.id = c.exam_session_id
      LEFT JOIN user_progress up ON v.id = up.variant_id
        ${uid ? 'AND up.user_id = ?' : ''}
      WHERE es.subject_id = ?
      ORDER BY es.year DESC, es.session, c.paper_number, v.variant_number
    `).all(...(uid ? [uid, subjectId] : [subjectId]));

    const total = rows.length;
    const completedCount = rows.filter((r) => r.completed).length;

    // Group by Year -> Session -> Paper(number) -> variants[]
    const grouped = {};
    for (const r of rows) {
      const y = r.year;
      if (!grouped[y]) grouped[y] = {};
      const sessKey = r.session;
      if (!grouped[y][sessKey]) grouped[y][sessKey] = {};
      const pn = r.paper_number;
      if (!grouped[y][sessKey][pn]) grouped[y][sessKey][pn] = { paper_type: r.paper_type, paper_label: r.paper_label, component_code: r.component_code, verified: r.verified, variants: [] };
      grouped[y][sessKey][pn].variants.push(r);
    }

    const paperTypes = db.prepare('SELECT DISTINCT c.paper_type FROM components c JOIN exam_sessions es ON c.exam_session_id = es.id WHERE es.subject_id = ? AND c.paper_type IS NOT NULL ORDER BY c.paper_type').all(subjectId).map((x) => x.paper_type);

      res.json({
      subject,
      papers: rows,
      total,
      completed: completedCount,
      remaining: total - completedCount,
      percentage: total > 0 ? Math.round((completedCount / total) * 100) : 0,
      grouped,
      paperTypes,
    });
  } catch (err) {
    console.error('Failed to fetch subject:', err);
    res.status(500).json({ error: 'Failed to fetch subject' });
  }
});

router.get('/stats', authenticateToken, (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM variants').get();
    const completed = db.prepare('SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND completed = 1').get(req.user.id);
    const ignored = db.prepare('SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND ignored = 1').get(req.user.id);

    const bySubject = db.prepare(`
      SELECT s.name, s.code, q.short_name as qualification,
        (SELECT COUNT(*) FROM variants v
          JOIN components c ON c.id = v.component_id
          JOIN exam_sessions es ON es.id = c.exam_session_id
          WHERE es.subject_id = s.id) as total,
        COUNT(CASE WHEN up.completed = 1 THEN 1 END) as completed_count,
        COUNT(CASE WHEN up.ignored = 1 THEN 1 END) as ignored_count
      FROM subjects s
      JOIN qualifications q ON s.qualification_id = q.id
      LEFT JOIN user_progress up ON up.variant_id IN (
        SELECT v.id FROM variants v
        JOIN components c ON c.id = v.component_id
        JOIN exam_sessions es ON es.id = c.exam_session_id
        WHERE es.subject_id = s.id
      ) AND up.user_id = ?
      GROUP BY s.id
      ORDER BY s.code
    `).all(req.user.id);

    const recent = db.prepare(`
      SELECT v.id, s.id as subject_id, es.year, es.session, c.paper_number, v.variant_number,
        c.component_code, es.series_code, s.name as subject_name, s.code as subject_code,
        up.completed_at
      FROM user_progress up
      JOIN variants v ON up.variant_id = v.id
      JOIN components c ON c.id = v.component_id
      JOIN exam_sessions es ON es.id = c.exam_session_id
      JOIN subjects s ON es.subject_id = s.id
      WHERE up.user_id = ? AND up.completed = 1
      ORDER BY up.completed_at DESC
      LIMIT 10
    `).all(req.user.id);

    const ignoredList = db.prepare(`
      SELECT v.id as variant_id, s.id as subject_id, es.year, es.session, c.paper_number, v.variant_number,
        c.component_code, es.series_code, s.name as subject_name, s.code as subject_code,
        up.updated_at as ignored_at
      FROM user_progress up
      JOIN variants v ON up.variant_id = v.id
      JOIN components c ON c.id = v.component_id
      JOIN exam_sessions es ON es.id = c.exam_session_id
      JOIN subjects s ON es.subject_id = s.id
      WHERE up.user_id = ? AND up.ignored = 1
      ORDER BY up.updated_at DESC
    `).all(req.user.id);

    const effectiveTotal = total.count - ignored.count;
    res.json({
      total: total.count,
      completed: completed.count,
      ignored: ignored.count,
      remaining: effectiveTotal - completed.count,
      percentage: effectiveTotal > 0 ? Math.round((completed.count / effectiveTotal) * 100) : 0,
      bySubject,
      recent,
      ignoredPapers: ignoredList,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Single variant detail with its resources.
// NOTE: this wildcard `/:id` route must be registered LAST so that specific
// paths such as `/subjects`, `/filters`, `/subject/:id` and `/stats` are
// matched before it. Registering it earlier would swallow `/stats` (BUG FIX).
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const variant = db.prepare(`
      SELECT ${VARIANT_COLS}
      ${VARIANT_FROM}
      WHERE v.id = ?
    `).get(req.params.id);
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    const resources = db.prepare('SELECT id, resource_type, title, url, provider, verified, source, source_url FROM paper_resources WHERE variant_id = ?').all(req.params.id);

    const up = db.prepare('SELECT id, completed, ignored, completed_at FROM user_progress WHERE variant_id = ? AND user_id = ?').get(req.params.id, req.user.id);

    res.json({ variant, resources, progress: up || null });
  } catch (err) {
    console.error('Failed to fetch variant:', err);
    res.status(500).json({ error: 'Failed to fetch variant' });
  }
});

module.exports = router;
