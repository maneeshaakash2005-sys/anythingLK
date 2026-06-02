import { ArrowRight, PackageCheck } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { session, loading } = useAuth();

  if (!loading && session) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <PackageCheck className="h-6 w-6 text-brand-600" aria-hidden="true" />
          OrderBase
        </div>
        <div className="flex items-center gap-3">
          <Link className="btn-secondary" to="/pricing">Pricing</Link>
          <Link className="btn-secondary" to="/login">Login</Link>
          <Link className="btn-primary" to="/register">Register</Link>
        </div>
      </header>
      <main className="mx-auto grid min-h-[calc(100vh-88px)] max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1fr_0.9fr]">
        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-100">Production order operations</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">OrderBase</h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Manage orders, products, customers, reports, and settings from a Supabase-backed dashboard.
          </p>
          <Link className="btn-primary mt-8" to="/login">
            Open dashboard
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
        <section className="card p-5">
          <div className="grid gap-3">
            {['Revenue tracking', 'Stock alerts', 'Customer order history', 'CSV-ready reporting'].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3 dark:border-slate-800">
                <span className="text-sm font-medium">{item}</span>
                <PackageCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
