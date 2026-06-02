import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FeatureGate({ allowed, featureName, children }) {
  if (allowed) return children;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{featureName} is available on the PRO plan. Customize branding, uploads, and templates after upgrading.</p>
        </div>
        <Link className="btn-primary w-full sm:w-auto" to="/dashboard/billing">Upgrade</Link>
      </div>
    </div>
  );
}
