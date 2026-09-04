import { useProgress } from '../contexts/ProgressContext';

export default function PaperCard({ paper, showSubject = false }) {
  const { isCompleted, getCompletionAt, togglePaper, isIgnored, toggleIgnore } = useProgress();
  const completed = isCompleted(paper.id);
  const completedAt = getCompletionAt(paper.id);
  const ignored = isIgnored(paper.id);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await togglePaper(paper.id);
    } catch (err) {
      console.error('Failed to toggle paper:', err);
    }
  };

  const handleIgnore = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleIgnore(paper.id);
    } catch (err) {
      console.error('Failed to toggle ignore:', err);
    }
  };

  const paperTypeLabel = paper.paper_type === 'alternative_to_practical'
    ? 'Alternative to Practical'
    : paper.paper_type === 'practical'
      ? 'Practical'
      : null;

  const paperNumber = paper.paper_number != null ? paper.paper_number : (paper.component_code ? paper.component_code.split('/').pop() : null);
  const variantNum = paper.variant != null ? paper.variant : (paper.variant_number != null ? paper.variant_number : null);
  const variantName = `Paper ${paperNumber != null ? paperNumber : '?'}${variantNum != null ? ` — Variant ${variantNum}` : ''}`;
  const seriesLabel = paper.series_code && variantNum != null ? `${paper.series_code}_qp_${variantNum}.pdf` : `qp_${variantNum != null ? variantNum : paperNumber}`;
  const sessionLabel = paper.session === 'mj' ? 'May/June' : paper.session === 'on' ? 'October/November' : paper.session;
  const verified = paper.component_verified === 1 || paper.component_verified === true;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
      ignored
        ? 'bg-orange-50/40 border-orange-200/60 opacity-70 dark:bg-orange-500/5 dark:border-orange-500/20'
        : completed
          ? 'bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/30'
          : 'card border-slate-200 hover:border-primary-200 hover:shadow-sm dark:hover:border-primary-700'
    }`}>
      <button
        onClick={handleToggle}
        aria-pressed={completed}
        className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-250 ease-out active:scale-90 ${
          completed
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-slate-300 hover:border-primary-400 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`}
        title={completed ? 'Mark as not completed' : 'Mark as completed'}
      >
        {completed && (
          <svg className="w-4 h-4 anim-pop-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-900 dark:text-white">{variantName}</span>
          {verified && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full dark:bg-emerald-500/15 dark:text-emerald-400" title="Component data verified against Cambridge sources">Verified</span>
          )}
          {!verified && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full dark:bg-slate-700 dark:text-slate-400" title="Component/variant data not yet verified">Unverified</span>
          )}
          {completed && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full dark:bg-green-500/15 dark:text-green-400">Completed</span>
          )}
          {ignored && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full dark:bg-orange-500/15 dark:text-orange-300">Ignored</span>
          )}
          {paperTypeLabel && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              paper.paper_type === 'alternative_to_practical'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
            }`}>
              {paperTypeLabel}
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 mt-1 dark:text-slate-400">
          {showSubject && paper.subject_name ? `${paper.subject_name} · ` : ''}
          {paper.year} &middot; {sessionLabel}
          {paper.paper_label && <span className="text-slate-600 font-medium ml-1 dark:text-slate-300">· {paper.paper_label}</span>}
          {seriesLabel && <span className="text-slate-400 ml-1 font-mono dark:text-slate-500">({seriesLabel})</span>}
          {completedAt && <span className="text-green-600 ml-2 dark:text-green-400">Completed {new Date(completedAt).toLocaleDateString()}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleIgnore}
          aria-pressed={ignored}
          title={ignored ? 'Restore this paper' : 'Ignore this paper'}
          className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-250 ease-out active:scale-90 ${
            ignored
              ? 'bg-orange-100 border-orange-300 text-orange-600 dark:bg-orange-500/15 dark:border-orange-500/40 dark:text-orange-300'
              : 'border-slate-200 bg-white hover:border-orange-300 text-slate-400 hover:text-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-orange-500/50 dark:hover:text-orange-400'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {ignored ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            )}
          </svg>
        </button>
        {paper.question_paper_url && (
          <a
            href={paper.question_paper_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors font-medium dark:bg-primary-500/15 dark:text-primary-300 dark:hover:bg-primary-500/25"
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
            className="text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
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
            className="text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            Examiner Report
          </a>
        )}
      </div>
    </div>
  );
}
