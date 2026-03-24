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
  const recogRef     = useRef<any>(null);
  const playbackRef  = useRef<AudioPlayback | null>(null);
  const stateRef     = useRef<SpeechState>('idle');

  // Always-current refs so SpeechRecognition handlers never see stale closures
  const onTranscriptRef  = useRef(onTranscript);
  const onSendMessageRef = useRef(onSendMessage);
  onTranscriptRef.current  = onTranscript;
  onSendMessageRef.current = onSendMessage;

  // Keep stateRef in sync so async callbacks read current value
  useEffect(() => { stateRef.current = state; }, [state]);

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
    stopRecog();
    window.speechSynthesis.cancel();
    playbackRef.current?.stop();
    playbackRef.current = null;
    setState('idle');
    setMode('off');
  }, []);

  /* ── TTS: speak text, then optionally loop ── */
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Try RunAnywhere on-device TTS first
    if (isTTSLoaded()) {
      try {
        const result = await TTS.synthesize(text, { speed: 0.95 });
        const pb = new AudioPlayback({ sampleRate: result.sampleRate });
        playbackRef.current = pb;
        setState('speaking');
        await pb.play(result.audioData, result.sampleRate);
        playbackRef.current = null;
        setState('idle');
        if (continueRef.current) setTimeout(startListeningInner, 400);
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
        setState('idle');
        if (continueRef.current) setTimeout(startListeningInner, 400);
      };
      utt.onerror = () => setState('idle');

      window.speechSynthesis.speak(utt);
      setState('speaking');
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
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    playbackRef.current?.stop();
    playbackRef.current = null;
    setState('idle');
    // Restart listening if in voice-chat loop
    if (continueRef.current) setTimeout(startListeningInner, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── STT: one utterance via Web Speech API ── */
  function startListeningInner() {
    if (!continueRef.current && stateRef.current !== 'idle') return;

    const Ctor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!Ctor) {
      setState('idle');
      return;
    }

    stopRecog();

    const recog = new Ctor();
    recog.lang = 'en-IN';          // handles English + Hinglish
    recog.interimResults = true;
    recog.continuous = false;
    recog.maxAlternatives = 1;
    recogRef.current = recog;

    recog.onresult = (e: any) => {
      const result = e.results[e.results.length - 1];
      const transcript = result[0].transcript.trim();
      const isFinal = result.isFinal;

      onTranscriptRef.current(transcript, isFinal);

      if (isFinal) {
        recogRef.current = null;
        setState('processing');
        onSendMessageRef.current(transcript);
        // Loop restart is triggered by speak() → onEnd
      }
    };

    recog.onnomatch  = () => { setState('idle'); if (continueRef.current) setTimeout(startListeningInner, 500); };
    recog.onerror    = (e: any) => {
      console.warn('SpeechRecognition error:', e.error);
      setState('idle');
      if (continueRef.current && e.error !== 'not-allowed') {
        setTimeout(startListeningInner, 1000);
      }
    };
    recog.onend = () => {
      // If no result fired (silence / brief noise), restart
      if (continueRef.current && stateRef.current === 'listening') {
        setTimeout(startListeningInner, 300);
      }
    };

    try {
      recog.start();
      setState('listening');
    } catch (e) {
      console.warn('SpeechRecognition start error:', e);
      setState('idle');
    }
  }

  /* ── STT toggle (mic button — single shot) ── */
  const toggleSTT = useCallback(() => {
    if (state !== 'idle') { stopAll(); return; }
    continueRef.current = false;
    setMode('stt');
    startListeningInner();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, stopAll]);

  /* ── Voice-chat toggle (headphone — continuous loop) ── */
  const toggleVoiceChat = useCallback(() => {
    if (mode === 'voice-chat') { stopAll(); return; }
    continueRef.current = true;
    setMode('voice-chat');
    startListeningInner();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, stopAll]);

  const exitVoiceChat = useCallback(() => stopAll(), [stopAll]);

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
    setState,
  };
}
