import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase.js';
import { authErrorMessage } from '../utils/authErrors.js';
import Alert from '../components/Alert.jsx';

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!form.password) return setError('Password is required.');
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');

    try {
      setLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({
        password: form.password,
      });
      if (updateError) throw updateError;
      setNotice('Password updated. You can sign in with your new password now.');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(authErrorMessage(err, 'Could not update password. Please open the latest reset link from your email.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0712] px-4 py-10">
      <div className="pointer-events-none absolute -left-24 top-0 h-96 w-96 rounded-full bg-fuchsia-600/25 blur-[120px] animate-blob" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-purple-600/25 blur-[120px] animate-blob delay-200" />

      <div className="relative w-full max-w-md animate-fade-in-up rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-2xl shadow-lg shadow-fuchsia-500/40">
            AI
          </span>
        </div>
        <h1 className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-purple-400 bg-clip-text text-center text-2xl font-extrabold tracking-tight text-transparent text-glow">
          Choose New Password
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          Use the reset link from your email, then set a new password here.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" autoComplete="on">
          {error && <Alert type="error">{error}</Alert>}
          {notice && <Alert type="success">{notice}</Alert>}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">New Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder="Repeat your password"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:from-fuchsia-500 hover:to-pink-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>

          <p className="text-center text-sm text-slate-400">
            Need a fresh link?{' '}
            <Link to="/forgot-password" className="font-semibold text-fuchsia-400 hover:text-fuchsia-300">
              Send another reset email
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
