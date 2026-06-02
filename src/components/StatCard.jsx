export default function StatCard({ title, value, icon: Icon, tone = 'teal' }) {
  const tones = {
    teal: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-100',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-100',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-100',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-100',
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        {Icon ? (
          <div className={`rounded-md p-2 ${tones[tone] || tones.teal}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
