import { asyncHandler } from '../middleware/asyncHandler.js';
import * as authService from '../services/authService.js';
import { config, hasSystemGeminiKeys } from '../config/env.js';

const supabaseAuthRequest = async (path, body) => {
  const url = `${config.supabase.url.replace(/\/$/, '')}/auth/v1${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: config.supabase.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.msg || data.message || data.error_description || data.error || 'Supabase Auth request failed.';
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
};

const sendSignupOtp = (email, name) =>
  supabaseAuthRequest('/otp', {
    email,
    create_user: true,
    data: { full_name: name },
  });

const sendLoginOtp = (email) =>
  supabaseAuthRequest('/otp', {
    email,
    create_user: false,
  });

export const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'name, email, and password are required.' });
  }

  try {
    const data = await sendSignupOtp(email, name);
    return res.status(200).json({ success: true, user: data.user || null });
  } catch (error) {
    const message = String(error.message || '');
    const canTryResend =
      error.status === 504 ||
      message.toLowerCase().includes('already registered') ||
      message.toLowerCase().includes('already exists');

    if (canTryResend) {
      try {
        await sendSignupOtp(email, name);
        return res.status(200).json({
          success: true,
          resent: true,
          message: 'A verification code has been sent if this email can receive signup confirmations.',
        });
      } catch (resendError) {
        return res.status(resendError.status || error.status || 502).json({
          error: resendError.message || error.message,
          details: resendError.payload || error.payload,
        });
      }
    }

    return res.status(error.status || 502).json({ error: error.message, details: error.payload });
  }
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  try {
    const data = await supabaseAuthRequest('/token?grant_type=password', { email, password });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message, details: error.payload });
  }
});

export const verifySignup = asyncHandler(async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) {
    return res.status(400).json({ error: 'email and token are required.' });
  }

  try {
    const data = await supabaseAuthRequest('/verify', { email, token, type: 'email' });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message, details: error.payload });
  }
});

export const sendLoginCode = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'email is required.' });
  }

  try {
    const data = await sendLoginOtp(email);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message, details: error.payload });
  }
});

export const verifyLoginCode = asyncHandler(async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) {
    return res.status(400).json({ error: 'email and token are required.' });
  }

  try {
    const data = await supabaseAuthRequest('/verify', { email, token, type: 'email' });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message, details: error.payload });
  }
});

export const resendSignup = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'email is required.' });
  }

  try {
    const data = await sendSignupOtp(email);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message, details: error.payload });
  }
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'email is required.' });
  }

  try {
    const data = await supabaseAuthRequest('/recover', { email });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message, details: error.payload });
  }
});

export const verifyPasswordReset = asyncHandler(async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) {
    return res.status(400).json({ error: 'email and token are required.' });
  }

  try {
    const data = await supabaseAuthRequest('/verify', { email, token, type: 'recovery' });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message, details: error.payload });
  }
});

export const logout = asyncHandler(async (req, res) => {
  res.status(200).json({ message: 'Logout successful' });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const user = await authService.getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { gemini_api_key, ...safeUser } = user;
  res.status(200).json({
    user: {
      ...safeUser,
      hasGeminiKey: Boolean(gemini_api_key) || hasSystemGeminiKeys,
    },
  });
});
