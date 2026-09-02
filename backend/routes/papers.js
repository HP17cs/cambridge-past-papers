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
  c.title AS component_title,
  c.verified AS component_verified,
  es.year,
  es.session,
  es.series_code,
  es.verified AS session_verified,
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

// Protected: search/filter variants (each row is one variant = one paper)
router.get('/', authenticateToken, (req, res) => {
  try {
    const { q, subject, qualification, session, year, paper_number, variant, paper_type, verification_status, status, sort, page = 1, limit = 50 } = req.query;

    const conditions = [];
    const params = [];

    if (subject) { conditions.push('s.code = ?'); params.push(subject); }
    if (qualification) { conditions.push('q.short_name = ?'); params.push(qualification); }
    if (paper_type && paper_type !== 'all') { conditions.push('c.paper_type = ?'); params.push(paper_type); }
    if (verification_status && verification_status !== 'all') {
      conditions.push(`${verificationLabel('c')} = ?`);
      params.push(verification_status);
    }

    // Smart search parsing
    let searchQuery = q || '';
    let parsedYear = year;
    let parsedSession = session;
    let parsedPaperNumber = paper_number;
    let parsedVariant = variant;

    if (q) {
      const paperMatch = q.match(/\bpaper\s+(\d+)/i);
      if (paperMatch && !paper_number) {
        parsedPaperNumber = paperMatch[1];
        searchQuery = searchQuery.replace(/\bpaper\s+\d+/i, ' ').trim();
      }
      const yearMatch = searchQuery.match(/\b(20\d{2})\b/);
      if (yearMatch && !year) {
        parsedYear = yearMatch[1];
        searchQuery = searchQuery.replace(/\b20\d{2}\b/, '').trim();
      }
      const mjMatch = searchQuery.match(/\b(may\/june|m\/j)\b/i);
      if (mjMatch && !session) {
        parsedSession = 'May/June';
        searchQuery = searchQuery.replace(/\b(may\/june|m\/j)\b/i, '').trim();
      }
      const onMatch = searchQuery.match(/\b(october\/november|o\/n)\b/i);
      if (onMatch && !session) {
        parsedSession = 'October/November';
        searchQuery = searchQuery.replace(/\b(october\/november|o\/n)\b/i, '').trim();
      }
      const varMatch = searchQuery.match(/\b(?:variant\s+|v)(\d{2})\b/i) || searchQuery.match(/\b(\d{2})\b$/);
      if (varMatch && !variant && varMatch[1].length === 2) {
        const v = parseInt(varMatch[1]);
        if (v >= 10 && v <= 62) {
          parsedVariant = varMatch[1];
          searchQuery = searchQuery.replace(varMatch[0], '').trim();
        }
      }
    }

    if (parsedYear) { conditions.push('es.year = ?'); params.push(parseInt(parsedYear)); }
    if (parsedSession) {
      const s = parsedSession === 'May/June' ? 'mj' : 'on';
      conditions.push('es.session = ?'); params.push(s);
    }
    if (parsedPaperNumber) { conditions.push('c.paper_number = ?'); params.push(parseInt(parsedPaperNumber)); }
    if (parsedVariant) { conditions.push('v.variant_number = ?'); params.push(parseInt(parsedVariant)); }

    // Remaining free-text search terms
    const remainingQuery = searchQuery.replace(/\s+/g, ' ').trim();
    if (remainingQuery) {
      const terms = remainingQuery.split(/\s+/).filter((t) => t.length > 0);
      for (const term of terms) {
        // component_code (e.g. '4024/1') OR full label (e.g. '4024/12')
        conditions.push(`(
          s.name LIKE ? OR s.code LIKE ? OR c.component_code LIKE ? OR
          (s.code || '/' || v.variant_number) LIKE ? OR
          CAST(es.year AS TEXT) LIKE ? OR CAST(c.paper_number AS TEXT) LIKE ?
          OR CAST(v.variant_number AS TEXT) LIKE ? OR es.session LIKE ?
          OR q.short_name LIKE ? OR c.paper_type LIKE ?
        )`);
        const pct = `%${term}%`;
        params.push(pct, pct, pct, pct, pct, pct, pct, pct, pct, pct);
      }
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
        c.paper_type, es.series_code, c.verified,
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
      if (!grouped[y][sessKey][pn]) grouped[y][sessKey][pn] = { paper_type: r.paper_type, component_code: r.component_code, verified: r.verified, variants: [] };
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

// Single variant detail with its resources
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const variant = db.prepare(`
      SELECT ${VARIANT_COLS}
      ${VARIANT_FROM}
      WHERE v.id = ?
    `).get(req.params.id);
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    const resources = db.prepare('SELECT id, resource_type, title, url, provider, verified, source, source_url FROM paper_resources WHERE variant_id = ?').all(req.params.id);

    const up = db.prepare('SELECT id, completed, completed_at FROM user_progress WHERE variant_id = ? AND user_id = ?').get(req.params.id, req.user.id);

    res.json({ variant, resources, progress: up || null });
  } catch (err) {
    console.error('Failed to fetch variant:', err);
    res.status(500).json({ error: 'Failed to fetch variant' });
  }
});

router.get('/stats', authenticateToken, (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM variants').get();
    const completed = db.prepare('SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND completed = 1').get(req.user.id);

    const bySubject = db.prepare(`
      SELECT s.name, s.code, q.short_name as qualification,
        (SELECT COUNT(*) FROM variants v
          JOIN components c ON c.id = v.component_id
          JOIN exam_sessions es ON es.id = c.exam_session_id
          WHERE es.subject_id = s.id) as total,
        COUNT(CASE WHEN up.completed = 1 THEN 1 END) as completed_count
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

    res.json({
      total: total.count,
      completed: completed.count,
      remaining: total.count - completed.count,
      percentage: total.count > 0 ? Math.round((completed.count / total.count) * 100) : 0,
      bySubject,
      recent,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
