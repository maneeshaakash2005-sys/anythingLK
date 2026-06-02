import { AlertTriangle, CreditCard, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/format';

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const diff = new Date(dateValue).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function getSubscriptionState(shop, subscription) {
  const status = shop?.subscription_status || subscription?.status;
  const locked = shop?.service_locked || status === 'locked';
  const expiry = subscription?.current_period_end || shop?.trial_ends_at || subscription?.trial_ends_at;
  const days = daysUntil(expiry);
  const trialEndsAt = shop?.trial_ends_at ? new Date(shop.trial_ends_at) : null;
  const expiredTrial = status === 'trialing' && trialEndsAt && trialEndsAt.getTime() < Date.now();
  const pastDue = status === 'past_due' || expiredTrial;
  const expiringSoon = !locked && days !== null && days >= 0 && days <= 3;

  if (locked) return { state: 'locked', days, expiry };
  if (pastDue || status === 'pending_payment') return { state: 'warning', days, expiry };
  if (expiringSoon) return { state: 'expiring', days, expiry };
  return { state: 'ok', days, expiry };
}

export default function SubscriptionBanner({ shop, subscription }) {
  const { state, days, expiry } = getSubscriptionState(shop, subscription);
  if (state === 'ok') return null;

  const locked = state === 'locked';
  const urgent = state === 'expiring' && days !== null && days <= 1;
  const warning = state === 'expiring' || state === 'warning';

  let message = locked
    ? 'Your subscription has expired.'
    : 'Subscription action required.';

  if (state === 'expiring' && days === 0) message = 'Your subscription expires today.';
  else if (state === 'expiring' && days === 1) message = 'Your subscription expires tomorrow.';
  else if (state === 'expiring' && days !== null && days > 1) message = `Your subscription expires in ${days} days.`;

  return (
    <section className={`mb-6 rounded-md border px-4 py-4 ${
      locked || urgent
        ? 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-500/10 dark:text-rose-100'
        : warning
          ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-100'
          : 'border-amber-200 bg-amber-50 text-amber-950'
    }`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          {locked ? <Lock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
          <div>
            <p className="font-semibold">{message}</p>
            <p className="mt-1 text-sm opacity-90">
              Renew now to continue using premium features.
              {expiry ? ` Expiry date: ${formatDate(expiry)}.` : ''}
              {shop?.lock_reason ? ` ${shop.lock_reason}.` : ''}
            </p>
          </div>
        </div>
        <Link className="btn-primary w-full sm:w-auto" to="/dashboard/billing">
          <CreditCard className="h-4 w-4" aria-hidden="true" />
          Renew now
        </Link>
      </div>
    </section>
  );
}
