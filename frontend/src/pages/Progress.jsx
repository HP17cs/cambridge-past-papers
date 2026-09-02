import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Progress() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Progress</h1>
        <p className="text-slate-500 mt-1">Your Cambridge past paper completion</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-slate-900">{stats.completed} / {stats.total}</div>
          <div className="text-slate-500 mt-1">papers completed</div>
          <div className="mt-4 max-w-md mx-auto">
            <div className="w-full bg-slate-200 rounded-full h-4">
              <div className="bg-primary-600 rounded-full h-4 transition-all duration-500" style={{ width: `${stats.percentage}%` }} />
            </div>
            <div className="text-sm font-medium text-slate-700 mt-2">{stats.percentage}% complete</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Total Papers</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Completed</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.completed.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Remaining</div>
          <div className="text-2xl font-bold text-primary-600 mt-1">{stats.remaining.toLocaleString()}</div>
        </div>
      </div>

      {stats.bySubject && stats.bySubject.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Progress by Subject</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {stats.bySubject.map((subject, i) => {
              const pct = subject.total > 0 ? Math.round((subject.completed_count / subject.total) * 100) : 0;
              return (
                <div key={i} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-slate-900">{subject.name}</span>
                      <span className="text-xs text-slate-500 ml-2">{subject.code} &middot; {subject.qualification}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-700">{subject.completed_count}/{subject.total}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-primary-600 rounded-full h-2 transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.recent && stats.recent.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recently Completed</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {stats.recent.map((paper, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-slate-900">{paper.subject_name} — Paper {paper.paper_number}{paper.variant_number != null ? paper.variant_number : ''}</span>
                  <div className="text-xs text-slate-500 mt-0.5">{paper.year} &middot; {paper.session === 'mj' ? 'May/June' : paper.session === 'on' ? 'October/November' : paper.session}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Completed</span>
                  {paper.completed_at && (
                    <div className="text-xs text-slate-400 mt-1">{new Date(paper.completed_at).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
