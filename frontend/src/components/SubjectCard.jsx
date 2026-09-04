import { Link } from 'react-router-dom';

export default function SubjectCard({ subject }) {
  return (
    <Link
      to={`/subjects/${subject.id}`}
      className="card card-hover block p-5 group"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300 transition-colors duration-400 ease-out">{subject.name}</h3>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">{subject.code} &middot; {subject.qualification_short_name || subject.qualification}</p>
        </div>
        <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1 group-hover:text-primary-500 dark:text-slate-500 transition-all duration-400 ease-out group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      {subject.description && (
        <p className="text-sm text-slate-500 mt-3 line-clamp-2 dark:text-slate-400">{subject.description}</p>
      )}
      <div className="mt-4 flex items-center gap-4 text-xs">
        {subject.paper_count > 0 ? (
          <span className="text-slate-400 dark:text-slate-500">{subject.paper_count} papers</span>
        ) : (
          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium dark:text-amber-400 dark:bg-amber-500/10">No papers yet</span>
        )}
      </div>
    </Link>
  );
}
