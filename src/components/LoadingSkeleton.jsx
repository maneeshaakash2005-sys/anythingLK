export default function LoadingSkeleton({ rows = 4, className = '' }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-12 rounded-md bg-slate-200 dark:bg-slate-800" />
      ))}
    </div>
  );
}
