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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}</h1>
        <p className="text-slate-500 mt-1">Track your Cambridge past paper progress</p>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-sm text-slate-500">Total Papers</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-sm text-slate-500">Completed</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats.completed.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-sm text-slate-500">Remaining</div>
            <div className="text-2xl font-bold text-primary-600 mt-1">{stats.remaining.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-sm text-slate-500">Progress</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.percentage}%</div>
          </div>
        </div>
      )}

      {stats && stats.total > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Overall Progress</h2>
          <ProgressBar completed={stats.completed} total={stats.total} size="lg" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Subjects</h2>
        <Link to="/subjects" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {recentSubjects.map(subject => (
          <Link
            key={subject.id}
            to={`/subjects/${subject.id}`}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-primary-200 transition-all"
          >
            <h3 className="text-sm font-semibold text-slate-900">{subject.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{subject.code} &middot; {subject.qualification}</p>
          </Link>
        ))}
      </div>

      {stats && stats.bySubject && stats.bySubject.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Progress by Subject</h2>
            <Link to="/progress" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all</Link>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {stats.bySubject.filter(s => s.completed_count > 0).slice(0, 5).map((subject, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-900">{subject.name} — {subject.code}</span>
                  <span className="text-xs text-slate-500">{subject.completed_count}/{subject.total}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div
                    className="bg-primary-600 rounded-full h-1.5 transition-all duration-500"
                    style={{ width: `${subject.total > 0 ? Math.round((subject.completed_count / subject.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && stats.recent && stats.recent.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recently Completed</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {stats.recent.map((paper, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-slate-900">{paper.subject_name} — Paper {paper.paper_number}{paper.variant_number != null ? paper.variant_number : ''}</span>
                  <div className="text-xs text-slate-500 mt-0.5">{paper.year} &middot; {paper.session === 'mj' ? 'May/June' : paper.session === 'on' ? 'October/November' : paper.session}</div>
                </div>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Completed</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
