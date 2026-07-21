import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase.js';
import { forgotPasswordApi, verifyPasswordResetApi } from '../services/api.js';
import { authErrorMessage } from '../utils/authErrors.js';
import Alert from '../components/Alert.jsx';

const MIN_PASSWORD_LENGTH = 6;
const OTP_LENGTH = 8;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showResetForm, setShowResetForm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!cleanEmail) return setError('Email address is required.');

    try {
      setLoading(true);
      await forgotPasswordApi({ email: cleanEmail });
      setShowResetForm(true);
      setNotice('Password reset code sent. Check your email and enter the code below.');
    } catch (err) {
      setError(authErrorMessage(err, 'Could not send reset code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const token = otp.trim();
    if (!token) return setError('Reset code is required.');
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(token)) {
      return setError(`Reset code must be ${OTP_LENGTH} digits.`);
    }
    if (!form.password) return setError('Password is required.');
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');

    try {
      setLoading(true);
      const session = await verifyPasswordResetApi({ email: cleanEmail, token });

      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: form.password,
      });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      setNotice('Password updated. You can sign in with your new password now.');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(authErrorMessage(err, 'Invalid or expired reset code.'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
          Reset Password
        </h1>
        <p className="mt-1 text-center text-sm text-slate-400">
          {showResetForm
            ? `Enter the ${OTP_LENGTH}-digit code sent to ${cleanEmail}.`
            : 'Enter your email and we will send a reset code.'}
        </p>

        <form onSubmit={showResetForm ? handleResetPassword : handleSendCode} className="mt-6 space-y-4" autoComplete="on">
          {error && <Alert type="error">{error}</Alert>}
          {notice && <Alert type="success">{notice}</Alert>}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={showResetForm}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white border-opacity-10 bg-white bg-opacity-5 px-3 py-2 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500 disabled:opacity-70"
            />
          </div>

          {showResetForm && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Reset Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                  inputMode="numeric"
                  maxLength={OTP_LENGTH}
                  placeholder="12345678"
                  className="w-full rounded-lg border border-white border-opacity-10 bg-white bg-opacity-5 px-3 py-2 text-center text-lg font-bold tracking-widest text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">New Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handlePasswordChange}
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
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className="w-full rounded-lg border border-white border-opacity-10 bg-white bg-opacity-5 px-3 py-2 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg shadow-[rgba(217,70,239,0.3)] transition hover:from-fuchsia-500 hover:to-pink-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Please wait...' : showResetForm ? 'Update Password' : 'Send Reset Code'}
          </button>

          {showResetForm && (
            <button
              type="button"
              onClick={handleSendCode}
              disabled={loading}
              className="w-full text-sm font-semibold text-fuchsia-400 hover:text-fuchsia-300 disabled:opacity-50"
            >
              Resend reset code
            </button>
          )}

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
