import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import PaperCard from '../components/PaperCard';
import { useProgress } from '../contexts/ProgressContext';

export default function PastPapers() {
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
        setFilters(data);
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
    };
    loadFilters();
  }, []);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Past Papers</h1>
        <p className="text-slate-500 mt-1">{total.toLocaleString()} papers found</p>
      </div>

      <SearchBar value={search} onChange={handleSearch} placeholder="Search (e.g. Physics 5054 2026 Paper 2)..." />

      <FilterPanel
        filters={filters}
        activeFilters={activeFilters}
        onChange={handleFilterChange}
        onClear={clearFilters}
      />

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Showing {papers.length} of {total.toLocaleString()} papers
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
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
        <div className="text-center py-12 text-slate-500">
          No papers found matching your criteria.
        </div>
      ) : search.toLowerCase().includes('paper') || activeFilters.subject || activeFilters.paper_number ? (
        <GroupedPapers papers={papers} />
      ) : (
        <div className="space-y-4">
          {papers.map(paper => (
            <div key={paper.id}>
              <div className="text-xs text-slate-400 mb-1 ml-1">
                {paper.subject_name} &middot; {paper.subject_code} &middot; {paper.qualification_short_name}
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
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function GroupedPapers({ papers }) {
  const [openState, setOpenState] = useState({});
  const { countCompleted } = useProgress();
  const { isCompleted } = useProgress();

  // Group: subject -> year -> session -> paperNumber -> variants
  const bySubject = {};
  for (const p of papers) {
    const sid = p.subject_id;
    if (!bySubject[sid]) bySubject[sid] = { name: p.subject_name, code: p.subject_code, qualification: p.qualification_short_name, years: {} };
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
        <div key={subject.code} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-slate-900">{subject.name}</h3>
            <p className="text-xs text-slate-500">{subject.code} &middot; {subject.qualification}</p>
          </div>
          <div className="space-y-4">
            {Object.keys(subject.years).sort((a,b) => b-a).map(year => (
              <div key={year}>
                <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-1 mb-2">{year}</h4>
                <div className="space-y-2">
                  {Object.keys(subject.years[year]).sort((a, b) => (a === 'mj' ? -1 : a === 'on' ? 1 : a.localeCompare(b))).map(session => (
                    <div key={session}>
                      <h5 className="text-xs font-medium text-slate-500 mb-1">{session === 'mj' ? 'May/June' : session === 'on' ? 'October/November' : session}</h5>
                      <div className="space-y-2">
                        {Object.keys(subject.years[year][session]).sort((a,b)=>a-b).map(pn => {
                          const variants = subject.years[year][session][pn];
                          const key = `${subject.code}-${year}-${session}-${pn}`;
                          const open = openState[key] !== false;
                          const variantIds = variants.map(v => v.id);
                          const done = countCompleted(variantIds);
                          const isATP = variants[0]?.paper_type === 'alternative_to_practical';
                          const ptype = variants[0]?.paper_type;
                          const groupVerified = variants.length > 0 && variants.every(v => v.component_verified === 1);
                          return (
                            <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleOpen(key)}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50 text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`flex-shrink-0 w-4 h-4 flex items-center justify-center transition-transform ${open ? 'rotate-90' : ''}`}>
                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                                  </span>
                                  <span className="text-sm font-semibold text-slate-800">Paper {pn}</span>
                                  {groupVerified && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">verified</span>}
                                  {!groupVerified && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">unverified</span>}
                                  {isATP && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">Alternative to Practical</span>}
                                  {ptype && !isATP && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{label(ptype)}</span>}
                                  <span className="text-[10px] text-slate-400">{variants.length} variants</span>
                                </div>
                                <span className="text-[10px] font-medium text-slate-500">{done}/{variants.length}</span>
                              </button>
                              {open && (
                                <div className="px-3 pb-3 space-y-2">
                                  {variants.map(v => (
                                    <div key={v.id} className="flex items-center gap-3">
                                      <VariantCheckbox paperId={v.id} />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm text-slate-700 flex items-center gap-2 flex-wrap">
                                          <span>{v.component_code || `Variant ${v.variant}`}</span>
                                          {v.component_verified === 1 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">verified</span>}
                                          {v.component_verified !== 1 && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">unverified</span>}
                                        </div>
                                        {v.series_code && v.variant != null && <div className="text-[10px] text-slate-400 font-mono">{v.series_code}_qp_{v.variant}.pdf</div>}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {v.question_paper_url && <a href={v.question_paper_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-lg hover:bg-primary-100">Question Paper</a>}
                                        {v.mark_scheme_url && <a href={v.mark_scheme_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100">Mark Scheme</a>}
                                        {v.examiner_report_url && <a href={v.examiner_report_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100">Examiner Report</a>}
                                      </div>
                                    </div>
                                  ))}
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
      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 bg-white hover:border-primary-400'}`}
    >
      {completed && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
    </button>
  );
}
