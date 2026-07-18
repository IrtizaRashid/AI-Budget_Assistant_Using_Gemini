import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { loginApi, sendLoginCodeApi, verifyLoginCodeApi } from '../services/api.js';
import { authErrorMessage } from '../utils/authErrors.js';
import Alert from '../components/Alert.jsx';

const OTP_LENGTH = 8;

export default function Login() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const email = form.email.trim().toLowerCase();
    const password = form.password;
    if (!email) return setError('Email address is required.');
    if (!password) return setError('Password is required.');

    try {
      setLoading(true);
      const session = await loginApi({ email, password });
      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }

      const user = await refreshUser();
      if (!user?.monthly_budget || Number(user.monthly_budget) === 0) {
        navigate('/setup', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(authErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  const finishLogin = async () => {
    const user = await refreshUser();
    if (!user?.monthly_budget || Number(user.monthly_budget) === 0) {
      navigate('/setup', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleSendLoginCode = async () => {
    setError('');
    setNotice('');
    const email = form.email.trim().toLowerCase();
    if (!email) return setError('Email address is required.');

    try {
      setLoading(true);
      await sendLoginCodeApi({ email });
      setShowOtpInput(true);
      setNotice('A login code has been sent to your email.');
    } catch (err) {
      setError(authErrorMessage(err, 'Could not send login code. Make sure this account already exists.'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const email = form.email.trim().toLowerCase();
    const token = otp.trim();
    if (!email) return setError('Email address is required.');
    if (!token) return setError('Login code is required.');
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(token)) {
      return setError(`Login code must be ${OTP_LENGTH} digits.`);
    }

    try {
      setLoading(true);
      const session = await verifyLoginCodeApi({
        email,
        token,
      });
      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }
      await finishLogin();
    } catch (err) {
      setError(authErrorMessage(err, 'Invalid or expired login code.'));
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
          Sign In
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          Sign in with your password or an email code.
        </p>

        <form onSubmit={showOtpInput ? handleOtpSubmit : handleSubmit} className="mt-6 space-y-4" autoComplete="on">
          {error && <Alert type="error">{error}</Alert>}
          {notice && <Alert type="success">{notice}</Alert>}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Email Address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            />
          </div>

          {showOtpInput ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Login Code</label>
              <input
                type="text"
                name="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                placeholder="12345678"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-lg font-bold tracking-widest text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
              />
            </div>
          ) : (
            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-slate-300">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-fuchsia-400 hover:text-fuchsia-300">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                placeholder="Your password"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:from-fuchsia-500 hover:to-pink-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Please wait...' : showOtpInput ? 'Verify Code' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={showOtpInput ? () => {
              setShowOtpInput(false);
              setOtp('');
              setError('');
              setNotice('');
            } : handleSendLoginCode}
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {showOtpInput ? 'Use password instead' : 'Email me a login code'}
          </button>

          <p className="text-center text-sm text-slate-400">
            New here?{' '}
            <Link to="/register" className="font-semibold text-fuchsia-400 hover:text-fuchsia-300">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
