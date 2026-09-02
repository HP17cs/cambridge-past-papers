import { Link } from 'react-router-dom';

export default function SubjectCard({ subject }) {
  return (
    <Link
      to={`/subjects/${subject.id}`}
      className="block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-primary-200 transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{subject.name}</h3>
          <p className="text-sm text-slate-500 mt-1">{subject.code} &middot; {subject.qualification_short_name || subject.qualification}</p>
        </div>
        <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      {subject.description && (
        <p className="text-sm text-slate-500 mt-3 line-clamp-2">{subject.description}</p>
      )}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
        <span>{subject.paper_count || '—'} papers</span>
      </div>
    </Link>
  );
}
