// Chat history sidebar — lists past conversations grouped by recency
// (Today / Yesterday / Last 7 Days / Last Month / Older), with a New Chat
// button. Clicking a conversation reopens it in the chat window.
import { useChat } from '../context/ChatContext.jsx';

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
  const { sessions, sessionId, loadSession, newChat } = useChat();

  // Group sessions preserving the backend's newest-first order.
  const groups = {};
  for (const s of sessions) {
    const g = groupFor(s.last_activity);
    (groups[g] ||= []).push(s);
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm">
      <div className="border-b border-white/10 p-3">
        <button
          onClick={() => newChat()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow shadow-fuchsia-500/30 transition hover:from-fuchsia-500 hover:to-pink-500 active:scale-[0.98]"
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
                <button
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  className={`w-full truncate rounded-lg px-3 py-2 text-left text-xs transition ${
                    s.id === sessionId
                      ? 'bg-fuchsia-500/20 text-white'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                  title={s.title}
                >
                  {s.title || 'New chat'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
