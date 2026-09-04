const express = require('express');
const multer = require('multer');
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken, requireAdmin);

const sessionKey = (s) => (s === 'mj'|| s === 'May/June' ? 'mj' : 'on');

// Subjects
router.get('/subjects', (req, res) => {
  try {
    const subjects = db.prepare(`
      SELECT s.*, q.name as qualification_name, q.short_name as qualification_short_name,
        (SELECT COUNT(*) FROM exam_sessions es WHERE es.subject_id = s.id) as session_count,
        (SELECT COUNT(*) FROM variants v
          JOIN components c ON c.id = v.component_id
          JOIN exam_sessions es ON es.id = c.exam_session_id WHERE es.subject_id = s.id) as paper_count
      FROM subjects s
      JOIN qualifications q ON s.qualification_id = q.id
      ORDER BY s.code
    `).all();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

router.post('/subjects', (req, res) => {
  try {
    const { name, code, qualificationId, description } = req.body;
    if (!name || !code || !qualificationId) {
      return res.status(400).json({ error: 'Name, code, and qualification are required' });
    }
    const result = db.prepare('INSERT INTO subjects (name, code, qualification_id, description) VALUES (?, ?, ?, ?)').run(name, code, qualificationId, description || '');
    res.json({ id: result.lastInsertRowid, message: 'Subject created' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Subject code already exists for this qualification' });
    }
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

router.put('/subjects/:id', (req, res) => {
  try {
    const { name, code, qualificationId, description } = req.body;
    db.prepare('UPDATE subjects SET name = COALESCE(?, name), code = COALESCE(?, code), qualification_id = COALESCE(?, qualification_id), description = COALESCE(?, description), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(name, code, qualificationId, description, req.params.id);
    res.json({ message: 'Subject updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

router.delete('/subjects/:id', (req, res) => {
  try {
    // Cascade removes sessions/components/variants/resources; progress on those
    // variants is removed too (reported).
    const deletedProgress = db.prepare(`
      SELECT COUNT(*) as count FROM user_progress up
      WHERE up.variant_id IN (
        SELECT v.id FROM variants v
        JOIN components c ON c.id = v.component_id
        JOIN exam_sessions es ON es.id = c.exam_session_id
        WHERE es.subject_id = ?
      )
    `).get(req.params.id).count;
    db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
    res.json({ message: 'Subject deleted', progressAffected: deletedProgress });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// Sessions for a subject
router.get('/subjects/:id/sessions', (req, res) => {
  try {
    const sessions = db.prepare(`
      SELECT es.*,
        (SELECT COUNT(*) FROM components c WHERE c.exam_session_id = es.id) as component_count,
        (SELECT COUNT(*) FROM variants v JOIN components c ON c.id = v.component_id WHERE c.exam_session_id = es.id) as variant_count
      FROM exam_sessions es
      WHERE es.subject_id = ?
      ORDER BY es.year DESC, es.session
    `).all(req.params.id);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Full hierarchy for a subject (for admin tree view)
router.get('/subjects/:id/tree', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT es.id as session_id, es.year, es.session, es.series_code, es.verified as session_verified,
             c.id as component_id, c.component_code, c.paper_number, c.paper_type, c.verified as component_verified,
             v.id as variant_id, v.variant_number, v.verified as variant_verified,
             pr.id as resource_id, pr.resource_type, pr.url, pr.verified as resource_verified, pr.provider
      FROM exam_sessions es
      LEFT JOIN components c ON c.exam_session_id = es.id
      LEFT JOIN variants v ON v.component_id = c.id
      LEFT JOIN paper_resources pr ON pr.variant_id = v.id
      WHERE es.subject_id = ?
      ORDER BY es.year DESC, es.session, c.paper_number, v.variant_number, pr.resource_type
    `).all(req.params.id);

    const sessions = {};
    for (const r of rows) {
      if (!sessions[r.session_id]) {
        sessions[r.session_id] = {
          id: r.session_id, year: r.year, session: r.session, series_code: r.series_code,
          verified: r.session_verified, components: {},
        };
      }
      if (r.component_id == null) continue;
      const sess = sessions[r.session_id];
      if (!sess.components[r.component_id]) {
        sess.components[r.component_id] = {
          id: r.component_id, component_code: r.component_code, paper_number: r.paper_number,
          paper_type: r.paper_type, verified: r.component_verified, variants: {},
        };
      }
      if (r.variant_id == null) continue;
      const comp = sess.components[r.component_id];
      if (!comp.variants[r.variant_id]) {
        comp.variants[r.variant_id] = {
          id: r.variant_id, variant_number: r.variant_number, verified: r.variant_verified, resources: [],
        };
      }
      if (r.resource_id != null) {
        comp.variants[r.variant_id].resources.push({
          id: r.resource_id, resource_type: r.resource_type, url: r.url, verified: r.resource_verified, provider: r.provider,
        });
      }
    }

    const arr = Object.values(sessions).map((s) => ({ ...s, components: Object.values(s.components) }));
    res.json(arr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch subject tree' });
  }
});

// Session CRUD
router.post('/sessions', (req, res) => {
  try {
    const { subjectId, year, session } = req.body;
    if (!subjectId || !year || !session) return res.status(400).json({ error: 'subjectId, year, session required' });
    const sk = sessionKey(session);
    const yy = String(year).slice(2);
    const series = `${sk === 'mj' ? 's' : 'w'}${yy}`;
    // Insert OR update (upsert on unique subject/year/session)
    const existing = db.prepare('SELECT id FROM exam_sessions WHERE subject_id = ? AND year = ? AND session = ?').get(subjectId, parseInt(year), sk);
    if (existing) return res.json({ id: existing.id, message: 'Session already exists' });
    const r = db.prepare('INSERT INTO exam_sessions (subject_id, year, session, series_code, verified) VALUES (?, ?, ?, ?, ?)')
      .run(subjectId, parseInt(year), sk, series, 0);
    res.json({ id: r.lastInsertRowid, message: 'Session created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.delete('/sessions/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM exam_sessions WHERE id = ?').run(req.params.id);
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Component CRUD
router.post('/sessions/:id/components', (req, res) => {
  try {
    const { paperNumber, paperType } = req.body;
    if (!paperNumber || !paperType) return res.status(400).json({ error: 'paperNumber and paperType required' });
    const es = db.prepare('SELECT subject_id FROM exam_sessions WHERE id = ?').get(req.params.id);
    if (!es) return res.status(404).json({ error: 'Session not found' });
    const sub = db.prepare('SELECT code FROM subjects WHERE id = ?').get(es.subject_id);
    const componentCode = `${sub.code}/${paperNumber}`;
    const existing = db.prepare('SELECT id FROM components WHERE exam_session_id = ? AND paper_number = ?').get(req.params.id, parseInt(paperNumber));
    if (existing) {
      db.prepare('UPDATE components SET paper_type = ?, component_code = ? WHERE id = ?').run(paperType, componentCode, existing.id);
      return res.json({ id: existing.id, message: 'Component already exists, updated' });
    }
    const r = db.prepare('INSERT INTO components (exam_session_id, component_code, paper_number, paper_type, verified) VALUES (?, ?, ?, ?, 0)')
      .run(req.params.id, componentCode, parseInt(paperNumber), paperType);
    res.json({ id: r.lastInsertRowid, message: 'Component created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create component' });
  }
});

// Variant CRUD
router.post('/components/:id/variants', (req, res) => {
  try {
    const { variantNumber, verified } = req.body;
    if (!variantNumber) return res.status(400).json({ error: 'variantNumber required' });
    const r = db.prepare('INSERT INTO variants (component_id, variant_number, verified) VALUES (?, ?, ?)')
      .run(req.params.id, parseInt(variantNumber), verified ? 1 : 0);
    res.json({ id: r.lastInsertRowid, message: 'Variant created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create variant' });
  }
});

router.put('/variants/:id', (req, res) => {
  try {
    const { verified, variantNumber } = req.body;
    db.prepare('UPDATE variants SET verified = COALESCE(?, verified), variant_number = COALESCE(?, variant_number) WHERE id = ?')
      .run(verified === undefined ? null : (verified ? 1 : 0), variantNumber === undefined ? null : parseInt(variantNumber), req.params.id);
    res.json({ message: 'Variant updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update variant' });
  }
});

router.delete('/variants/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM user_progress WHERE variant_id = ?').run(req.params.id);
    db.prepare('DELETE FROM variants WHERE id = ?').run(req.params.id);
    res.json({ message: 'Variant deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete variant' });
  }
});

// Resource CRUD
router.put('/resources/:id', (req, res) => {
  try {
    const { url, verified, resourceType, provider } = req.body;
    db.prepare('UPDATE paper_resources SET url = COALESCE(?, url), verified = COALESCE(?, verified), resource_type = COALESCE(?, resource_type), provider = COALESCE(?, provider) WHERE id = ?')
      .run(url ?? null, verified === undefined ? null : (verified ? 1 : 0), resourceType ?? null, provider ?? null, req.params.id);
    res.json({ message: 'Resource updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

router.delete('/resources/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM paper_resources WHERE id = ?').run(req.params.id);
    res.json({ message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

// Bulk import of variants + resources.
// Accepts JSON (array or {variants:[...]}) or CSV with headers:
//   subject_code,year,session,paper_number,paper_type,variant_number,
//   verified,question_paper_url,mark_scheme_url,examiner_report_url
// session is 'mj' or 'on' (May/June, October/November also accepted).
router.post('/import/papers', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File required' });

    const content = req.file.buffer.toString('utf-8');
    let records;

    if (req.file.originalname.endsWith('.json')) {
      const parsed = JSON.parse(content);
      records = Array.isArray(parsed) ? parsed : parsed.variants || parsed.papers || [];
    } else if (req.file.originalname.endsWith('.csv')) {
      const lines = content.trim().split('\n');
      const headers = lines[0].split(',').map((h) => h.trim());
      records = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const obj = {};
        headers.forEach((h, i) => (obj[h] = values[i]));
        return obj;
      });
    } else {
      return res.status(400).json({ error: 'Supports .json and .csv files' });
    }

    let imported = 0;
    const errors = [];

    const getSubject = db.prepare('SELECT id FROM subjects WHERE code = ?');
    const getSession = db.prepare('SELECT id FROM exam_sessions WHERE subject_id = ? AND year = ? AND session = ?');
    const getComponent = db.prepare('SELECT id FROM components WHERE exam_session_id = ? AND paper_number = ?');
    const getVariant = db.prepare('SELECT id FROM variants WHERE component_id = ? AND variant_number = ?');

    const upsertSession = db.prepare('INSERT INTO exam_sessions (subject_id, year, session, series_code, verified) VALUES (?, ?, ?, ?, ?)');
    const upsertComponent = db.prepare('INSERT INTO components (exam_session_id, component_code, paper_number, paper_type, verified) VALUES (?, ?, ?, ?, ?)');
    const upsertVariant = db.prepare('INSERT INTO variants (component_id, variant_number, verified) VALUES (?, ?, ?)');
    const upsertResource = db.prepare('INSERT INTO paper_resources (variant_id, resource_type, url, verified, provider) VALUES (?, ?, ?, ?, ?)');

    db.exec('BEGIN');
    try {
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        try {
          if (!r.subject_code || !r.year || !r.session || !r.paper_number) {
            errors.push({ row: i + 1, error: 'Missing required fields (subject_code/year/session/paper_number)' });
            continue;
          }
          const subject = getSubject.get(r.subject_code);
          if (!subject) {
            errors.push({ row: i + 1, error: `Subject code ${r.subject_code} not found` });
            continue;
          }
          const year = parseInt(r.year);
          const sk = sessionKey(r.session);
          const paperNumber = parseInt(r.paper_number);
          const paperType = r.paper_type || 'theory';
          const variantNumber = r.variant_number ? parseInt(r.variant_number) : null;
          const verified = (r.verified === 1 || r.verified === 'true' || r.verified === true) ? 1 : 0;

          let session = getSession.get(subject.id, year, sk);
          if (!session) {
            const yy = String(year).slice(2);
            const series = `${sk === 'mj' ? 's' : 'w'}${yy}`;
            const sr = upsertSession.run(subject.id, year, sk, series, verified);
            session = { id: sr.lastInsertRowid };
          }

          let component = getComponent.get(session.id, paperNumber);
          if (!component) {
            const sub = db.prepare('SELECT code FROM subjects WHERE id = ?').get(subject.id);
            const cr = upsertComponent.run(session.id, `${sub.code}/${paperNumber}`, paperNumber, paperType, verified);
            component = { id: cr.lastInsertRowid };
          } else if (r.paper_type) {
            db.prepare('UPDATE components SET paper_type = ?, verified = CASE WHEN ? = 1 THEN 1 ELSE verified END WHERE id = ?')
              .run(paperType, verified, component.id);
          }

          // Only create/link a variant if variant_number is provided.
          let variant = null;
          if (variantNumber !== null) {
            variant = getVariant.get(component.id, variantNumber);
            if (!variant) {
              const vr = upsertVariant.run(component.id, variantNumber, verified);
              variant = { id: vr.lastInsertRowid };
            } else if (verified) {
              db.prepare('UPDATE variants SET verified = 1 WHERE id = ?').run(variant.id);
            }
            // Resources
            const resourceDefs = [
              ['question_paper', r.question_paper_url],
              ['mark_scheme', r.mark_scheme_url],
              ['examiner_report', r.examiner_report_url],
            ];
            for (const [type, url] of resourceDefs) {
              if (!url) continue;
              const existingRes = db.prepare('SELECT id FROM paper_resources WHERE variant_id = ? AND resource_type = ?').get(variant.id, type);
              if (existingRes) {
                db.prepare('UPDATE paper_resources SET url = ?, verified = ? WHERE id = ?').run(url, verified, existingRes.id);
              } else {
                upsertResource.run(variant.id, type, url, verified, r.provider || null);
              }
            }
          }
          imported++;
        } catch (err) {
          errors.push({ row: i + 1, error: err.message });
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    res.json({ imported, errors, total: records.length });
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// Users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, is_admin, created_at, last_login FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Qualifications
router.get('/qualifications', (req, res) => {
  try {
    const quals = db.prepare('SELECT * FROM qualifications ORDER BY name').all();
    res.json(quals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch qualifications' });
  }
});

module.exports = router;
