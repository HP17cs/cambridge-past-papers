const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const progress = db.prepare(`
      SELECT up.variant_id, up.completed, up.completed_at
      FROM user_progress up
      WHERE up.user_id = ?
    `).all(req.user.id);
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.post('/toggle', authenticateToken, (req, res) => {
  try {
    const { paperId } = req.body;
    if (!paperId) return res.status(400).json({ error: 'Paper ID required' });

    const variant = db.prepare('SELECT id FROM variants WHERE id = ?').get(paperId);
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    const existing = db.prepare('SELECT * FROM user_progress WHERE user_id = ? AND variant_id = ?').get(req.user.id, paperId);

    if (existing) {
      if (existing.completed) {
        db.prepare('UPDATE user_progress SET completed = 0, completed_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
        res.json({ completed: false });
      } else {
        db.prepare('UPDATE user_progress SET completed = 1, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
        res.json({ completed: true, completedAt: new Date().toISOString() });
      }
    } else {
      db.prepare('INSERT INTO user_progress (user_id, variant_id, completed, completed_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)').run(req.user.id, paperId);
      res.json({ completed: true, completedAt: new Date().toISOString() });
    }
  } catch (err) {
    console.error('Toggle progress error:', err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

router.post('/bulk-toggle', authenticateToken, (req, res) => {
  try {
    const { paperIds, completed } = req.body;
    if (!Array.isArray(paperIds) || paperIds.length === 0) {
      return res.status(400).json({ error: 'Paper IDs array required' });
    }

    const toggle = db.transaction(() => {
      for (const variantId of paperIds) {
        const existing = db.prepare('SELECT id FROM user_progress WHERE user_id = ? AND variant_id = ?').get(req.user.id, variantId);
        if (existing) {
          db.prepare('UPDATE user_progress SET completed = ?, completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(completed ? 1 : 0, completed ? 1 : 0, existing.id);
        } else {
          db.prepare('INSERT INTO user_progress (user_id, variant_id, completed, completed_at) VALUES (?, ?, ?, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END)')
            .run(req.user.id, variantId, completed ? 1 : 0, completed ? 1 : 0);
        }
      }
    });
    toggle();
    res.json({ message: 'Progress updated', count: paperIds.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk update progress' });
  }
});

router.get('/subject/:subjectId', authenticateToken, (req, res) => {
  try {
    const subjectId = req.params.subjectId;
    const subject = db.prepare('SELECT s.*, q.name as qualification_name, q.short_name as qualification_short_name FROM subjects s JOIN qualifications q ON s.qualification_id = q.id WHERE s.id = ?').get(subjectId);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const variants = db.prepare(`
      SELECT v.id, v.variant_number, c.component_code, c.paper_number, es.year, es.session,
        es.series_code, c.paper_type, c.verified,
        up.completed, up.completed_at
      FROM variants v
      JOIN components c ON c.id = v.component_id
      JOIN exam_sessions es ON es.id = c.exam_session_id
      LEFT JOIN user_progress up ON v.id = up.variant_id AND up.user_id = ?
      WHERE es.subject_id = ?
      ORDER BY es.year DESC, es.session, c.paper_number, v.variant_number
    `).all(req.user.id, subjectId);

    const total = variants.length;
    const completedCount = variants.filter((v) => v.completed).length;

    const grouped = {};
    for (const v of variants) {
      if (!grouped[v.year]) grouped[v.year] = {};
      if (!grouped[v.year][v.session]) grouped[v.year][v.session] = [];
      grouped[v.year][v.session].push(v);
    }

    res.json({
      subject,
      papers: variants,
      total,
      completed: completedCount,
      remaining: total - completedCount,
      percentage: total > 0 ? Math.round((completedCount / total) * 100) : 0,
      grouped,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subject progress' });
  }
});

module.exports = router;
