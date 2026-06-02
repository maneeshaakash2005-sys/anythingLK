import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EnvironmentNotice from '../components/EnvironmentNotice';
import LoadingButton from '../components/LoadingButton';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Login() {
  const { signIn, resetPassword, session, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  if (!loading && session) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await signIn({ ...form, rememberMe });
      toast.success('Welcome back');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.message);
      navigate('/login', { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (!form.email) {
      toast.error('Enter your email first.');
      return;
    }
    if (resetting) return;
    setResetting(true);
    try {
      await resetPassword(form.email);
      toast.success('Password reset email sent.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <form onSubmit={handleSubmit} className="card w-full max-w-md p-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Login to OrderBase</h1>
        <EnvironmentNotice />
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="label">Email</span>
            <input className="input mt-1" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input className="input mt-1" type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Keep me logged in
          </label>
        </div>
        <LoadingButton className="btn-primary mt-6 w-full" type="submit" disabled={!isSupabaseConfigured} loading={submitting} loadingText="Signing in...">
          Sign in
        </LoadingButton>
        <LoadingButton className="btn-secondary mt-3 w-full" type="button" onClick={handleResetPassword} disabled={!isSupabaseConfigured} loading={resetting} loadingText="Sending...">
          Reset password
        </LoadingButton>
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          New to OrderBase? <Link className="font-medium text-brand-700 dark:text-brand-100" to="/register">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
