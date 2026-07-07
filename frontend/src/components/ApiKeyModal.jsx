import { useState } from 'react';
import { saveGeminiKey } from '../services/api.js';

export default function ApiKeyModal({ open, reason, onSaved, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('Paste your Gemini API key first.');
      return;
    }

    try {
      setSaving(true);
      await saveGeminiKey(apiKey.trim());
      setApiKey('');
      onSaved?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the key.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#120a20] p-6 shadow-2xl"
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Gemini API Key</h2>
          <p className="mt-1 text-sm text-slate-400">
            {reason || 'Add your own Gemini key so the AI assistant can run on your account.'}
          </p>
        </div>

        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="mb-4 inline-flex text-sm font-semibold text-fuchsia-300 hover:text-fuchsia-200"
        >
          Get your free key
        </a>

        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste Gemini API key"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-slate-500 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
        />

        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
            >
              Later
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Key'}
          </button>
        </div>
      </form>
    </div>
  );
}
