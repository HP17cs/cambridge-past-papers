export default function FilterPanel({ filters, activeFilters, onChange, onClear }) {
  const hasFilters = Object.values(activeFilters).some(v => v);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filters</h3>
        {hasFilters && (
          <button
            onClick={onClear}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium dark:text-primary-400 dark:hover:text-primary-300"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {filters.qualifications && (
          <div>
            <label className="block text-xs text-slate-500 mb-1 dark:text-slate-400">Qualification</label>
            <select
              value={activeFilters.qualification || ''}
              onChange={(e) => onChange('qualification', e.target.value)}
              className="select"
            >
              <option value="">All</option>
              {filters.qualifications.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
        )}

        {filters.subjects && (
          <div>
            <label className="block text-xs text-slate-500 mb-1 dark:text-slate-400">Subject</label>
            <select
              value={activeFilters.subject || ''}
              onChange={(e) => onChange('subject', e.target.value)}
              className="select"
            >
              <option value="">All</option>
              {filters.subjects.map(s => (
                <option key={s.id} value={s.code}>{s.code} - {s.name}</option>
              ))}
            </select>
          </div>
        )}

        {filters.years && (
          <div>
            <label className="block text-xs text-slate-500 mb-1 dark:text-slate-400">Year</label>
            <select
              value={activeFilters.year || ''}
              onChange={(e) => onChange('year', e.target.value)}
              className="select"
            >
              <option value="">All</option>
              {filters.years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {filters.sessions && (
          <div>
            <label className="block text-xs text-slate-500 mb-1 dark:text-slate-400">Session</label>
            <select
              value={activeFilters.session || ''}
              onChange={(e) => onChange('session', e.target.value)}
              className="select"
            >
              <option value="">All</option>
              {filters.sessions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {filters.paperNumbers && (
          <div>
            <label className="block text-xs text-slate-500 mb-1 dark:text-slate-400">Paper</label>
            <select
              value={activeFilters.paper_number || ''}
              onChange={(e) => onChange('paper_number', e.target.value)}
              className="select"
            >
              <option value="">All</option>
              {filters.paperNumbers.map(p => (
                <option key={p} value={p}>Paper {p}</option>
              ))}
            </select>
          </div>
        )}

        {filters.paperTypes && filters.paperTypes.length > 0 && (
          <div>
            <label className="block text-xs text-slate-500 mb-1 dark:text-slate-400">Paper Type</label>
            <select
              value={activeFilters.paper_type || ''}
              onChange={(e) => onChange('paper_type', e.target.value)}
              className="select"
            >
              <option value="">All</option>
              <option value="theory">Theory</option>
              <option value="practical">Practical</option>
              <option value="alternative_to_practical">Alternative to Practical</option>
              <option value="coursework">Coursework</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-500 mb-1 dark:text-slate-400">Status</label>
          <select
            value={activeFilters.status || ''}
            onChange={(e) => onChange('status', e.target.value)}
            className="select"
          >
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="not_completed">Not Completed</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1 dark:text-slate-400">Verification</label>
          <select
            value={activeFilters.verification_status || ''}
            onChange={(e) => onChange('verification_status', e.target.value)}
            className="select"
          >
            <option value="">All</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
      </div>
    </div>
  );
}
