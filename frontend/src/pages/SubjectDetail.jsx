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
  const { countCompleted } = useProgress();
  const [open, setOpen] = useState(defaultOpen);

  const variants = paper.variants || [];
  const variantIds = variants.map((v) => v.id);
  const done = countCompleted(variantIds);
  const label = PAPER_TYPE_LABELS[paper.paper_type] || null;
  const isATP = paper.paper_type === 'alternative_to_practical';

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`flex-shrink-0 w-5 h-5 flex items-center justify-center transition-transform ${open ? 'rotate-90' : ''}`}>
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <span className="text-base font-semibold text-slate-900">Paper {paperNumber}</span>
          {paper.verified === 1 && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">verified</span>
          )}
          {isATP && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Alternative to Practical</span>
          )}
          {label && !isATP && (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{label}</span>
          )}
          <span className="text-xs text-slate-400">{variants.length} {variants.length === 1 ? 'variant' : 'variants'}</span>
        </div>
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
          {done} / {variants.length} completed
        </span>
      </button>

      <div className="px-4 pb-4 flex items-center gap-3">
        <div className="w-full bg-slate-200 rounded-full h-1.5">
          <div className="bg-green-500 rounded-full h-1.5 transition-all duration-300" style={{ width: `${variants.length ? (done / variants.length) * 100 : 0}%` }} />
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
  const { isCompleted } = useProgress();
  const completed = isCompleted(variant.id);
  const verified = variant.verified === 1;
  const variantNum = variant.variant_number != null ? variant.variant_number : variant.variant;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${completed ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
      <CheckboxButton paperId={variant.id} completed={completed} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 flex items-center gap-2 flex-wrap">
          <Link to={`/papers/${variant.id}`} className="hover:text-primary-700">
            {variant.component_code || `Paper ${variantNum}`}
          </Link>
          {verified && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full" title="Verified against Cambridge sources">verified</span>
          )}
          {!verified && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full" title="Component/variant data not yet verified">unverified</span>
          )}
        </div>
        <div className="text-xs text-slate-500">
          {year} &middot; {sessionLabel(session)} &middot; Paper {paperNumber}
          {variant.series_code && variantNum != null && <span className="font-mono"> &middot; {variant.series_code}_qp_{variantNum}.pdf</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {variant.question_paper_url && (
          <a href={variant.question_paper_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors font-medium">Question Paper</a>
        )}
        {variant.mark_scheme_url && (
          <a href={variant.mark_scheme_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium">Mark Scheme</a>
        )}
        {variant.examiner_report_url && (
          <a href={variant.examiner_report_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium">Examiner Report</a>
        )}
      </div>
    </div>
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
      className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
        completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-primary-400 bg-white'
      }`}
      title={completed ? 'Mark as not completed' : 'Mark as completed'}
    >
      {completed && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

  const { subject, grouped, papers, total, completed, remaining } = data;
  const completion = progressMap;
  const completedCount = papers ? papers.filter((p) => completion[p.id]?.completed).length : completed;
  const displayedCompleted = papers ? completedCount : completed;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/subjects" className="text-sm text-primary-600 hover:text-primary-700">&larr; All Subjects</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">{subject.name}</h1>
        <p className="text-slate-500">{subject.code} &middot; {subject.qualification_name}</p>
        {subject.description && <p className="text-sm text-slate-500 mt-2">{subject.description}</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Total Papers</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{total}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Completed</div>
          <div className="text-xl font-bold text-green-600 mt-1">{displayedCompleted}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Remaining</div>
          <div className="text-xl font-bold text-primary-600 mt-1">{total - displayedCompleted}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Progress</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{total > 0 ? Math.round((displayedCompleted / total) * 100) : 0}%</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div className="bg-primary-600 rounded-full h-3 transition-all duration-500" style={{ width: `${total > 0 ? (displayedCompleted / total) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="space-y-8">
        {grouped &&
          Object.keys(grouped)
            .sort((a, b) => b - a)
            .map(year => (
              <div key={year}>
                <h2 className="text-xl font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">{year}</h2>
                <div className="space-y-6">
                  {Object.keys(grouped[year])
                    .sort((a, b) => (a === 'mj' ? -1 : 1))
                    .map(session => (
                      <div key={session}>
                        <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
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
                              />
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
