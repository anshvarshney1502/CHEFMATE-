import { useState, useCallback, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ChatArea } from './ChatArea';
import { InputBar } from './InputBar';
import { VoiceModal } from './VoiceModal';
import { ShareModal } from './ShareModal';
import { useTheme } from '../hooks/useTheme';
import { useTimer } from '../hooks/useTimer';
import { useGrocery } from '../hooks/useGrocery';
import { useSessions } from '../hooks/useSessions';
import { useVoice } from '../hooks/useVoice';
import { generateLocally, type ChatMessage } from '../utils/api';
import { detectLanguage } from '../utils/detectLanguage';
import { detectTimerFromText, parseRecipe, type ParsedRecipe } from '../utils/parseRecipe';
import '../styles/index.css';

/* ── System Prompts ── */
const PROMPT_EN = `You are ChefMate, a friendly Indian cooking assistant. Always suggest Indian-style recipes using Indian spices and cooking methods. Reply in English only.

For a NEW recipe request use EXACTLY this format:
[One warm sentence about the Indian dish.]
Ingredients: item1, item2, item3, item4, item5
Steps:
1. First action here.
2. Second action here.
3. Third action here.
4. Fourth action here.
5. Final action here.

For a FOLLOW-UP question (e.g. "make it spicier", "substitute X", "how long to cook") give a short plain-text answer of 2-3 sentences. No need for the full recipe format.

Rules: no asterisks, no markdown, plain text only. Always use Indian spices like turmeric, cumin, coriander, garam masala where relevant.`;

const PROMPT_HI = `You are ChefMate, ek friendly Indian cooking assistant. Hamesha Indian style recipes suggest karo with Indian masale aur cooking methods. Hinglish mein reply karo.

Naya recipe request ke liye EXACTLY yahi format:
[Ek warm sentence Indian dish ke baare mein.]
Ingredients: cheez1, cheez2, cheez3, cheez4, cheez5
Steps:
1. Pehla kaam yahan.
2. Doosra kaam yahan.
3. Teesra kaam yahan.
4. Chautha kaam yahan.
5. Aakhri kaam yahan.

Follow-up sawaal ke liye (jaise "aur spicy karo", "X ki jagah kya use karein", "kitni der pakana hai") sirf 2-3 sentences mein jawab do. Poora recipe format zaroori nahi.

Rules: no asterisks, no markdown, plain text only. Hamesha Indian masale jaise haldi, jeera, dhania, garam masala daalo.`;

export function VoiceTab() {
  const { theme, toggleTheme } = useTheme();
  const { timer, startTimer, stopTimer, resetTimer } = useTimer();
  const { items: groceryItems, addGroceryItems, toggleGroceryItem, clearAll: clearGrocery } = useGrocery();
  const {
    sessions, activeSession, activeId,
    newSession, switchSession, deleteSession,
    addMessage, updateMessage,
    saveMessageAsRecipe, savedRecipes, deleteSaved,
  } = useSessions();

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [shareText, setShareText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResponse, setVoiceResponse] = useState('');
  const [voiceParsed, setVoiceParsed] = useState<ParsedRecipe | null>(null);
  const lastUserMsgRef       = useRef('');
  const voiceRef             = useRef<ReturnType<typeof useVoice> | null>(null);
  // Separate conversation history for voice chat — resets on every open (fresh start)
  const voiceChatHistoryRef  = useRef<ChatMessage[]>([]);

  /* ── Stop voice when switching / creating sessions ── */
  useEffect(() => {
    voice.exitVoiceChat();
    setShowVoiceModal(false);
    setVoiceTranscript('');
    setVoiceResponse('');
    setVoiceParsed(null);
  // voice is stable (useCallback refs), activeId change is the trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  /* ── Online/offline detection ── */
  useEffect(() => {
    const up = () => setIsOnline(true);
    const dn = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', dn);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn); };
  }, []);

  /* ── Mobile detection ── */
  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener('resize', handler);
    if (window.innerWidth <= 768) setSidebarOpen(false);
    return () => window.removeEventListener('resize', handler);
  }, []);

  /* ── Theme root attr ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /* ── Send message ── */
  const sendMessage = useCallback(async (text?: string, fromVoice = false) => {
    const content = (text ?? input).trim();
    if (!content || isSending) return;

    setInput('');
    setErrorMsg(null);
    setIsSending(true);
    lastUserMsgRef.current = content;

    addMessage(activeId, { role: 'user', text: content, timestamp: new Date() });

    const aiMsgId = addMessage(activeId, {
      role: 'assistant',
      text: '',
      timestamp: new Date(),
      streaming: true,
    });

    const lang = detectLanguage(content);
    const systemPrompt = lang === 'hinglish' ? PROMPT_HI : PROMPT_EN;

    // Voice chat gets a fresh context each session; regular chat uses session history
    const history: ChatMessage[] = fromVoice
      ? [...voiceChatHistoryRef.current, { role: 'user' as const, content }]
      : [
          ...activeSession.messages.slice(-10).map(m => ({ role: m.role as 'user' | 'assistant', content: m.text })),
          { role: 'user' as const, content },
        ];

    let fullText = '';
    let genError = '';

    try {
      await generateLocally(
        history,
        systemPrompt,
        (token: string) => {
          fullText += token;
          updateMessage(activeId, aiMsgId, fullText, true);
        },
        () => {
          updateMessage(activeId, aiMsgId, fullText, false);
          setVoiceResponse(fullText);
          setVoiceParsed(parseRecipe(fullText));
          if (fromVoice) {
            // Grow voice history so multi-turn context works within a session
            voiceChatHistoryRef.current = [
              ...voiceChatHistoryRef.current,
              { role: 'user' as const, content },
              { role: 'assistant' as const, content: fullText },
            ];
            voiceRef.current?.speak(fullText);
          }
        },
        (err: string) => {
          genError = err;
          updateMessage(activeId, aiMsgId, `Error: ${err}`, false);
        },
      );
    } finally {
      // Always re-enable the input regardless of success / error / hang
      setIsSending(false);
      if (genError) setErrorMsg(genError);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isSending, activeId, activeSession.messages, addMessage, updateMessage]);

  /* ── Voice ── */
  const voice = useVoice({
    onTranscript: (text, final) => {
      setInput(text);
      if (final) setVoiceTranscript(text);
    },
    onSendMessage: (text) => {
      setVoiceTranscript(text);
      setVoiceResponse('');
      setVoiceParsed(null);

      // ── Timer voice commands — handled directly, no LLM call needed ──
      if (/\b(stop|cancel|end|dismiss)\s+(the\s+)?timer\b/i.test(text)) {
        resetTimer();
        voiceRef.current?.speak('Timer stopped.');
        return;
      }

      const timerInfo = detectTimerFromText(text);
      if (timerInfo && /\b(set|start|add)\s+(a\s+)?timer\b|timer\s+(for|of)\b/i.test(text)) {
        startTimer(timerInfo.seconds, timerInfo.label);
        voiceRef.current?.speak(`Timer set for ${timerInfo.label}.`);
        return;
      }

      // ── Regular recipe / follow-up message ──
      sendMessage(text, true);
    },
  });
  voiceRef.current = voice; // always keep ref current so sendMessage can access it

  const handleToggleVoiceChat = () => {
    if (voice.mode === 'voice-chat') {
      voice.toggleVoiceChat();
      setShowVoiceModal(false);
    } else {
      // Fresh start every time voice chat opens
      voiceChatHistoryRef.current = [];
      setVoiceTranscript('');
      setVoiceResponse('');
      setVoiceParsed(null);
      voice.toggleVoiceChat();
      setShowVoiceModal(true);
    }
  };

  /* ── Copy full chat ── */
  const copyFullChat = () => {
    const text = activeSession.messages
      .map(m => `${m.role === 'user' ? 'You' : 'ChefMate'}: ${m.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
  };

  /* ── Set timer from message ── */
  const handleSetTimer = (text: string) => {
    const info = detectTimerFromText(text);
    if (info) startTimer(info.seconds, info.label);
  };

  /* ── Speak text ── */
  const handleSpeak = (text: string) => {
    voice.speak(text);
  };

  const hasError = !!errorMsg;

  return (
    <div className="chefmate-root" data-theme={theme}>
      <Sidebar
        open={sidebarOpen}
        sessions={sessions}
        activeId={activeId}
        savedRecipes={savedRecipes}
        groceryItems={groceryItems}
        onNewChat={newSession}
        onSelectSession={switchSession}
        onDeleteSession={deleteSession}
        onDeleteSaved={deleteSaved}
        onToggleGrocery={toggleGroceryItem}
        onClearGrocery={clearGrocery}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />

      <div className="main-area">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          sessionTitle={activeSession?.title ?? 'New Chat'}
          theme={theme}
          onToggleTheme={toggleTheme}
          timer={timer}
          onStopTimer={stopTimer}
          onResetTimer={resetTimer}
          isOnline={isOnline}
          onCopyChat={copyFullChat}
        />

        {hasError && (
          <div className="error-banner">
            <span>⚠️</span>
            <span className="error-banner-text">{errorMsg}</span>
            <button className="error-retry" onClick={() => sendMessage(lastUserMsgRef.current)}>
              Retry
            </button>
          </div>
        )}

        <ChatArea
          session={activeSession}
          onQuickChip={(q) => sendMessage(q)}
          onCopy={(text) => navigator.clipboard.writeText(text)}
          onSpeak={handleSpeak}
          onSave={saveMessageAsRecipe}
          onShare={(text) => setShareText(text)}
          onSetTimer={handleSetTimer}
          onAddGrocery={addGroceryItems}
        />

        <InputBar
          value={input}
          onChange={setInput}
          onSend={() => sendMessage()}
          onToggleSTT={voice.toggleSTT}
          onToggleVoiceChat={handleToggleVoiceChat}
          isListening={voice.state === 'listening'}
          isVoiceChatActive={voice.mode === 'voice-chat'}
          isSending={isSending}
          voiceSupported={voice.supported}
          isSpeaking={voice.state === 'speaking'}
          onStopSpeak={voice.stopSpeaking}
        />
      </div>

      {showVoiceModal && (
        <VoiceModal
          state={voice.state}
          transcript={voiceTranscript}
          response={voiceResponse}
          parsedRecipe={voiceParsed}
          timer={timer}
          onStopTimer={stopTimer}
          onStop={voice.stopSpeaking}
          onClose={() => { setShowVoiceModal(false); voice.exitVoiceChat(); }}
        />
      )}

      {shareText && (
        <ShareModal
          text={shareText}
          onClose={() => setShareText(null)}
        />
      )}
    </div>
  );
}
