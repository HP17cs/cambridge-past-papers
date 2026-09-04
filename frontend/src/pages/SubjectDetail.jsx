import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useProgress } from '../contexts/ProgressContext';

const PAPER_TYPE_LABELS = {
  'theory': 'Theory',
  'practical': 'Practical',
  'alternative_to_practical': 'Alternative to Practical',
  'coursework': 'Coursework',
  'oral': 'Oral',
  'listening': 'Listening',
  'speaking': 'Speaking',
  'other': 'Other',
};

const SESSION_LABELS = { mj: 'May/June', on: 'October/November' };
const sessionLabel = (s) => SESSION_LABELS[s] || s;

function PaperGroup({ year, session, paperNumber, paper, defaultOpen }) {
  const { countCompleted, countIgnored } = useProgress();
  const [open, setOpen] = useState(defaultOpen);

  const variants = paper.variants || [];
  const variantIds = variants.map((v) => v.id);
  const done = countCompleted(variantIds);
  const ignored = countIgnored(variantIds);
  const effectiveTotal = variants.length - ignored;
  const label = PAPER_TYPE_LABELS[paper.paper_type] || null;
  const isATP = paper.paper_type === 'alternative_to_practical';

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left dark:hover:bg-slate-800/60"
      >
        <div className="flex items-center gap-3">
          <span className={`flex-shrink-0 w-5 h-5 flex items-center justify-center transition-transform ${open ? 'rotate-90' : ''}`}>
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <span className="text-base font-semibold text-slate-900 dark:text-white">{paper.paper_label || `Paper ${paperNumber}`}</span>
          <span className="text-xs text-slate-500 font-mono dark:text-slate-400">
            {variants.length > 0
              ? `Variant${variants.length > 1 ? 's' : ''} ${variants.map((v) => v.variant_number != null ? v.variant_number : v.variant).join(', ')}`
              : ''}
          </span>
          {paper.verified === 1 && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium dark:bg-emerald-500/15 dark:text-emerald-400">verified</span>
          )}
          {isATP && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium dark:bg-purple-500/15 dark:text-purple-300">Alternative to Practical</span>
          )}
          {label && !isATP && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium dark:bg-slate-700 dark:text-slate-300">{label}</span>
          )}
          <span className="text-xs text-slate-400 dark:text-slate-500">{variants.length} {variants.length === 1 ? 'variant' : 'variants'}</span>
        </div>
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap dark:text-slate-400">
          {done} / {effectiveTotal} completed
          {ignored > 0 && <span className="text-slate-400 ml-1 dark:text-slate-500">({ignored} ignored)</span>}
        </span>
      </button>

      <div className="px-4 pb-4 flex items-center gap-3">
        <div className="w-full bg-slate-200 rounded-full h-1.5 dark:bg-slate-700">
          <div className="bg-green-500 rounded-full h-1.5 transition-all duration-300" style={{ width: `${effectiveTotal ? (done / effectiveTotal) * 100 : 0}%` }} />
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {variants.map((variant) => (
            <VariantRow key={variant.id} variant={variant} year={year} session={session} paperNumber={paperNumber} />
          ))}
        </div>
      )}
    </div>
  );
}

function VariantRow({ variant, year, session, paperNumber }) {
  const { isCompleted, isIgnored } = useProgress();
  const completed = isCompleted(variant.id);
  const ignored = isIgnored(variant.id);
  const verified = variant.verified === 1;
  const variantNum = variant.variant_number != null ? variant.variant_number : variant.variant;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
      ignored
        ? 'bg-slate-100 border-slate-200 opacity-60 dark:bg-slate-800/60 dark:border-slate-700'
        : completed
          ? 'bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/30'
          : 'bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700'
    }`}>
      <CheckboxButton paperId={variant.id} completed={completed} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 flex items-center gap-2 flex-wrap dark:text-slate-100">
          <Link to={`/papers/${variant.id}`} className={`hover:text-primary-700 dark:hover:text-primary-300 ${ignored ? 'text-slate-400 line-through' : ''}`}>
            Paper {paperNumber} {variantNum != null ? `— Variant ${variantNum}` : ''}
          </Link>
          <span className="text-xs text-slate-400 font-mono dark:text-slate-500">{variant.component_code}</span>
          {verified && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full dark:bg-emerald-500/15 dark:text-emerald-400" title="Verified against Cambridge sources">verified</span>
          )}
          {!verified && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full dark:bg-slate-700 dark:text-slate-400" title="Component/variant data not yet verified">unverified</span>
          )}
          {ignored && (
            <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full dark:bg-orange-500/15 dark:text-orange-300">ignored</span>
          )}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {year} &middot; {sessionLabel(session)} &middot; {variant.paper_label || `Paper ${paperNumber}`}
          {variant.series_code && variantNum != null && <span className="font-mono"> &middot; {variant.series_code}_qp_{variantNum}.pdf</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <IgnoreButton paperId={variant.id} ignored={ignored} />
        {variant.question_paper_url && (
          <a href={variant.question_paper_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors font-medium dark:bg-primary-500/15 dark:text-primary-300 dark:hover:bg-primary-500/25">Question Paper</a>
        )}
        {variant.mark_scheme_url && (
          <a href={variant.mark_scheme_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">Mark Scheme</a>
        )}
        {variant.examiner_report_url && (
          <a href={variant.examiner_report_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">Examiner Report</a>
        )}
      </div>
    </div>
  );
}

function IgnoreButton({ paperId, ignored }) {
  const { toggleIgnore } = useProgress();

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleIgnore(paperId);
    } catch (err) {
      console.error('Toggle ignore failed:', err);
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-pressed={ignored}
      className={`flex-shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center transition-all duration-250 ease-out active:scale-90 ${
        ignored
          ? 'bg-orange-100 border-orange-300 text-orange-600 dark:bg-orange-500/15 dark:border-orange-500/40 dark:text-orange-300'
          : 'border-slate-200 hover:border-orange-300 bg-white text-slate-400 hover:text-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-orange-500/50 dark:hover:text-orange-400'
      }`}
      title={ignored ? 'Restore this paper' : 'Ignore this paper (exclude from progress)'}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {ignored ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        )}
      </svg>
    </button>
  );
}

function CheckboxButton({ paperId, completed }) {
  const { togglePaper } = useProgress();

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await togglePaper(paperId);
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-pressed={completed}
      className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-250 ease-out active:scale-90 ${
        completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-primary-400 bg-white dark:border-slate-600 dark:bg-slate-800 dark:hover:border-primary-400'
      }`}
      title={completed ? 'Mark as not completed' : 'Mark as completed'}
    >
      {completed && (
        <svg className="w-4 h-4 anim-pop-in" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

export default function SubjectDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { progressMap } = useProgress();

  useEffect(() => {
    setLoading(true);
    setData(null);
    api.get(`/papers/subject/${id}`)
      .then(({ data }) => setData(data))
      .catch(err => {
        console.error('Failed to load subject:', err);
        setError('Failed to load subject');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-center py-20 text-slate-500">{error || 'Subject not found'}</div>;
  }

  const { subject, grouped, papers, total, completed, remaining, ignored } = data;
  const completion = progressMap;
  const completedCount = papers ? papers.filter((p) => completion[p.id]?.completed).length : completed;
  const ignoredCount = papers ? papers.filter((p) => completion[p.id]?.ignored).length : (ignored || 0);
  const displayedCompleted = papers ? completedCount : completed;
  const effectiveTotal = total - ignoredCount;

  return (
    <div className="space-y-8 anim-fade-rise">
      <div>
        <Link to="/subjects" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">&larr; All Subjects</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2 dark:text-white">{subject.name}</h1>
        <p className="text-slate-500 dark:text-slate-400">{subject.code} &middot; {subject.qualification_name}</p>
        {subject.description && <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">{subject.description}</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">Total Papers</div>
          <div className="text-xl font-bold text-slate-900 mt-1 dark:text-white">{total}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">Completed</div>
          <div className="text-xl font-bold text-green-600 mt-1 dark:text-green-400">{displayedCompleted}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">Remaining</div>
          <div className="text-xl font-bold text-primary-600 mt-1 dark:text-primary-400">{effectiveTotal - displayedCompleted}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">Progress</div>
          <div className="text-xl font-bold text-slate-900 mt-1 dark:text-white">{effectiveTotal > 0 ? Math.round((displayedCompleted / effectiveTotal) * 100) : 0}%</div>
        </div>
      </div>

      {ignoredCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-300">
          {ignoredCount} {ignoredCount === 1 ? 'paper is' : 'papers are'} ignored and excluded from progress.
        </div>
      )}

      <div className="card p-4">
        <div className="w-full bg-slate-200 rounded-full h-3 dark:bg-slate-700">
          <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-full h-3 transition-all duration-500" style={{ width: `${effectiveTotal > 0 ? (displayedCompleted / effectiveTotal) * 100 : 0}%` }} />
        </div>
      </div>

      {total === 0 && (
        <div className="text-center py-16 card">
          <div className="flex items-center justify-center mb-3 text-slate-300 dark:text-slate-600">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6M9 8h1M8 4h8a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1 dark:text-white">No verified papers available yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto dark:text-slate-400">
            This subject is on the catalogue but its papers have not yet been verified against
            Cambridge sources, so no variants can be shown. Data will appear once verified.
          </p>
        </div>
      )}

      {total > 0 && (
        <div className="space-y-8">
          {grouped &&
            (() => {
              const yearsList = Object.keys(grouped).sort((a, b) => b - a);
              const newestYear = yearsList[0];
              return yearsList.map(year => (
                <div key={year}>
                  <h2 className="text-xl font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2 dark:text-white dark:border-slate-800">{year}</h2>
                  <div className="space-y-6">
                    {Object.keys(grouped[year])
                      .sort((a, b) => (a === 'mj' ? -1 : 1))
                      .map(session => (
                        <div key={session}>
                          <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2 dark:text-slate-300">
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {sessionLabel(session)}
                          </h3>
                          <div className="space-y-3">
                            {Object.keys(grouped[year][session])
                              .sort((a, b) => a - b)
                              .map(paperNumber => (
                                <PaperGroup
                                  key={paperNumber}
                                  year={year}
                                  session={session}
                                  paperNumber={parseInt(paperNumber)}
                                  paper={grouped[year][session][paperNumber]}
                                  defaultOpen={year === newestYear}
                                />
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ));
            })()}
        </div>
      )}
    </div>
  );
}
