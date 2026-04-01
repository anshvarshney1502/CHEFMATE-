import { useState } from 'react';
import type { Session } from '../hooks/useSessions';
import type { SavedRecipe } from '../utils/storage';
import type { GroceryItem } from '../utils/storage';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import {
  MessageSquare, Star, ShoppingCart, Trash2, Plus, Cpu,
} from 'lucide-react';

type SidebarTab = 'chats' | 'saved' | 'grocery';

interface SidebarProps {
  open: boolean;
  sessions: Session[];
  activeId: string;
  savedRecipes: SavedRecipe[];
  groceryItems: GroceryItem[];
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onDeleteSaved: (id: string) => void;
  onToggleGrocery: (id: string) => void;
  onClearGrocery: () => void;
  onClose: () => void;
  isMobile: boolean;
}

function timeAgo(d: Date) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TAB_CONFIG: { key: SidebarTab; label: string; icon: React.ReactNode }[] = [
  { key: 'chats',   label: 'Chats',   icon: <MessageSquare size={14} /> },
  { key: 'saved',   label: 'Saved',   icon: <Star size={14} /> },
  { key: 'grocery', label: 'Grocery', icon: <ShoppingCart size={14} /> },
];

export function Sidebar({
  open,
  sessions,
  activeId,
  savedRecipes,
  groceryItems,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onDeleteSaved,
  onToggleGrocery,
  onClearGrocery,
  onClose,
  isMobile,
}: SidebarProps) {
  const [tab, setTab] = useState<SidebarTab>('chats');
  const [search, setSearch] = useState('');

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const sidebarClass = [
    'sidebar',
    !open ? 'collapsed' : '',
    isMobile && open ? 'mobile-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {isMobile && open && (
        <div className="sidebar-backdrop" onClick={onClose} />
      )}

      <aside className={sidebarClass}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-emoji">👨‍🍳</span>
            <span className="sidebar-logo-text">ChefMate</span>
          </div>
          <button
            className="new-chat-btn"
            onClick={() => { onNewChat(); if (isMobile) onClose(); }}
          >
            <Plus size={14} strokeWidth={2.5} />
            New Chat
          </button>
        </div>

        {/* Tabs */}
        <div className="sidebar-tabs">
          {TAB_CONFIG.map(({ key, label, icon }) => (
            <button
              key={key}
              className={`sidebar-tab${tab === key ? ' active' : ''}`}
              onClick={() => setTab(key)}
            >
              <span className="tab-icon">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        {tab === 'chats' && (
          <div className="sidebar-search">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats…"
            />
          </div>
        )}

        {/* List */}
        <div className="sidebar-list">
          {/* Chats */}
          {tab === 'chats' && filteredSessions.map(s => (
            <div
              key={s.id}
              className={`session-item${s.id === activeId ? ' active' : ''}`}
              onClick={() => { onSelectSession(s.id); if (isMobile) onClose(); }}
            >
              <span className="session-emoji">{s.emoji}</span>
              <div className="session-info">
                <div className="session-title">{s.title}</div>
                <div className="session-time">{timeAgo(s.createdAt)}</div>
              </div>
              <button
                className="session-delete"
                onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }}
                title="Delete chat"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {/* Saved recipes — empty */}
          {tab === 'saved' && savedRecipes.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
              <Star size={22} className="text-[#2D4A3A]" />
              <p className="text-xs text-[#2D4A3A] leading-relaxed">
                Save a recipe to see it here
              </p>
            </div>
          )}

          {tab === 'saved' && savedRecipes.map(r => (
            <div key={r.id} className="session-item">
              <span className="session-emoji">⭐</span>
              <div className="session-info">
                <div className="session-title">{r.title}</div>
                <div className="session-time">{new Date(r.savedAt).toLocaleDateString()}</div>
              </div>
              <button
                className="session-delete"
                onClick={() => onDeleteSaved(r.id)}
                title="Remove saved recipe"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {/* Grocery — empty */}
          {tab === 'grocery' && groceryItems.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
              <ShoppingCart size={22} className="text-[#2D4A3A]" />
              <p className="text-xs text-[#2D4A3A] leading-relaxed">
                Add ingredients from a recipe
              </p>
            </div>
          )}

          {tab === 'grocery' && groceryItems.map(item => (
            <div key={item.id} className="grocery-item-row">
              <Checkbox
                checked={item.checked}
                onCheckedChange={() => onToggleGrocery(item.id)}
              />
              <span className={`grocery-item-text${item.checked ? ' checked' : ''}`}>
                {item.text}
              </span>
            </div>
          ))}
        </div>

        {/* Clear grocery */}
        {tab === 'grocery' && groceryItems.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="mx-3.5 mb-2 w-[calc(100%-28px)]"
            onClick={onClearGrocery}
          >
            <Trash2 size={13} />
            Clear List
          </Button>
        )}

        {/* Bottom status */}
        <div className="sidebar-bottom">
          <span className="ai-status-dot" />
          <span className="ai-status-text flex items-center gap-1.5">
            <Cpu size={11} />
            On-Device AI · Ready
          </span>
        </div>
      </aside>
    </>
  );
}
