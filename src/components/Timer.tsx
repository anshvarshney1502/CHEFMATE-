import React from 'react';
import type { TimerState } from '../hooks/useTimer';

interface TimerProps {
  timer: TimerState;
  onStop: () => void;
  onReset: () => void;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export function Timer({ timer, onStop, onReset }: TimerProps) {
  if (!timer.active && !timer.done && timer.totalSeconds === 0) return null;

  const mm = Math.floor(timer.seconds / 60);
  const ss = timer.seconds % 60;

  return (
    <div className="timer-pill" title={timer.label}>
      <span style={{ fontSize: 14 }}>⏱</span>
      {timer.done ? (
        <span className="timer-done">✓ Done!</span>
      ) : (
        <>
          <span className="timer-display">{pad(mm)}:{pad(ss)}</span>
          <span className="timer-label">{timer.label}</span>
        </>
      )}
      <div className="timer-controls">
        {timer.active && (
          <button className="timer-btn stop" onClick={onStop} title="Stop timer">■</button>
        )}
        <button className="timer-btn" onClick={onReset} title="Reset timer">↺</button>
      </div>
    </div>
  );
}
