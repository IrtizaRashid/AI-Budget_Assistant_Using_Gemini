// Chat history sidebar — lists past conversations grouped by recency
// (Today / Yesterday / Last 7 Days / Last Month / Older), with a New Chat
// button. Clicking a conversation reopens it in the chat window.
import { useChat } from '../context/ChatContext.jsx';
import { useState } from 'react';

// Bucket a session's last_activity into a human-friendly group.
const groupFor = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 86400000;
  const diffDays = Math.floor((startOfToday - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / dayMs);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Last 7 Days';
  if (diffDays <= 31) return 'Last Month';
  return 'Older';
};

const GROUP_ORDER = ['Today', 'Yesterday', 'Last 7 Days', 'Last Month', 'Older'];

export default function ChatHistorySidebar() {
  const { sessions, sessionId, loadSession, newChat, deleteSession } = useChat();
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    if (deleteConfirm === sessionId) {
      await deleteSession(sessionId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(sessionId);
    }
  };

  const handleLoad = (id) => {
    if (deleteConfirm !== null) setDeleteConfirm(null);
    loadSession(id);
  };

  // Group sessions preserving the backend's newest-first order.
  const groups = {};
  for (const s of sessions) {
    const g = groupFor(s.last_activity);
    (groups[g] ||= []).push(s);
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white border-opacity-10 bg-white bg-opacity-4 backdrop-blur-sm">
      <div className="border-b border-white border-opacity-10 p-3">
        <button
          onClick={() => newChat()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow shadow-[rgba(217,70,239,0.3)] transition hover:from-fuchsia-500 hover:to-pink-500 active:scale-[0.98]"
        >
          <span className="text-base leading-none">＋</span> New Chat
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {sessions.length === 0 && (
          <p className="px-1 py-4 text-center text-xs text-slate-500">
            No conversations yet.
          </p>
        )}
        {GROUP_ORDER.filter((g) => groups[g]?.length).map((g) => (
          <div key={g}>
            <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {g}
            </p>
            <div className="space-y-1">
              {groups[g].map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-1 rounded-lg transition ${
                    s.id === sessionId
                      ? 'bg-fuchsia-500 bg-opacity-20'
                      : 'hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  <button
                    onClick={() => handleLoad(s.id)}
                    className={`flex-1 truncate rounded-lg px-3 py-2 text-left text-xs transition ${
                      s.id === sessionId
                        ? 'text-white'
                        : 'text-slate-300'
                    }`}
                    title={s.title}
                  >
                    {s.title || 'New chat'}
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    className="rounded-lg px-2 py-2 text-xs text-slate-400 hover:text-red-400 hover:bg-white hover:bg-opacity-5 transition"
                    title={deleteConfirm === s.id ? 'Confirm delete' : 'Delete chat'}
                  >
                    {deleteConfirm === s.id ? '✓' : '×'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
