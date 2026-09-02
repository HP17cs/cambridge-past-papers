import { useProgress } from '../contexts/ProgressContext';

export default function PaperCard({ paper, showSubject = false }) {
  const { isCompleted, getCompletionAt, togglePaper } = useProgress();
  const completed = isCompleted(paper.id);
  const completedAt = getCompletionAt(paper.id);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await togglePaper(paper.id);
    } catch (err) {
      console.error('Failed to toggle paper:', err);
    }
  };

  const paperTypeLabel = paper.paper_type === 'alternative_to_practical'
    ? 'Alternative to Practical'
    : paper.paper_type === 'practical'
      ? 'Practical'
      : null;

  const variantName = paper.component_code || `Paper ${paper.variant}`;
  const seriesLabel = paper.series_code && paper.variant != null ? `${paper.series_code}_qp_${paper.variant}.pdf` : `qp_${paper.variant}`;
  const sessionLabel = paper.session === 'mj' ? 'May/June' : paper.session === 'on' ? 'October/November' : paper.session;
  const verified = paper.component_verified === 1 || paper.component_verified === true;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
      completed
        ? 'bg-green-50 border-green-200'
        : 'bg-white border-slate-200 hover:border-primary-200 hover:shadow-sm'
    }`}>
      <button
        onClick={handleToggle}
        aria-pressed={completed}
        className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
          completed
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-slate-300 hover:border-primary-400'
        }`}
        title={completed ? 'Mark as not completed' : 'Mark as completed'}
      >
        {completed && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-900">{variantName}</span>
          {verified && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full" title="Component data verified against Cambridge sources">Verified</span>
          )}
          {!verified && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full" title="Component/variant data not yet verified">Unverified</span>
          )}
          {completed && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Completed</span>
          )}
          {paperTypeLabel && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              paper.paper_type === 'alternative_to_practical'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {paperTypeLabel}
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {showSubject && paper.subject_name ? `${paper.subject_name} · ` : ''}
          {paper.year} &middot; {sessionLabel}
          {seriesLabel && <span className="text-slate-400 ml-1 font-mono">({seriesLabel})</span>}
          {completedAt && <span className="text-green-600 ml-2">Completed {new Date(completedAt).toLocaleDateString()}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {paper.question_paper_url && (
          <a
            href={paper.question_paper_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors font-medium"
          >
            Question Paper
          </a>
        )}
        {paper.mark_scheme_url && (
          <a
            href={paper.mark_scheme_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium"
          >
            Mark Scheme
          </a>
        )}
        {paper.examiner_report_url && (
          <a
            href={paper.examiner_report_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium"
          >
            Examiner Report
          </a>
        )}
      </div>
    </div>
  );
}
