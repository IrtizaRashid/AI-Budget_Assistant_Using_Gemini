import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { registerApi, resendSignupApi, verifySignupApi } from '../services/api.js';
import { authErrorMessage } from '../utils/authErrors.js';
import Alert from '../components/Alert.jsx';

const MIN_PASSWORD_LENGTH = 6;
const OTP_LENGTH = 8;
const AUTH_TIMEOUT_MS = 90000;

const withTimeout = (promise, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out. Please check your internet connection and try again.`)), AUTH_TIMEOUT_MS)
    ),
  ]);

export default function Register() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    if (!name) return setError('Name is required.');
    if (!email) return setError('Email address is required.');
    if (!password) return setError('Password is required.');
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (password !== confirmPassword) return setError('Passwords do not match.');

    try {
      setLoading(true);
      await withTimeout(
        registerApi({
          name,
          email,
          password,
        }),
        'Creating account'
      );

      setNotice('A verification code has been sent to your email. Please enter it below.');
      setShowOtpInput(true);
    } catch (err) {
      const msg = authErrorMessage(err, 'Could not create account.');
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError(msg);
      }
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

    if (!token) return setError('Verification code is required.');
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(token)) {
      return setError(`Verification code must be ${OTP_LENGTH} digits.`);
    }

    try {
      setLoading(true);
      const session = await withTimeout(
        verifySignupApi({
          email,
          token,
        }),
        'Verifying code'
      );

      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        const { error: updateError } = await supabase.auth.updateUser({
          password: form.password,
          data: { full_name: form.name.trim() },
        });

        if (updateError) throw updateError;
      }

      setNotice('Verification successful! Logging you in...');
      const user = await refreshUser();
      if (!user?.monthly_budget || Number(user.monthly_budget) === 0) {
        navigate('/setup', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(authErrorMessage(err, 'Invalid or expired verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setNotice('');
    const email = form.email.trim().toLowerCase();

    try {
      setResendLoading(true);
      await withTimeout(
        resendSignupApi({ email }),
        'Resending verification code'
      );
      setNotice('A new verification code has been sent to your email.');
    } catch (err) {
      setError(authErrorMessage(err, 'Could not resend verification code.'));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d0d1a] px-4 py-10">
      <div className="pointer-events-none absolute -left-24 top-0 h-96 w-96 rounded-full bg-fuchsia-600 bg-opacity-25 blur-[120px] animate-blob" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-purple-600 bg-opacity-25 blur-[120px] animate-blob delay-200" />

      <div className="relative w-full max-w-md animate-fade-in-up rounded-3xl border border-white border-opacity-10 bg-[rgba(255,255,255,0.04)] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-2xl shadow-lg shadow-[rgba(217,70,239,0.4)]">
            AI
          </span>
        </div>
        <h1 className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-purple-400 bg-clip-text text-center text-2xl font-extrabold tracking-tight text-transparent text-glow">
          {showOtpInput ? 'Verify Email' : 'Create Account'}
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          {showOtpInput
            ? `Enter the ${OTP_LENGTH}-digit code sent to ${form.email}`
            : 'Sign up once with your email and password.'}
        </p>

        {showOtpInput ? (
          <form onSubmit={handleOtpSubmit} className="mt-6 space-y-4" autoComplete="off">
            {error && <Alert type="error">{error}</Alert>}
            {notice && <Alert type="success">{notice}</Alert>}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Verification Code</label>
              <input
                type="text"
                name="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                placeholder="12345678"
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                className="w-full text-center tracking-widest text-lg font-bold rounded-lg border border-white border-opacity-10 bg-white bg-opacity-5 px-3 py-2 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg shadow-[rgba(217,70,239,0.3)] transition hover:from-fuchsia-500 hover:to-pink-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify & Register'}
            </button>

            <div className="flex flex-col space-y-2 mt-4 text-center text-sm">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading}
                className="font-semibold text-fuchsia-400 hover:text-fuchsia-300 disabled:opacity-50"
              >
                {resendLoading ? 'Resending...' : 'Resend Verification Code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOtpInput(false);
                  setError('');
                  setNotice('');
                }}
                className="text-slate-400 hover:text-slate-300"
              >
                Back to Sign Up
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" autoComplete="on">
            {error && <Alert type="error">{error}</Alert>}
            {notice && <Alert type="success">{notice}</Alert>}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                placeholder="Your name"
                className="w-full rounded-lg border border-white border-opacity-10 bg-white bg-opacity-5 px-3 py-2 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white border-opacity-10 bg-white bg-opacity-5 px-3 py-2 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="w-full rounded-lg border border-white border-opacity-10 bg-white bg-opacity-5 px-3 py-2 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
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
                className="w-full rounded-lg border border-white border-opacity-10 bg-white bg-opacity-5 px-3 py-2 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg shadow-[rgba(217,70,239,0.3)] transition hover:from-fuchsia-500 hover:to-pink-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Please wait...' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-fuchsia-400 hover:text-fuchsia-300">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
