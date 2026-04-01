import { useState, useEffect, useRef, useCallback } from 'react';

export interface TimerState {
  active: boolean;
  seconds: number;
  totalSeconds: number;
  label: string;
  done: boolean;
}

const INITIAL: TimerState = { active: false, seconds: 0, totalSeconds: 0, label: '', done: false };

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
    // Close context after playback to avoid browser AudioContext limit (~6 concurrent)
    osc.onended = () => { ctx.close().catch(() => {}); };
  } catch { /* ignore */ }
}

export function useTimer() {
  const [timer, setTimer] = useState<TimerState>(INITIAL);
  const intervalRef = useRef<number | null>(null);

  const clearInterval_ = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback((seconds: number, label: string) => {
    clearInterval_();
    setTimer({ active: true, seconds, totalSeconds: seconds, label, done: false });
    intervalRef.current = window.setInterval(() => {
      setTimer(prev => {
        if (!prev.active) return prev;
        if (prev.seconds <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          beep();
          return { ...prev, active: false, seconds: 0, done: true };
        }
        return { ...prev, seconds: prev.seconds - 1 };
      });
    }, 1000);
  }, [clearInterval_]);

  const stopTimer = useCallback(() => {
    clearInterval_();
    setTimer(prev => ({ ...prev, active: false }));
  }, [clearInterval_]);

  const resetTimer = useCallback(() => {
    clearInterval_();
    setTimer(INITIAL);
  }, [clearInterval_]);

  useEffect(() => () => clearInterval_(), [clearInterval_]);

  return { timer, startTimer, stopTimer, resetTimer };
}
