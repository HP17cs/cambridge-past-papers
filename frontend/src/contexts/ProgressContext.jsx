import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from './AuthContext';

const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const { user } = useAuth();
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(false);

  const loadProgress = useCallback(async () => {
    if (!user) {
      setProgressMap({});
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.get('/progress');
      const map = {};
      for (const p of data) {
        if (p.completed) {
          map[p.variant_id] = { completed: true, completedAt: p.completed_at };
        }
      }
      setProgressMap(map);
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Re-sync when the user logs in/out
  useEffect(() => {
    if (!user) setProgressMap({});
  }, [user]);

  const isCompleted = useCallback((paperId) => {
    return !!(progressMap[paperId] && progressMap[paperId].completed);
  }, [progressMap]);

  const getCompletionAt = useCallback((paperId) => {
    const entry = progressMap[paperId];
    return entry ? entry.completedAt : null;
  }, [progressMap]);

  const togglePaper = useCallback(async (paperId) => {
    if (!user) return { completed: false };
    const wasCompleted = !!progressMap[paperId]?.completed;
    const optimistically = !wasCompleted;

    // Optimistic update
    setProgressMap(prev => {
      const next = { ...prev };
      if (optimistically) {
        next[paperId] = { completed: true, completedAt: new Date().toISOString() };
      } else {
        delete next[paperId];
      }
      return next;
    });

    try {
      const { data } = await api.post('/progress/toggle', { paperId });
      // Ensure server truth wins
      setProgressMap(prev => {
        const next = { ...prev };
        if (data.completed) {
          next[paperId] = { completed: true, completedAt: data.completedAt || new Date().toISOString() };
        } else {
          delete next[paperId];
        }
        return next;
      });
      return data;
    } catch (err) {
      // Rollback on failure
      setProgressMap(prev => {
        const next = { ...prev };
        if (wasCompleted) {
          next[paperId] = { completed: true, completedAt: progressMap[paperId]?.completedAt || null };
        } else {
          delete next[paperId];
        }
        return next;
      });
      throw err;
    }
  }, [user, progressMap]);

  // Count completions for a set of paper IDs (used for group progress)
  const countCompleted = useCallback((paperIds) => {
    if (!paperIds || paperIds.length === 0) return 0;
    return paperIds.filter(id => progressMap[id]?.completed).length;
  }, [progressMap]);

  return (
    <ProgressContext.Provider value={{ progressMap, loading, isCompleted, getCompletionAt, togglePaper, countCompleted, refresh: loadProgress }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress must be used within ProgressProvider');
  return context;
}
