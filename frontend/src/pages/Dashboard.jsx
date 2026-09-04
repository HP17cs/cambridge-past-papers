import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import SearchBar from '../components/SearchBar';
import ProgressBar from '../components/ProgressBar';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentSubjects, setRecentSubjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, filtersRes] = await Promise.all([
        api.get('/papers/stats'),
        api.get('/papers/filters'),
      ]);
      setStats(statsRes.data);
      setRecentSubjects(filtersRes.data.subjects.slice(0, 8));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
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

  return (
    <div className="space-y-6 anim-fade-rise">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome, {user?.name}</h1>
        <p className="text-slate-500 mt-1 dark:text-slate-400">Track your Cambridge past paper progress</p>
      </div>

      <div className="max-w-xl">
        <Link to="/papers">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search papers (e.g. 5054 2026 Paper 2)..."
          />
        </Link>
      </div>

      {stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <div className="text-sm text-slate-500 dark:text-slate-400">Total Papers</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 dark:text-white">{stats.total.toLocaleString()}</div>
            </div>
            <div className="card p-5">
              <div className="text-sm text-slate-500 dark:text-slate-400">Completed</div>
              <div className="text-2xl font-bold text-green-600 mt-1 dark:text-green-400">{stats.completed.toLocaleString()}</div>
            </div>
            <div className="card p-5">
              <div className="text-sm text-slate-500 dark:text-slate-400">Remaining</div>
              <div className="text-2xl font-bold text-primary-600 mt-1 dark:text-primary-400">{stats.remaining.toLocaleString()}</div>
            </div>
            <div className="card p-5">
              <div className="text-sm text-slate-500 dark:text-slate-400">Progress</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 dark:text-white">{stats.percentage}%</div>
            </div>
          </div>

          {stats.ignored > 0 && (
            <Link to="/ignored" className="group flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700 hover:bg-orange-100 transition-colors duration-300 ease-out dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-300 dark:hover:bg-orange-500/20">
              <span>{stats.ignored.toLocaleString()} {stats.ignored === 1 ? 'paper is' : 'papers are'} ignored and excluded from progress.</span>
              <span className="text-orange-600 group-hover:translate-x-0.5 transition-transform duration-300 ease-out dark:text-orange-400 font-medium">View →</span>
            </Link>
          )}
        </div>
      )}

      {stats && stats.total > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 dark:text-slate-200">Overall Progress</h2>
          <ProgressBar completed={stats.completed} total={stats.total} size="lg" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Subjects</h2>
        <Link to="/subjects" className="text-sm text-primary-600 hover:text-primary-700 font-medium dark:text-primary-400 dark:hover:text-primary-300">View all</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {recentSubjects.map(subject => (
          <Link
            key={subject.id}
            to={`/subjects/${subject.id}`}
            className="card card-hover p-4 group"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-primary-700 transition-colors duration-400 ease-out dark:text-white dark:group-hover:text-primary-300">{subject.name}</h3>
              <svg className="w-4 h-4 text-slate-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary-500 transition-all duration-400 ease-out" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">{subject.code} &middot; {subject.qualification}</p>
          </Link>
        ))}
      </div>

      {stats && stats.bySubject && stats.bySubject.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Progress by Subject</h2>
            <Link to="/progress" className="text-sm text-primary-600 hover:text-primary-700 font-medium dark:text-primary-400 dark:hover:text-primary-300">View all</Link>
          </div>
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {stats.bySubject.filter(s => s.completed_count > 0).slice(0, 5).map((subject, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{subject.name} — {subject.code}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{subject.completed_count}/{(subject.total - (subject.ignored_count || 0))}{subject.ignored_count > 0 ? ` (${subject.ignored_count} ignored)` : ''}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 dark:bg-slate-700">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-full h-1.5 transition-all duration-500"
                    style={{ width: `${subject.total - (subject.ignored_count || 0) > 0 ? Math.round((subject.completed_count / (subject.total - (subject.ignored_count || 0))) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && stats.recent && stats.recent.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 dark:text-white">Recently Completed</h2>
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {stats.recent.map((paper, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{paper.subject_name} — Paper {paper.paper_number}{paper.variant_number != null ? ` — Variant ${paper.variant_number}` : ''}</span>
                  <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{paper.year} &middot; {paper.session === 'mj' ? 'May/June' : paper.session === 'on' ? 'October/November' : paper.session}</div>
                </div>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full dark:text-green-400 dark:bg-green-500/10">Completed</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
