import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="card max-w-md p-6 text-center">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This page is not available, but the app is still running correctly.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link className="btn-primary" to="/dashboard">Dashboard</Link>
          <Link className="btn-secondary" to="/">Home</Link>
        </div>
      </section>
    </main>
  );
}
