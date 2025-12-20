import { useState, useCallback, useEffect } from 'react';

const READ_STATE_KEY = 'tempmail_read_messages';

function getStoredReadState(): Set<string> {
  try {
    const stored = localStorage.getItem(READ_STATE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

function setStoredReadState(readIds: Set<string>): void {
  try {
    localStorage.setItem(READ_STATE_KEY, JSON.stringify([...readIds]));
  } catch {
    // Ignore storage errors
  }
}

export function useReadState() {
  const [readMessages, setReadMessages] = useState<Set<string>>(getStoredReadState);

  // Persist to localStorage whenever it changes
  useEffect(() => {
    setStoredReadState(readMessages);
  }, [readMessages]);

  const isRead = useCallback((messageId: string): boolean => {
    return readMessages.has(messageId);
  }, [readMessages]);

  const markAsRead = useCallback((messageId: string): void => {
    setReadMessages(prev => {
      if (prev.has(messageId)) return prev;
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });
  }, []);

  const markAsUnread = useCallback((messageId: string): void => {
    setReadMessages(prev => {
      if (!prev.has(messageId)) return prev;
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });
  }, []);

  const clearReadState = useCallback((): void => {
    setReadMessages(new Set());
  }, []);

  return {
    isRead,
    markAsRead,
    markAsUnread,
    clearReadState,
  };
}
