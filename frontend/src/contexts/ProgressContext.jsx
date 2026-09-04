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
        map[p.variant_id] = {
          completed: !!p.completed,
          ignored: !!p.ignored,
          completedAt: p.completed_at || null,
        };
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

  useEffect(() => {
    if (!user) setProgressMap({});
  }, [user]);

  const isCompleted = useCallback((paperId) => {
    return !!(progressMap[paperId] && progressMap[paperId].completed);
  }, [progressMap]);

  const isIgnored = useCallback((paperId) => {
    return !!(progressMap[paperId] && progressMap[paperId].ignored);
  }, [progressMap]);

  const getCompletionAt = useCallback((paperId) => {
    const entry = progressMap[paperId];
    return entry ? entry.completedAt : null;
  }, [progressMap]);

  const togglePaper = useCallback(async (paperId) => {
    if (!user) return { completed: false };
    const wasCompleted = !!progressMap[paperId]?.completed;
    const optimistically = !wasCompleted;

    setProgressMap(prev => {
      const next = { ...prev };
      if (optimistically) {
        next[paperId] = { completed: true, ignored: false, completedAt: new Date().toISOString() };
      } else {
        delete next[paperId];
      }
      return next;
    });

    try {
      const { data } = await api.post('/progress/toggle', { paperId });
      setProgressMap(prev => {
        const next = { ...prev };
        if (data.completed) {
          next[paperId] = { completed: true, ignored: false, completedAt: data.completedAt || new Date().toISOString() };
        } else {
          delete next[paperId];
        }
        return next;
      });
      return data;
    } catch (err) {
      setProgressMap(prev => {
        const next = { ...prev };
        if (wasCompleted) {
          next[paperId] = { completed: true, ignored: false, completedAt: progressMap[paperId]?.completedAt || null };
        } else {
          delete next[paperId];
        }
        return next;
      });
      throw err;
    }
  }, [user, progressMap]);

  const toggleIgnore = useCallback(async (paperId) => {
    if (!user) return { ignored: false };
    const wasIgnored = !!progressMap[paperId]?.ignored;
    const optimistically = !wasIgnored;

    setProgressMap(prev => {
      const next = { ...prev };
      if (optimistically) {
        next[paperId] = { completed: false, ignored: true, completedAt: null };
      } else {
        delete next[paperId];
      }
      return next;
    });

    try {
      const { data } = await api.post('/progress/ignore', { paperId });
      setProgressMap(prev => {
        const next = { ...prev };
        if (data.ignored) {
          next[paperId] = { completed: false, ignored: true, completedAt: null };
        } else if (data.completed) {
          next[paperId] = { completed: true, ignored: false, completedAt: progressMap[paperId]?.completedAt || null };
        } else {
          delete next[paperId];
        }
        return next;
      });
      return data;
    } catch (err) {
      setProgressMap(prev => {
        const next = { ...prev };
        if (wasIgnored) {
          next[paperId] = { completed: false, ignored: true, completedAt: null };
        } else {
          delete next[paperId];
        }
        return next;
      });
      throw err;
    }
  }, [user, progressMap]);

  const countCompleted = useCallback((paperIds) => {
    if (!paperIds || paperIds.length === 0) return 0;
    return paperIds.filter(id => progressMap[id]?.completed).length;
  }, [progressMap]);

  const countIgnored = useCallback((paperIds) => {
    if (!paperIds || paperIds.length === 0) return 0;
    return paperIds.filter(id => progressMap[id]?.ignored).length;
  }, [progressMap]);

  return (
    <ProgressContext.Provider value={{
      progressMap,
      loading,
      isCompleted,
      isIgnored,
      getCompletionAt,
      togglePaper,
      toggleIgnore,
      countCompleted,
      countIgnored,
      refresh: loadProgress,
    }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress must be used within ProgressProvider');
  return context;
}
