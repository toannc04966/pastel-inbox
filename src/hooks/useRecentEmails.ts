import { useState, useCallback } from 'react';
import type { RecentEmail, RecentEmailsByDomain } from '@/types/mail';

const STORAGE_KEY = 'bpink-mail:recent-emails';
const MAX_RECENT = 10;

function getStoredRecentEmails(): RecentEmailsByDomain {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveRecentEmails(data: RecentEmailsByDomain): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export function useRecentEmails() {
  const [recentEmailsByDomain, setRecentEmailsByDomain] = useState<RecentEmailsByDomain>(
    getStoredRecentEmails
  );

  const addRecentEmail = useCallback((domain: string, email: string, messageCount: number) => {
    setRecentEmailsByDomain((prev) => {
      const domainRecent = prev[domain] || [];
      
      // Remove if exists
      const filtered = domainRecent.filter((r) => r.email.toLowerCase() !== email.toLowerCase());
      
      // Add to front
      const updated: RecentEmail[] = [
        {
          email: email.toLowerCase(),
          messageCount,
          lastAccessed: Date.now(),
        },
        ...filtered,
      ].slice(0, MAX_RECENT);

      const newData = { ...prev, [domain]: updated };
      saveRecentEmails(newData);
      return newData;
    });
  }, []);

  const getRecentEmails = useCallback(
    (domain: string): RecentEmail[] => {
      return recentEmailsByDomain[domain] || [];
    },
    [recentEmailsByDomain]
  );

  const removeRecentEmail = useCallback((domain: string, email: string) => {
    setRecentEmailsByDomain((prev) => {
      const domainRecent = prev[domain] || [];
      const filtered = domainRecent.filter((r) => r.email.toLowerCase() !== email.toLowerCase());
      
      const newData = { ...prev, [domain]: filtered };
      saveRecentEmails(newData);
      return newData;
    });
  }, []);

  const clearRecentEmails = useCallback((domain: string) => {
    setRecentEmailsByDomain((prev) => {
      const newData = { ...prev, [domain]: [] };
      saveRecentEmails(newData);
      return newData;
    });
  }, []);

  return {
    recentEmailsByDomain,
    addRecentEmail,
    getRecentEmails,
    removeRecentEmail,
    clearRecentEmails,
  };
}
