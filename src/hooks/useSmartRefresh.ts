import { useState, useEffect, useCallback, useRef } from 'react';

const AUTO_REFRESH_KEY = 'tempmail_auto_refresh';
const IDLE_TIMEOUT = 45000; // 45 seconds

function getStoredAutoRefresh(): boolean {
  try {
    const stored = localStorage.getItem(AUTO_REFRESH_KEY);
    return stored !== 'false'; // Default to true
  } catch {
    return true;
  }
}

function setStoredAutoRefresh(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_REFRESH_KEY, String(enabled));
  } catch {
    // Ignore storage errors
  }
}

export function useSmartRefresh(
  onRefresh: () => void,
  intervalMs: number = 30000
) {
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(getStoredAutoRefresh);
  const [isUserActive, setIsUserActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsUserActive(true);
    
    // Clear existing idle timeout
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    
    // Set new idle timeout
    idleTimeoutRef.current = setTimeout(() => {
      setIsUserActive(false);
    }, IDLE_TIMEOUT);
  }, []);

  // Toggle auto-refresh
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled(prev => {
      const newValue = !prev;
      setStoredAutoRefresh(newValue);
      return newValue;
    });
  }, []);

  // Set up activity listeners
  useEffect(() => {
    const events = ['scroll', 'mousedown', 'keydown', 'touchstart', 'mousemove'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Also pause when user is selecting text
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        handleActivity();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('selectionchange', handleSelectionChange);
      
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [handleActivity]);

  // Set up polling
  useEffect(() => {
    // Clear existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    const shouldRefresh = autoRefreshEnabled && !isUserActive;
    setIsPaused(autoRefreshEnabled && isUserActive);

    if (shouldRefresh) {
      pollIntervalRef.current = setInterval(onRefresh, intervalMs);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [autoRefreshEnabled, isUserActive, onRefresh, intervalMs]);

  return {
    autoRefreshEnabled,
    toggleAutoRefresh,
    isPaused,
  };
}
