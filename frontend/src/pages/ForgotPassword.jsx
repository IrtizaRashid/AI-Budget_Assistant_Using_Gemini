import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase.js';
import { authErrorMessage } from '../utils/authErrors.js';
import Alert from '../components/Alert.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError('Email address is required.');

    try {
      setLoading(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setNotice('Password reset link sent. Check your email and open the link on this device.');
    } catch (err) {
      setError(authErrorMessage(err, 'Could not send reset link.'));
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
          Reset Password
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          Enter your email and we will send a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" autoComplete="on">
          {error && <Alert type="error">{error}</Alert>}
          {notice && <Alert type="success">{notice}</Alert>}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:from-fuchsia-500 hover:to-pink-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <p className="text-center text-sm text-slate-400">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-fuchsia-400 hover:text-fuchsia-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
