import { useState } from 'react';
import { X } from 'lucide-react';

interface TimerSetModalProps {
  onStart: (seconds: number, label: string) => void;
  onClose: () => void;
}

const PRESETS = [
  { label: '2 min',  s: 120 },
  { label: '5 min',  s: 300 },
  { label: '10 min', s: 600 },
  { label: '15 min', s: 900 },
  { label: '20 min', s: 1200 },
  { label: '30 min', s: 1800 },
];

export function TimerSetModal({ onStart, onClose }: TimerSetModalProps) {
  const [minutes, setMinutes] = useState(5);
  const [secs, setSecs] = useState(0);
  const [selected, setSelected] = useState<number | null>(300);

  const applyPreset = (s: number) => {
    setSelected(s);
    setMinutes(Math.floor(s / 60));
    setSecs(s % 60);
  };

  const handleMinutes = (v: number) => {
    setSelected(null);
    setMinutes(Math.max(0, Math.min(99, v)));
  };

  const handleSecs = (v: number) => {
    setSelected(null);
    setSecs(Math.max(0, Math.min(59, v)));
  };

  const total = minutes * 60 + secs;

  const handleStart = () => {
    if (total <= 0) return;
    const label = secs > 0
      ? `${minutes}m ${secs}s`
      : `${minutes} min`;
    onStart(total, label);
    onClose();
  };

  return (
    <div className="timer-set-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="timer-set-modal">
        <button className="timer-set-close" onClick={onClose}><X size={13} /></button>

        <div className="timer-set-title">⏱ Set Timer</div>

        {/* Presets */}
        <div className="timer-presets">
          {PRESETS.map(p => (
            <button
              key={p.s}
              className={`timer-preset-btn${selected === p.s ? ' selected' : ''}`}
              onClick={() => applyPreset(p.s)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom inputs */}
        <div className="timer-custom">
          <div className="timer-input-group">
            <input
              type="number"
              min={0}
              max={99}
              value={minutes}
              onChange={e => handleMinutes(parseInt(e.target.value) || 0)}
            />
            <span>min</span>
          </div>
          <span className="timer-colon">:</span>
          <div className="timer-input-group">
            <input
              type="number"
              min={0}
              max={59}
              value={secs}
              onChange={e => handleSecs(parseInt(e.target.value) || 0)}
            />
            <span>sec</span>
          </div>
        </div>

        <button className="timer-start-btn" onClick={handleStart} disabled={total <= 0}>
          Start Timer
        </button>
      </div>
    </div>
  );
}
