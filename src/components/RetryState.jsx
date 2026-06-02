import { AlertTriangle } from 'lucide-react';

export default function RetryState({ message = 'Unable to load data.', onRetry }) {
  return (
    <div className="card flex items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
        <p className="text-sm text-slate-700 dark:text-slate-200">{message}</p>
      </div>
      {onRetry ? (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
