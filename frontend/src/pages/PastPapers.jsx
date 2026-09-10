import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import PaperCard from '../components/PaperCard';
import { useProgress } from '../contexts/ProgressContext';
import { useAuth } from '../contexts/AuthContext';

export default function PastPapers() {
  const { preferences } = useAuth();
  const selectedSet = new Set(preferences?.subject_ids || []);
  const [searchParams] = useSearchParams();
  const [papers, setPapers] = useState([]);
  const [filters, setFilters] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [activeFilters, setActiveFilters] = useState({
    qualification: searchParams.get('qualification') || '',
    subject: searchParams.get('subject') || '',
    year: searchParams.get('year') || '',
    session: searchParams.get('session') || '',
    paper_number: searchParams.get('paper_number') || '',
    paper_type: searchParams.get('paper_type') || '',
    verification_status: searchParams.get('verification_status') || '',
    status: searchParams.get('status') || '',
  });

  const searchRef = useRef(search);
  const filtersRef = useRef(activeFilters);
  const sortRef = useRef(sort);
  const pageRef = useRef(page);

  useEffect(() => { searchRef.current = search; }, [search]);
  useEffect(() => { filtersRef.current = activeFilters; }, [activeFilters]);
  useEffect(() => { sortRef.current = sort; }, [sort]);
  useEffect(() => { pageRef.current = page; }, [page]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const { data } = await api.get('/papers/filters');
        if (preferences?.show_only_selected_subjects) {
          data.subjects = data.subjects.filter((s) => selectedSet.has(s.id));
        }
        setFilters(data);
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
    };
    loadFilters();
  }, [preferences?.show_only_selected_subjects]);

  const loadPapers = useCallback(async (overrides = {}) => {
    try {
      setLoading(true);
      const q = overrides.search !== undefined ? overrides.search : searchRef.current;
      const af = overrides.activeFilters || filtersRef.current;
      const s = overrides.sort !== undefined ? overrides.sort : sortRef.current;
      const p = overrides.page !== undefined ? overrides.page : pageRef.current;

      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (af.qualification) params.set('qualification', af.qualification);
      if (af.subject) params.set('subject', af.subject);
      if (af.year) params.set('year', af.year);
      if (af.session) params.set('session', af.session);
      if (af.paper_number) params.set('paper_number', af.paper_number);
      if (af.paper_type) params.set('paper_type', af.paper_type);
      if (af.verification_status) params.set('verification_status', af.verification_status);
      if (af.status) params.set('status', af.status);
      params.set('sort', s);
      params.set('page', p);
      params.set('limit', 500);

      const { data } = await api.get(`/papers?${params.toString()}`);
      setPapers(data.papers);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load papers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPapers();
  }, [search, activeFilters, sort, page, loadPapers]);

  const handleSearch = useCallback((value) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleFilterChange = (key, value) => {
    setActiveFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setActiveFilters({ qualification: '', subject: '', year: '', session: '', paper_number: '', paper_type: '', verification_status: '', status: '' });
    setSearch('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / 500);

  return (
    <div className="space-y-6 anim-fade-rise">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Past Papers</h1>
        <p className="text-slate-500 mt-1 dark:text-slate-400">{total.toLocaleString()} papers found</p>
      </div>

      <SearchBar value={search} onChange={handleSearch} placeholder="Search (e.g. Physics 5054 2026 Paper 2)..." />

      <FilterPanel
        filters={filters}
        activeFilters={activeFilters}
        onChange={handleFilterChange}
        onClear={clearFilters}
      />

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Showing {papers.length} of {total.toLocaleString()} papers
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="select"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="subject">Subject</option>
          <option value="paper">Paper Number</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : papers.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          No papers found matching your criteria.
        </div>
      ) : search.toLowerCase().includes('paper') || activeFilters.subject || activeFilters.paper_number ? (
        <GroupedPapers papers={papers} selectedSet={selectedSet} />
      ) : (
        <div className="space-y-4">
          {papers.map(paper => (
            <div key={paper.id}>
              <div className="text-xs text-slate-400 mb-1 ml-1 flex items-center gap-2 dark:text-slate-500">
                <span>{paper.subject_name} &middot; {paper.subject_code} &middot; {paper.qualification_short_name}</span>
                {selectedSet.has(paper.subject_id) && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full font-medium dark:bg-primary-500/15 dark:text-primary-300">
                    ✓ Your Subject
                  </span>
                )}
              </div>
              <PaperCard paper={paper} />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function GroupedPapers({ papers, selectedSet }) {
  const [openState, setOpenState] = useState({});
  const { countCompleted, countIgnored } = useProgress();
  const { isCompleted, isIgnored } = useProgress();

  // Group: subject -> year -> session -> paperNumber -> variants
  const bySubject = {};
  for (const p of papers) {
    const sid = p.subject_id;
    if (!bySubject[sid]) bySubject[sid] = { id: sid, name: p.subject_name, code: p.subject_code, qualification: p.qualification_short_name, years: {} };
    if (!bySubject[sid].years[p.year]) bySubject[sid].years[p.year] = {};
    if (!bySubject[sid].years[p.year][p.session]) bySubject[sid].years[p.year][p.session] = {};
    if (!bySubject[sid].years[p.year][p.session][p.paper_number]) bySubject[sid].years[p.year][p.session][p.paper_number] = [];
    bySubject[sid].years[p.year][p.session][p.paper_number].push(p);
  }

  const toggleOpen = (key) => setOpenState(prev => ({ ...prev, [key]: !prev[key] }));

  const label = (type) => type === 'alternative_to_practical' ? 'Alternative to Practical' : type === 'practical' ? 'Practical' : type;

  return (
    <div className="space-y-6">
      {Object.values(bySubject).map(subject => (
        <div key={subject.code} className="card p-4">
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{subject.name}</h3>
              {selectedSet && selectedSet.has(subject.id) && (
                <span className="inline-flex items-center gap-0.5 text-[11px] bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium dark:bg-primary-500/15 dark:text-primary-300">
                  ✓ Your Subject
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{subject.code} &middot; {subject.qualification}</p>
          </div>
          <div className="space-y-4">
            {Object.keys(subject.years).sort((a,b) => b-a).map(year => (
              <div key={year}>
                <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-1 mb-2 dark:text-slate-200 dark:border-slate-800">{year}</h4>
                <div className="space-y-2">
                  {Object.keys(subject.years[year]).sort((a, b) => (a === 'mj' ? -1 : a === 'on' ? 1 : a.localeCompare(b))).map(session => (
                    <div key={session}>
                      <h5 className="text-xs font-medium text-slate-500 mb-1 dark:text-slate-400">{session === 'mj' ? 'May/June' : session === 'on' ? 'October/November' : session}</h5>
                      <div className="space-y-2">
                        {Object.keys(subject.years[year][session]).sort((a,b)=>a-b).map(pn => {
                          const variants = subject.years[year][session][pn];
                          const key = `${subject.code}-${year}-${session}-${pn}`;
                          const open = openState[key] !== false;
                          const variantIds = variants.map(v => v.id);
                          const done = countCompleted(variantIds);
                          const ignored = countIgnored(variantIds);
                          const effectiveTotal = variants.length - ignored;
                          const isATP = variants[0]?.paper_type === 'alternative_to_practical';
                          const ptype = variants[0]?.paper_type;
                          const plabel = variants[0]?.paper_label;
                          const groupVerified = variants.length > 0 && variants.every(v => v.component_verified === 1);
                          return (
                            <div key={key} className="border border-slate-200 rounded-lg overflow-hidden dark:border-slate-700">
                              <button
                                onClick={() => toggleOpen(key)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50 text-left dark:hover:bg-slate-800/60"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`flex-shrink-0 w-4 h-4 flex items-center justify-center transition-transform ${open ? 'rotate-90' : ''}`}>
                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                                  </span>
                                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{plabel || `Paper ${pn}`}</span>
                                  {groupVerified && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full dark:bg-emerald-500/15 dark:text-emerald-400">verified</span>}
                                  {!groupVerified && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full dark:bg-slate-700 dark:text-slate-400">unverified</span>}
                                  {isATP && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium dark:bg-purple-500/15 dark:text-purple-300">Alternative to Practical</span>}
                                  {ptype && !isATP && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full dark:bg-slate-700 dark:text-slate-300">{label(ptype)}</span>}
                                  <span className="text-[10px] text-slate-400 font-mono dark:text-slate-500">
                                    {variants.length > 0 ? variants.map(v => `V${v.variant != null ? v.variant : v.variant_number}`).join(' ') : ''}
                                  </span>
                                </div>
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{done}/{effectiveTotal}{ignored > 0 ? ` (${ignored} ignored)` : ''}</span>
                              </button>
                              {open && (
                                <div className="px-3 pb-3 space-y-2">
                                  {variants.map(v => {
                                    const vIgnored = isIgnored(v.id);
                                    return (
                                    <div key={v.id} className={`flex items-center gap-3 ${vIgnored ? 'opacity-50' : ''}`}>
                                      <VariantCheckbox paperId={v.id} />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm text-slate-700 flex items-center gap-2 flex-wrap dark:text-slate-200">
                                          <span className={`font-medium ${vIgnored ? 'line-through text-slate-400' : ''}`}>Variant {v.variant != null ? v.variant : v.variant_number}</span>
                                          <span className="text-xs text-slate-400 font-mono dark:text-slate-500">{v.component_code}</span>
                                          {v.component_verified === 1 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full dark:bg-emerald-500/15 dark:text-emerald-400">verified</span>}
                                          {v.component_verified !== 1 && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full dark:bg-slate-700 dark:text-slate-400">unverified</span>}
                                          {vIgnored && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full dark:bg-orange-500/15 dark:text-orange-300">ignored</span>}
                                        </div>
                                        {v.series_code && v.variant != null && <div className="text-[10px] text-slate-400 font-mono dark:text-slate-500">{v.series_code}_qp_{v.variant}.pdf</div>}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <VariantIgnoreButton paperId={v.id} ignored={vIgnored} />
                                        {v.question_paper_url && <a href={v.question_paper_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-lg hover:bg-primary-100 dark:bg-primary-500/15 dark:text-primary-300 dark:hover:bg-primary-500/25">Question Paper</a>}
                                        {v.mark_scheme_url && <a href={v.mark_scheme_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">Mark Scheme</a>}
                                        {v.examiner_report_url && <a href={v.examiner_report_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">Examiner Report</a>}
                                      </div>
                                    </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VariantCheckbox({ paperId }) {
  const { isCompleted, togglePaper } = useProgress();
  const completed = isCompleted(paperId);
  const handleClick = async (e) => {
    e.preventDefault();
    try { await togglePaper(paperId); } catch (err) { console.error('Toggle failed:', err); }
  };
  return (
    <button
      onClick={handleClick}
      aria-pressed={completed}
      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-250 ease-out active:scale-90 ${completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 bg-white hover:border-primary-400 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-primary-400'}`}
    >
      {completed && <svg className="w-3 h-3 anim-pop-in" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
    </button>
  );
}

function VariantIgnoreButton({ paperId, ignored }) {
  const { toggleIgnore } = useProgress();
  const handleClick = async (e) => {
    e.preventDefault();
    try { await toggleIgnore(paperId); } catch (err) { console.error('Toggle ignore failed:', err); }
  };
  return (
    <button
      onClick={handleClick}
      aria-pressed={ignored}
      className={`flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-250 ease-out active:scale-90 ${
        ignored
          ? 'bg-orange-100 border-orange-300 text-orange-600 dark:bg-orange-500/15 dark:border-orange-500/40 dark:text-orange-300'
          : 'border-slate-200 bg-white hover:border-orange-300 text-slate-400 hover:text-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-orange-500/50 dark:hover:text-orange-400'
      }`}
      title={ignored ? 'Restore this paper' : 'Ignore this paper'}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {ignored ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        )}
      </svg>
    </button>
  );
}
