import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No data found', message = 'Try adjusting filters or adding a new record.', action }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-12 text-center">
      <Inbox className="h-10 w-10 text-slate-400" aria-hidden="true" />
      <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
