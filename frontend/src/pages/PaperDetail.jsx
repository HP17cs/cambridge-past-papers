import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useProgress } from '../contexts/ProgressContext';

export default function PaperDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isCompleted, isIgnored, togglePaper, toggleIgnore } = useProgress();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/papers/${id}`);
        if (active) setData(res.data);
      } catch (err) {
        console.error('Failed to load paper:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const handleToggle = async () => {
    try {
      await togglePaper(parseInt(id));
    } catch (err) {
      console.error('Failed to toggle:', err);
    }
  };

  const handleIgnore = async () => {
    try {
      await toggleIgnore(parseInt(id));
    } catch (err) {
      console.error('Failed to toggle ignore:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data || !data.variant) {
    return <div className="text-center py-20 text-slate-500">Paper not found</div>;
  }

  const v = data.variant;
  const completed = isCompleted(v.id);
  const ignored = isIgnored(v.id);
  const verified = reqVerification(v);
  const sessionLabel = v.session === 'mj' ? 'May/June' : 'October/November';
  const variantLabel = `${v.component_code}${v.variant != null ? v.variant : ''}`;
  const resources = data.resources || [];

  const resourceEntries = {
    question_paper: resources.find((r) => r.resource_type === 'question_paper'),
    mark_scheme: resources.find((r) => r.resource_type === 'mark_scheme'),
    examiner_report: resources.find((r) => r.resource_type === 'examiner_report'),
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 anim-fade-rise">
      <Link to="/papers" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">&larr; Back to Papers</Link>

      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{v.subject_name}</h1>
            <p className="text-slate-500 mt-1 dark:text-slate-400">{v.subject_code} &middot; {v.qualification_short_name || v.qualification_name}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500 w-20 dark:text-slate-400">Year</span>
            <span className="font-medium text-slate-900 dark:text-white">{v.year}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500 w-20 dark:text-slate-400">Session</span>
            <span className="font-medium text-slate-900 dark:text-white">{sessionLabel}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500 w-20 dark:text-slate-400">Paper</span>
            <span className="font-medium text-slate-900 dark:text-white">{variantLabel}</span>
          </div>
          {v.paper_label && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 w-20 dark:text-slate-400">Description</span>
              <span className="font-medium text-slate-900 dark:text-white">{v.paper_label}</span>
            </div>
          )}
          {v.paper_type && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 w-20 dark:text-slate-400">Type</span>
              <span className="font-medium text-slate-900 capitalize dark:text-white">{v.paper_type.replace(/_/g, ' ')}</span>
            </div>
          )}
          {v.series_code && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 w-20 dark:text-slate-400">File</span>
              <span className="font-medium text-slate-900 font-mono dark:text-white">
                {v.series_code}_qp_{v.variant != null ? v.variant : ''}.pdf
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500 w-20 dark:text-slate-400">Status</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              verified ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
            }`}>
              {verified ? 'verified' : 'unverified'}
            </span>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Documents</h2>
          {renderResource(resourceEntries.question_paper, 'Question Paper')}
          {renderResource(resourceEntries.mark_scheme, 'Mark Scheme')}
          {renderResource(resourceEntries.examiner_report, 'Examiner Report')}
        </div>

        <div className="mt-8 space-y-3">
          <button
            onClick={handleToggle}
            disabled={ignored}
            className={`w-full py-3 rounded-xl text-sm font-medium transition-all duration-250 ease-out active:scale-[0.99] ${
              ignored
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                : completed
                  ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30'
                  : 'bg-gradient-to-br from-primary-500 to-primary-700 text-white hover:opacity-95'
            }`}
          >
            {ignored
              ? 'Ignored — excluded from progress'
              : completed
                ? '☑ Completed — Click to Unmark'
                : '☐ Mark as Completed'}
          </button>
          <button
            onClick={handleIgnore}
            className={`w-full py-3 rounded-xl text-sm font-medium transition-all duration-250 ease-out active:scale-[0.99] ${
              ignored
                ? 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30 dark:hover:bg-orange-500/20'
                : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700'
            }`}
          >
            {ignored ? 'Restore this paper' : 'Ignore this paper (exclude from progress)'}
          </button>
        </div>
      </div>
    </div>
  );
}

function reqVerification(v) {
  if (v.variant_verified === 1 || v.component_verified === 1) return true;
  return false;
}

function renderResource(resource, label) {
  if (resource && resource.url) {
    return (
      <a
        key={label}
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-primary-300 hover:shadow-brand transition-all dark:border-slate-700 dark:hover:border-primary-700"
      >
        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center dark:bg-primary-500/15">
          <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-medium text-slate-900 dark:text-white">{label}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Open PDF</div>
        </div>
      </a>
    );
  }
  return (
    <div key={label} className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-medium text-slate-400">{label}</div>
        <div className="text-xs text-slate-400">{resource && resource.url ? '' : 'Not yet available'}</div>
      </div>
    </div>
  );
}
