import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useProgress } from '../contexts/ProgressContext';

export default function Progress() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toggleIgnore } = useProgress();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await api.get('/papers/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (paperId) => {
    try {
      await toggleIgnore(paperId);
      setStats(prev => ({
        ...prev,
        ignored: Math.max(0, (prev.ignored || 0) - 1),
        ignoredPapers: (prev.ignoredPapers || []).filter(p => p.variant_id !== paperId),
        remaining: Math.min(prev.total, (prev.remaining || 0) + 1),
      }));
    } catch (err) {
      console.error('Failed to restore paper:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 anim-fade-rise">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Progress</h1>
        <p className="text-slate-500 mt-1 dark:text-slate-400">Your Cambridge past paper completion</p>
      </div>

      <div className="card p-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-slate-900 dark:text-white">{stats.completed} / {stats.total}</div>
          <div className="text-slate-500 mt-1 dark:text-slate-400">papers completed</div>
          <div className="mt-4 max-w-md mx-auto">
            <div className="w-full bg-slate-200 rounded-full h-4 dark:bg-slate-700">
              <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-full h-4 transition-all duration-500" style={{ width: `${stats.percentage}%` }} />
            </div>
            <div className="text-sm font-medium text-slate-700 mt-2 dark:text-slate-200">{stats.percentage}% complete</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">Total Papers</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 dark:text-white">{stats.total.toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">Completed</div>
          <div className="text-2xl font-bold text-green-600 mt-1 dark:text-green-400">{stats.completed.toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">Remaining</div>
          <div className="text-2xl font-bold text-primary-600 mt-1 dark:text-primary-400">{stats.remaining.toLocaleString()}</div>
        </div>
        <Link to="/ignored" className={`card card-hover p-4 ${stats.ignored > 0 ? 'border-orange-200 dark:border-orange-500/30' : ''}`}>
          <div className="text-sm text-slate-500 dark:text-slate-400">Ignored</div>
          <div className={`text-2xl font-bold mt-1 ${stats.ignored > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`}>{stats.ignored.toLocaleString()}</div>
          {stats.ignored > 0 && (
            <div className="text-xs text-primary-600 mt-1 dark:text-primary-400">View ignored papers →</div>
          )}
        </Link>
      </div>

      {stats.bySubject && stats.bySubject.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 dark:text-white">Progress by Subject</h2>
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {stats.bySubject.map((subject, i) => {
              const effectiveTotal = subject.total - (subject.ignored_count || 0);
              const pct = effectiveTotal > 0 ? Math.round((subject.completed_count / effectiveTotal) * 100) : 0;
              return (
                <div key={i} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{subject.name}</span>
                      <span className="text-xs text-slate-500 ml-2 dark:text-slate-400">{subject.code} &middot; {subject.qualification}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{subject.completed_count}/{effectiveTotal}{subject.ignored_count > 0 ? ` (${subject.ignored_count} ignored)` : ''}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 dark:bg-slate-700">
                    <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-full h-2 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1 dark:text-slate-400">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.recent && stats.recent.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 dark:text-white">Recently Completed</h2>
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {stats.recent.map((paper, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{paper.subject_name} — Paper {paper.paper_number}{paper.variant_number != null ? ` — Variant ${paper.variant_number}` : ''}</span>
                  <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{paper.year} &middot; {paper.session === 'mj' ? 'May/June' : paper.session === 'on' ? 'October/November' : paper.session}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full dark:text-green-400 dark:bg-green-500/10">Completed</span>
                  {paper.completed_at && (
                    <div className="text-xs text-slate-400 mt-1 dark:text-slate-500">{new Date(paper.completed_at).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.ignoredPapers && stats.ignoredPapers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ignored Papers</h2>
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full dark:text-orange-400 dark:bg-orange-500/15">{stats.ignoredPapers.length} hidden from progress</span>
          </div>
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {stats.ignoredPapers.map((paper) => (
              <div key={paper.variant_id} className="p-4 flex items-center justify-between group">
                <div className="min-w-0">
                  <Link
                    to={`/papers/${paper.variant_id}`}
                    className="text-sm font-medium text-slate-900 hover:text-primary-700 transition-colors duration-300 ease-out dark:text-white dark:hover:text-primary-300"
                  >
                    {paper.subject_name} — Paper {paper.paper_number}{paper.variant_number != null ? ` — Variant ${paper.variant_number}` : ''}
                  </Link>
                  <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{paper.year} &middot; {paper.session === 'mj' ? 'May/June' : paper.session === 'on' ? 'October/November' : paper.session}</div>
                </div>
                <button
                  onClick={() => handleRestore(paper.variant_id)}
                  className="btn-ghost text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex-shrink-0"
                  title="Restore this paper to your progress"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
