/**
 * Voice pipeline for ChefMate.
 *
 * STT  → Browser Web Speech API  (SpeechRecognition, works in Chrome)
 * LLM  → RunAnywhere TextGeneration (on-device, loaded in App.tsx)
 * TTS  → Browser SpeechSynthesis  (with RunAnywhere VITS as optional upgrade)
 *
 * Voice-chat loop:
 *   listen → transcript → sendMessage (LLM) → speak response → listen again …
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { TTS } from '@runanywhere/web-onnx';
import { AudioPlayback } from '@runanywhere/web';

export type VoiceMode   = 'off' | 'stt' | 'voice-chat';
export type SpeechState = 'idle' | 'listening' | 'processing' | 'speaking';

interface UseVoiceOptions {
  onTranscript:  (text: string, final: boolean) => void;
  onSendMessage: (text: string) => void;
}

export function useVoice({ onTranscript, onSendMessage }: UseVoiceOptions) {
  const [mode,  setMode]  = useState<VoiceMode>('off');
  const [state, setState] = useState<SpeechState>('idle');

  const continueRef  = useRef(false);
  // modeRef mirrors mode state synchronously so async callbacks see correct value
  const modeRef      = useRef<VoiceMode>('off');
  const recogRef     = useRef<any>(null);
  const playbackRef  = useRef<AudioPlayback | null>(null);
  const stateRef     = useRef<SpeechState>('idle');

  // Always-current refs so SpeechRecognition handlers never see stale closures
  const onTranscriptRef  = useRef(onTranscript);
  const onSendMessageRef = useRef(onSendMessage);
  onTranscriptRef.current  = onTranscript;
  onSendMessageRef.current = onSendMessage;

  /** Update both React state AND the ref synchronously to avoid race conditions. */
  const setStateSafe = useCallback((s: SpeechState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  /** Update mode in both ref (sync) and React state (async). */
  const setModeSafe = useCallback((m: VoiceMode) => {
    modeRef.current = m;
    setMode(m);
  }, []);

  /* ── helpers ── */
  const isTTSLoaded = () => {
    try { return (TTS as any).isVoiceLoaded ?? false; } catch { return false; }
  };

  const stopRecog = () => {
    try { recogRef.current?.stop(); } catch {}
    recogRef.current = null;
  };

  /* ── Stop everything ── */
  const stopAll = useCallback(() => {
    continueRef.current = false;
    modeRef.current = 'off';          // sync — prevents any queued startListeningInner
    stopRecog();
    window.speechSynthesis.cancel();
    playbackRef.current?.stop();
    playbackRef.current = null;
    setStateSafe('idle');
    setMode('off');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStateSafe]);

  /* ── TTS: speak text, then optionally loop ── */
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) {
      if (continueRef.current) setTimeout(() => startListeningInner(true), 400);
      return;
    }

    // Try RunAnywhere on-device TTS first
    if (isTTSLoaded()) {
      try {
        const result = await TTS.synthesize(text, { speed: 0.95 });
        const pb = new AudioPlayback({ sampleRate: result.sampleRate });
        playbackRef.current = pb;
        setStateSafe('speaking');
        await pb.play(result.audioData, result.sampleRate);
        playbackRef.current = null;
        setStateSafe('idle');
        if (continueRef.current) setTimeout(() => startListeningInner(true), 400);
        return;
      } catch (e) {
        console.warn('RunAnywhere TTS failed, using browser TTS:', e);
      }
    }

    // Browser SpeechSynthesis fallback
    window.speechSynthesis.cancel();

    const doSpeak = () => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'en-IN';
      utt.rate = 0.92;
      utt.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const v =
        voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('google')) ||
        voices.find(v => v.lang.startsWith('en-IN')) ||
        voices.find(v => v.lang.startsWith('en'));
      if (v) utt.voice = v;

      utt.onend = () => {
        setStateSafe('idle');
        if (continueRef.current) setTimeout(() => startListeningInner(true), 400);
      };
      utt.onerror = () => {
        setStateSafe('idle');
        if (continueRef.current) setTimeout(() => startListeningInner(true), 600);
      };

      window.speechSynthesis.speak(utt);
      setStateSafe('speaking');
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
    } else {
      doSpeak();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStateSafe]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    playbackRef.current?.stop();
    playbackRef.current = null;
    setStateSafe('idle');
    if (continueRef.current) setTimeout(() => startListeningInner(true), 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setStateSafe]);

  /* ── STT: one utterance via Web Speech API ──
   *
   * fromLoop = true  → called from a setTimeout in the voice-chat loop.
   *                    Requires modeRef !== 'off' AND continueRef === true.
   * fromLoop = false → called directly from toggleSTT / toggleVoiceChat.
   *                    Mode already set by caller; skip the loop guards.
   */
  function startListeningInner(fromLoop = false) {
    // Hard stop: never listen if mode is 'off' (handles all race conditions)
    if (modeRef.current === 'off') return;

    // Loop calls also require continueRef to still be true
    if (fromLoop && !continueRef.current) return;

    if (stateRef.current === 'processing' || stateRef.current === 'speaking') return;

    const Ctor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!Ctor) {
      setStateSafe('idle');
      return;
    }

    stopRecog();

    const recog = new Ctor();
    recog.lang = 'en-IN';
    recog.interimResults = true;
    recog.continuous = false;
    recog.maxAlternatives = 1;
    recogRef.current = recog;

    recog.onresult = (e: any) => {
      // Guard: discard results delivered after stopAll() was called
      if (modeRef.current === 'off') return;

      const result = e.results[e.results.length - 1];
      const transcript = result[0].transcript.trim();
      const isFinal = result.isFinal;

      onTranscriptRef.current(transcript, isFinal);

      if (isFinal) {
        recogRef.current = null;
        setStateSafe('processing');
        onSendMessageRef.current(transcript);
      }
    };

    recog.onnomatch  = () => {
      setStateSafe('idle');
      if (continueRef.current) setTimeout(() => startListeningInner(true), 500);
    };
    recog.onerror    = (e: any) => {
      console.warn('SpeechRecognition error:', e.error);
      setStateSafe('idle');
      if (continueRef.current && e.error !== 'not-allowed') {
        setTimeout(() => startListeningInner(true), 1000);
      }
    };
    recog.onend = () => {
      if (continueRef.current && stateRef.current === 'listening') {
        setTimeout(() => startListeningInner(true), 300);
      }
    };

    try {
      recog.start();
      setStateSafe('listening');
    } catch (e) {
      console.warn('SpeechRecognition start error:', e);
      setStateSafe('idle');
    }
  }

  /* ── STT toggle (mic button — single shot) ── */
  const toggleSTT = useCallback(() => {
    if (state !== 'idle') { stopAll(); return; }
    continueRef.current = false;
    setModeSafe('stt');
    startListeningInner(false);   // direct call — not a loop restart
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, stopAll, setModeSafe]);

  /* ── Voice-chat toggle (headphone — continuous loop) ── */
  const toggleVoiceChat = useCallback(() => {
    if (mode === 'voice-chat') { stopAll(); return; }
    continueRef.current = true;
    setModeSafe('voice-chat');
    startListeningInner(false);   // direct call — not a loop restart
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, stopAll, setModeSafe]);

  const exitVoiceChat = useCallback(() => stopAll(), [stopAll]);

  /** Restart listening after LLM error in voice-chat mode. */
  const restartListening = useCallback(() => {
    if (continueRef.current) {
      setTimeout(() => startListeningInner(true), 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  return {
    supported: !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    ),
    mode,
    state,
    toggleSTT,
    toggleVoiceChat,
    exitVoiceChat,
    speak,
    stopSpeaking,
    setState: setStateSafe,
    restartListening,
  };
}
