import { useState, useCallback } from 'react';
import {
  getSavedRecipes,
  saveRecipe,
  deleteSavedRecipe,
  type SavedRecipe,
} from '../utils/storage';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  saved?: boolean;
  streaming?: boolean;
}

export interface Session {
  id: string;
  emoji: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const EMOJIS = ['🍗','🍝','☕','🍫','🥗','🍜','🥘','🍕','🥞','🍛','🥦','🍱'];

function makeSession(): Session {
  return {
    id: `${Date.now()}-${Math.random()}`,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    title: 'New Chat',
    messages: [],
    createdAt: new Date(),
  };
}

/* Create the initial session once at module-evaluate time so both
   the sessions array and the activeId share the same id. */
const _initial = makeSession();

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([_initial]);
  const [activeId, setActiveId] = useState<string>(_initial.id);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(getSavedRecipes);

  const activeSession = sessions.find(s => s.id === activeId) ?? sessions[0];

  const newSession = useCallback(() => {
    const s = makeSession();
    setSessions(prev => [s, ...prev]);
    setActiveId(s.id);
  }, []);

  const switchSession = useCallback((id: string) => setActiveId(id), []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) {
        const s = makeSession();
        setActiveId(s.id);
        return [s];
      }
      setActiveId(cur => cur === id ? filtered[0].id : cur);
      return filtered;
    });
  }, []);

  /** Append a message and return its id */
  const addMessage = useCallback((sessionId: string, msg: Omit<Message, 'id'>): string => {
    const id = `${Date.now()}-${Math.random()}`;
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const title =
        s.title === 'New Chat' && msg.role === 'user'
          ? msg.text.slice(0, 32) + (msg.text.length > 32 ? '…' : '')
          : s.title;
      return { ...s, title, messages: [...s.messages, { ...msg, id }] };
    }));
    return id;
  }, []);

  /** Overwrite the text of an existing message (used for streaming) */
  const updateMessage = useCallback((sessionId: string, msgId: string, text: string, streaming = false) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        messages: s.messages.map(m =>
          m.id === msgId ? { ...m, text, streaming } : m
        ),
      };
    }));
  }, []);

  const saveMessageAsRecipe = useCallback((msg: Message) => {
    const recipe: SavedRecipe = {
      id: `${Date.now()}`,
      title: msg.text.slice(0, 50) + (msg.text.length > 50 ? '…' : ''),
      text: msg.text,
      savedAt: new Date().toISOString(),
    };
    saveRecipe(recipe);
    setSavedRecipes(getSavedRecipes());
    setSessions(prev => prev.map(s => ({
      ...s,
      messages: s.messages.map(m => m.id === msg.id ? { ...m, saved: true } : m),
    })));
  }, []);

  const deleteSaved = useCallback((id: string) => {
    deleteSavedRecipe(id);
    setSavedRecipes(getSavedRecipes());
  }, []);

  return {
    sessions,
    activeSession,
    activeId,
    newSession,
    switchSession,
    deleteSession,
    addMessage,
    updateMessage,
    saveMessageAsRecipe,
    savedRecipes,
    deleteSaved,
  };
}
