import { Timer } from './Timer';
import type { TimerState } from '../hooks/useTimer';
import { Sun, Moon, Copy, WifiOff, ChefHat } from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  sessionTitle: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  timer: TimerState;
  onStopTimer: () => void;
  onResetTimer: () => void;
  isOnline: boolean;
  onCopyChat: () => void;
}

export function Header({
  sidebarOpen,
  onToggleSidebar,
  sessionTitle,
  theme,
  onToggleTheme,
  timer,
  onStopTimer,
  onResetTimer,
  isOnline,
  onCopyChat,
}: HeaderProps) {
  return (
    <header className="header">
      <button
        className={`hamburger${sidebarOpen ? ' open' : ''}`}
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      <div className="header-brand">
        <ChefHat size={16} className="header-brand-icon" strokeWidth={1.8} />
        <span className="header-wordmark">ChefMate</span>
      </div>

      <span className="header-session-title">
        {sessionTitle !== 'New Chat' ? sessionTitle : ''}
      </span>

      {/* Timer */}
      {(timer.active || timer.done) && (
        <Timer timer={timer} onStop={onStopTimer} onReset={onResetTimer} />
      )}

      <div className="header-actions">
        {!isOnline && (
          <span className="offline-badge flex items-center gap-1.5">
            <WifiOff size={11} />
            Offline
          </span>
        )}

        <button
          className="header-btn copy-chat"
          onClick={onCopyChat}
          title="Copy full chat"
        >
          <Copy size={14} />
        </button>

        <button
          className="header-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <div className="live-indicator" title="AI ready">
          <span className="live-dot" />
        </div>
      </div>
    </header>
  );
}
