import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EnvironmentNotice from '../components/EnvironmentNotice';
import LoadingButton from '../components/LoadingButton';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Register() {
  const { signUp, session, loading } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (!loading && session) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const data = await signUp(form);
      if (data.session) {
        toast.success('Account created');
        navigate('/dashboard', { replace: true });
      } else {
        toast.success('Account created. Check your email to confirm it, then sign in.');
        navigate('/login', { replace: true });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <form onSubmit={handleSubmit} className="card w-full max-w-md p-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Create your account</h1>
        <EnvironmentNotice />
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="label">Name</span>
            <input className="input mt-1" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Email</span>
            <input className="input mt-1" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className="block">
            <span className="label">Password</span>
            <input className="input mt-1" type="password" required minLength={6} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
        </div>
        <LoadingButton className="btn-primary mt-6 w-full" type="submit" disabled={!isSupabaseConfigured} loading={submitting} loadingText="Creating account...">
          Register
        </LoadingButton>
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Already registered? <Link className="font-medium text-brand-700 dark:text-brand-100" to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
