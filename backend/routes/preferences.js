const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const MAX_SUBJECTS = 500;

// Full snapshot of a user's onboarding / subject preferences. Always scoped to
// the authenticated user (req.user.id) — client-supplied user ids are never
// trusted because req.user.id is resolved from the JWT server-side.
function buildPreferences(userId) {
  const user = db.prepare('SELECT onboarding_completed, show_only_selected_subjects, preferences_updated_at FROM users WHERE id = ?').get(userId);
  const rows = db.prepare('SELECT subject_id FROM user_subjects WHERE user_id = ? ORDER BY subject_id').all(userId);
  const subjectIds = rows.map((r) => r.subject_id);
  const subjects = subjectIds.length
    ? db.prepare(`
        SELECT s.id, s.name, s.code, s.description,
          q.name AS qualification_name, q.short_name AS qualification_short_name
        FROM subjects s
        JOIN qualifications q ON s.qualification_id = q.id
        WHERE s.id IN (${subjectIds.map(() => '?').join(',')})
        ORDER BY s.code
      `).all(...subjectIds)
    : [];
  return {
    onboarding_completed: user ? !!user.onboarding_completed : false,
    show_only_selected_subjects: user ? !!user.show_only_selected_subjects : false,
    preferences_updated_at: user ? user.preferences_updated_at : null,
    subject_ids: subjectIds,
    subjects,
  };
}

router.get('/', authenticateToken, (req, res) => {
  try {
    res.json(buildPreferences(req.user.id));
  } catch (err) {
    console.error('Failed to fetch preferences:', err);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

router.put('/', authenticateToken, (req, res) => {
  try {
    const { subject_ids, show_only_selected_subjects, onboarding_completed } = req.body;

    let validIds = [];
    let replaceSelection = false;
    if (subject_ids !== undefined) {
      replaceSelection = true;
      if (!Array.isArray(subject_ids)) {
        return res.status(400).json({ error: 'subject_ids must be an array' });
      }
      if (subject_ids.length > MAX_SUBJECTS) {
        return res.status(400).json({ error: `At most ${MAX_SUBJECTS} subjects can be selected` });
      }
      const ids = [...new Set(subject_ids.map((n) => parseInt(n, 10)).filter((n) => Number.isInteger(n) && n > 0))];
      if (ids.length) {
        const known = db.prepare(`SELECT id FROM subjects WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);
        validIds = known.map((r) => r.id);
      }
      if (ids.length !== validIds.length) {
        return res.status(400).json({ error: 'One or more subject ids are invalid' });
      }
    }

    const showSelected = show_only_selected_subjects !== undefined ? !!show_only_selected_subjects : undefined;
    const onbCompleted = onboarding_completed !== undefined ? !!onboarding_completed : undefined;

    db.exec('BEGIN');
    try {
      if (replaceSelection) {
        db.prepare('DELETE FROM user_subjects WHERE user_id = ?').run(req.user.id);
        const insert = db.prepare('INSERT OR IGNORE INTO user_subjects (user_id, subject_id) VALUES (?, ?)');
        for (const id of validIds) insert.run(req.user.id, id);
      }
      if (showSelected !== undefined || onbCompleted !== undefined) {
        const current = db.prepare('SELECT onboarding_completed, show_only_selected_subjects FROM users WHERE id = ?').get(req.user.id);
        const nextOnb = onbCompleted !== undefined ? onbCompleted : !!(current && current.onboarding_completed);
        const nextShow = showSelected !== undefined ? showSelected : !!(current && current.show_only_selected_subjects);
        db.prepare('UPDATE users SET onboarding_completed = ?, show_only_selected_subjects = ?, preferences_updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(nextOnb ? 1 : 0, nextShow ? 1 : 0, req.user.id);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    res.json(buildPreferences(req.user.id));
  } catch (err) {
    console.error('Failed to save preferences:', err);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

module.exports = router;