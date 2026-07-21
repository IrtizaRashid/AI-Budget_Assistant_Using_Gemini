import { useRef, useState, useEffect } from 'react';

// Microphone button that uses the browser's Web Speech API to turn speech
// into text. It does NOT talk to the backend — it just hands the recognized
// transcript to the parent (ChatBox) via onResult, which sends it like any
// typed message.
//
// Props:
//   onResult : (transcript: string) => void   called with the final transcript
//   onError  : (message: string) => void      friendly error message
//   disabled : boolean                          disable while a request is in flight

// Build a configured SpeechRecognition instance, or null if unsupported.
const createRecognition = () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false; // we only want the final result
  recognition.continuous = false; // stop automatically after one phrase
  recognition.maxAlternatives = 1;
  return recognition;
};

// Map raw SpeechRecognition error codes to friendly messages.
const ERROR_MESSAGES = {
  'not-allowed': 'Microphone permission denied. Please allow mic access and try again.',
  'service-not-allowed': 'Microphone permission denied. Please allow mic access.',
  'no-speech': "I didn't catch that. Please try speaking again.",
  'audio-capture': 'No microphone found. Please connect a microphone.',
  network: 'Network error during speech recognition. Please try again.',
};

export default function VoiceInput({ onResult, onError, disabled }) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  // Detect browser support once on mount.
  useEffect(() => {
    setSupported(
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }, []);

  // Stop any in-progress recognition when the component unmounts.
  useEffect(() => {
    return () => recognitionRef.current?.abort?.();
  }, []);

  const startListening = () => {
    const recognition = createRecognition();
    if (!recognition) {
      setSupported(false);
      onError?.('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) onResult?.(transcript);
    };

    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === 'aborted') return; // user cancelled — no message
      onError?.(ERROR_MESSAGES[event.error] || 'Voice input failed. Please try again.');
    };

    recognition.onend = () => setListening(false);

    try {
      recognition.start();
    } catch {
      // start() throws if already started — safe to ignore.
    }
  };

  const stopListening = () => recognitionRef.current?.stop();

  const handleClick = () => {
    if (disabled) return;
    if (!supported) {
      onError?.('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    listening ? stopListening() : startListening();
  };

  return (
    <div className="relative">
      {/* Floating "Listening…" indicator above the button */}
      {listening && (
        <div className="absolute -top-9 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-red-500 bg-opacity-20 px-3 py-1 text-xs font-medium text-red-300 ring-1 ring-red-500 ring-opacity-40">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Listening…
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || !supported}
        title={supported ? 'Speak your message' : 'Voice not supported in this browser'}
        aria-label="Voice input"
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40 ${
          listening
            ? 'bg-red-500 bg-opacity-20 text-red-400 ring-2 ring-red-500 ring-opacity-50'
            : 'border border-white border-opacity-10 bg-white bg-opacity-5 text-slate-300 hover:bg-white hover:bg-opacity-10'
        }`}
      >
        {/* Pulsing ring while listening */}
        {listening && (
          <span className="absolute inset-0 animate-ping rounded-xl bg-red-500 bg-opacity-20" />
        )}

        {/* Microphone icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative h-5 w-5"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
    </div>
  );
}
