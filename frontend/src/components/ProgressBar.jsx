export default function ProgressBar({ completed, total, size = 'md' }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

  return (
    <div className="w-full">
      <div className={`w-full bg-slate-200 rounded-full ${heights[size]} dark:bg-slate-700`}>
        <div
          className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%`, height: '100%' }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-slate-500 dark:text-slate-400">{completed} / {total} completed</span>
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{percentage}%</span>
      </div>
    </div>
  );
}
