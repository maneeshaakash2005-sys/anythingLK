import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBilling } from '../hooks/useBilling';
import { getPlanFeatureLabels } from '../lib/planFeatures';

export default function Pricing() {
  const { plans, loading } = useBilling(null);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <main className="mx-auto max-w-6xl">
        <header className="text-center">
          <h1 className="text-3xl font-semibold sm:text-4xl">OrderBase Pricing</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">Choose a plan and submit payment proof for manual verification.</p>
        </header>

        {loading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="card h-64 animate-pulse" />
            <div className="card h-64 animate-pulse" />
          </div>
        ) : (
          <section className="mt-8 grid gap-6 md:grid-cols-2">
            {plans.map((plan) => {
              const features = getPlanFeatureLabels(plan.id, plan.features).slice(0, 10);
              return (
                <article key={plan.id} className="card p-6">
                  <h2 className="text-xl font-semibold">{plan.name}</h2>
                  <p className="mt-2 text-3xl font-bold">LKR {Number(plan.monthly_price_lkr || 0).toLocaleString()}<span className="text-base font-medium text-slate-500"> / month</span></p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 capitalize">
                        <CheckCircle2 className="h-4 w-4 text-brand-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link className="btn-primary mt-6 w-full justify-center" to="/dashboard/billing">Choose {plan.name}</Link>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
