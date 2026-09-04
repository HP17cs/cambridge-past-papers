import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../lib/api';
import { useAuth } from './AuthContext';
import type { ToggleResponse } from '../lib/types';

interface ProgressEntry {
  completed: boolean;
  ignored: boolean;
  completedAt: string | null;
}

interface ProgressContextValue {
  progressMap: Record<number, ProgressEntry>;
  loading: boolean;
  isCompleted: (paperId: number) => boolean;
  isIgnored: (paperId: number) => boolean;
  getCompletionAt: (paperId: number) => string | null;
  togglePaper: (paperId: number) => Promise<ToggleResponse>;
  toggleIgnore: (paperId: number) => Promise<ToggleResponse>;
  countCompleted: (paperIds: number[]) => number;
  countIgnored: (paperIds: number[]) => number;
  refresh: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [progressMap, setProgressMap] = useState<Record<number, ProgressEntry>>({});
  const [loading, setLoading] = useState(false);

  const loadProgress = useCallback(async () => {
    if (!user) {
      setProgressMap({});
      return;
    }
    try {
      setLoading(true);
      const data = await api.getProgress();
      const map: Record<number, ProgressEntry> = {};
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

  const isCompleted = useCallback(
    (paperId: number) => !!progressMap[paperId]?.completed,
    [progressMap]
  );

  const isIgnored = useCallback(
    (paperId: number) => !!progressMap[paperId]?.ignored,
    [progressMap]
  );

  const getCompletionAt = useCallback(
    (paperId: number) => progressMap[paperId]?.completedAt ?? null,
    [progressMap]
  );

  const togglePaper = useCallback(
    async (paperId: number) => {
      if (!user) return { completed: false };
      const wasCompleted = !!progressMap[paperId]?.completed;
      const optimistic = !wasCompleted;

      setProgressMap((prev) => {
        const next = { ...prev };
        if (optimistic) {
          next[paperId] = { completed: true, ignored: false, completedAt: new Date().toISOString() };
        } else {
          delete next[paperId];
        }
        return next;
      });

      try {
        const data = await api.toggleProgress(paperId);
        setProgressMap((prev) => {
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
        setProgressMap((prev) => {
          const next = { ...prev };
          if (wasCompleted) {
            next[paperId] = { completed: true, ignored: false, completedAt: progressMap[paperId]?.completedAt ?? null };
          } else {
            delete next[paperId];
          }
          return next;
        });
        throw err;
      }
    },
    [user, progressMap]
  );

  const toggleIgnore = useCallback(
    async (paperId: number) => {
      if (!user) return { ignored: false };
      const wasIgnored = !!progressMap[paperId]?.ignored;
      const optimistic = !wasIgnored;

      setProgressMap((prev) => {
        const next = { ...prev };
        if (optimistic) {
          next[paperId] = { completed: false, ignored: true, completedAt: null };
        } else {
          delete next[paperId];
        }
        return next;
      });

      try {
        const data = await api.toggleIgnore(paperId);
        setProgressMap((prev) => {
          const next = { ...prev };
          if (data.ignored) {
            next[paperId] = { completed: false, ignored: true, completedAt: null };
          } else if (data.completed) {
            next[paperId] = { completed: true, ignored: false, completedAt: progressMap[paperId]?.completedAt ?? null };
          } else {
            delete next[paperId];
          }
          return next;
        });
        return data;
      } catch (err) {
        setProgressMap((prev) => {
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
    },
    [user, progressMap]
  );

  const countCompleted = useCallback(
    (paperIds: number[]) => (paperIds || []).filter((id) => progressMap[id]?.completed).length,
    [progressMap]
  );

  const countIgnored = useCallback(
    (paperIds: number[]) => (paperIds || []).filter((id) => progressMap[id]?.ignored).length,
    [progressMap]
  );

  return (
    <ProgressContext.Provider
      value={{
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
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress must be used within ProgressProvider');
  return context;
}
