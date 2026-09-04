import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useProgress } from '../contexts/ProgressContext';

export default function Ignored() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toggleIgnore } = useProgress();

  const loadIgnored = async () => {
    try {
      const { data } = await api.get('/papers/stats');
      setPapers(data.ignoredPapers || []);
    } catch (err) {
      console.error('Failed to load ignored papers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIgnored();
  }, []);

  const handleRestore = async (paperId) => {
    try {
      await toggleIgnore(paperId);
      setPapers(prev => prev.filter(p => p.variant_id !== paperId));
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

  return (
    <div className="space-y-6 anim-fade-rise">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ignored Papers</h1>
        <p className="text-slate-500 mt-1 dark:text-slate-400">
          {papers.length === 0
            ? 'Papers you have hidden from your progress will appear here.'
            : `${papers.length} ${papers.length === 1 ? 'paper is' : 'papers are'} hidden from your progress`}
        </p>
      </div>

      {papers.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center dark:bg-orange-500/10">
            <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mt-4 dark:text-white">No ignored papers</h2>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">When you hide a paper from your progress, you'll be able to manage it here.</p>
          <Link to="/papers" className="btn-primary mt-6">Browse Past Papers</Link>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {papers.map((paper) => (
            <div key={paper.variant_id} className="p-4 flex items-center justify-between group">
              <div className="min-w-0">
                <Link
                  to={`/papers/${paper.variant_id}`}
                  className="text-sm font-medium text-slate-900 hover:text-primary-700 transition-colors duration-300 ease-out dark:text-white dark:hover:text-primary-300"
                >
                  {paper.subject_name} — Paper {paper.paper_number}{paper.variant_number != null ? ` — Variant ${paper.variant_number}` : ''}
                </Link>
                <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                  {paper.year} &middot; {paper.session === 'mj' ? 'May/June' : paper.session === 'on' ? 'October/November' : paper.session}
                  <span className="inline-block mx-2 text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-orange-600 dark:text-orange-400">{paper.subject_code}</span>
                </div>
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
      )}
    </div>
  );
}
