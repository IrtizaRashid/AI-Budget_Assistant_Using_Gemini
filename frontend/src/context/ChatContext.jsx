// ChatContext — holds the AI conversation state ABOVE the router so it
// survives page navigation, and restores the latest session from the backend
// on load / refresh. This is what makes the assistant behave like ChatGPT:
// the conversation continues seamlessly across Dashboard → Loans → AI, and a
// browser refresh reloads the messages instead of losing them.
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import {
  getLatestSession,
  listSessions,
  createSession,
  getSessionMessages,
  deleteSession,
} from '../services/chatService.js';

const GREETING = {
  role: 'assistant',
  text: 'Hi! Try "I spent 500 on pizza" or "How much budget is left?"',
};

// Map a stored {role, content} row to the ChatBox UI message shape.
const toUiMessage = (m) => ({
  role: m.role === 'user' ? 'user' : 'assistant',
  text: m.content,
});

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([GREETING]);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [initialized, setInitialized] = useState(false);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await listSessions());
    } catch {
      /* non-fatal */
    }
  }, []);

  // Restore the most recent conversation whenever the user changes (login /
  // refresh). Runs once per authenticated user.
  useEffect(() => {
    if (!user) {
      setSessionId(null);
      setMessages([GREETING]);
      setSessions([]);
      setInitialized(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { session, messages: msgs } = await getLatestSession();
        if (cancelled) return;
        if (session) {
          setSessionId(session.id);
          setMessages(msgs?.length ? msgs.map(toUiMessage) : [GREETING]);
        }
        await refreshSessions();
      } catch {
        /* keep default greeting */
      } finally {
        if (!cancelled) setInitialized(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, refreshSessions]);

  // Start a fresh conversation (old ones stay in history).
  const newChat = useCallback(async () => {
    try {
      const { session } = await createSession();
      setSessionId(session.id);
      setMessages([GREETING]);
      await refreshSessions();
      return session.id;
    } catch {
      setSessionId(null);
      setMessages([GREETING]);
      return null;
    }
  }, [refreshSessions]);

  // Reopen a previous conversation from the history sidebar.
  const loadSession = useCallback(async (id) => {
    try {
      const { session, messages: msgs } = await getSessionMessages(id);
      setSessionId(session.id);
      setMessages(msgs?.length ? msgs.map(toUiMessage) : [GREETING]);
    } catch {
      /* ignore */
    }
  }, []);

  // Delete a conversation from the history sidebar.
  const deleteSessionHandler = useCallback(async (id) => {
    try {
      await deleteSession(id);
      await refreshSessions();
      // If we deleted the current session, start a new chat
      if (sessionId === id) {
        await newChat();
      }
    } catch {
      /* ignore */
    }
  }, [sessionId, refreshSessions, newChat]);

  return (
    <ChatContext.Provider
      value={{
        sessionId,
        setSessionId,
        messages,
        setMessages,
        loading,
        setLoading,
        sessions,
        refreshSessions,
        newChat,
        loadSession,
        deleteSession: deleteSessionHandler,
        initialized,
        GREETING,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
