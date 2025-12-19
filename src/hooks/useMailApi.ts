import { useState, useEffect, useCallback, useRef } from 'react';
import type { Inbox, MessagePreview, Message, ApiResponse } from '@/types/mail';

const API_BASE = 'https://temp-mail-worker.ahn2k22.workers.dev';

export interface DebugInfo {
  lastRequest: {
    url: string;
    method: string;
    body?: string;
  } | null;
  lastResponse: {
    status: number;
    statusText: string;
    text: string;
  } | null;
  lastError: string | null;
}

export function useMailApi() {
  const [domains, setDomains] = useState<string[]>([]);
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState({
    domains: false,
    inbox: false,
    messages: false,
    message: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    lastRequest: null,
    lastResponse: null,
    lastError: null,
  });

  const updateDebug = (
    request: DebugInfo['lastRequest'],
    response?: DebugInfo['lastResponse'],
    error?: string
  ) => {
    setDebugInfo({
      lastRequest: request,
      lastResponse: response || null,
      lastError: error || null,
    });
  };

  const fetchDomains = useCallback(async () => {
    setLoading(prev => ({ ...prev, domains: true }));
    const url = `${API_BASE}/api/v1/domains`;
    const request = { url, method: 'GET' };
    
    try {
      updateDebug(request);
      const res = await fetch(url, { mode: 'cors' });
      const text = await res.text();
      
      updateDebug(request, {
        status: res.status,
        statusText: res.statusText,
        text: text.substring(0, 2000),
      });

      if (!res.ok) {
        setError(`Failed to fetch domains: ${res.status} ${res.statusText} - ${text.substring(0, 200)}`);
        return;
      }

      const json: ApiResponse<{ domains: string[] }> = JSON.parse(text);
      if (json.ok && json.data) {
        setDomains(json.data.domains);
      } else {
        setError(json.error?.message || 'Failed to fetch domains');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      updateDebug(request, undefined, errorMsg);
      setError(`Network error fetching domains: ${errorMsg}`);
    } finally {
      setLoading(prev => ({ ...prev, domains: false }));
    }
  }, []);

  const generateInbox = useCallback(async (domain?: string, length: number = 10) => {
    setLoading(prev => ({ ...prev, inbox: true }));
    setError(null);
    
    const url = `${API_BASE}/api/v1/inboxes`;
    const body = JSON.stringify({ domain, length });
    const request = { url, method: 'POST', body };

    try {
      updateDebug(request);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        mode: 'cors',
      });
      
      const text = await res.text();
      
      updateDebug(request, {
        status: res.status,
        statusText: res.statusText,
        text: text.substring(0, 2000),
      });

      if (!res.ok) {
        setError(`Failed to generate inbox: ${res.status} ${res.statusText} - URL: ${url} - Response: ${text.substring(0, 300)}`);
        return;
      }

      let json: ApiResponse<{ inbox: Inbox }>;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        setError(`JSON parse error. Raw response: ${text.substring(0, 500)}`);
        return;
      }

      if (json.ok && json.data) {
        setInbox(json.data.inbox);
        setMessages([]);
        setSelectedMessage(null);
      } else {
        setError(json.error?.message || 'Failed to generate inbox - API returned ok: false');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? `${err.name}: ${err.message}` : 'Unknown error';
      updateDebug(request, undefined, errorMsg);
      setError(`Network error generating inbox: ${errorMsg}. URL: ${url}`);
    } finally {
      setLoading(prev => ({ ...prev, inbox: false }));
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!inbox?.id) return;
    
    setLoading(prev => ({ ...prev, messages: true }));
    
    // IMPORTANT: URL-encode the inbox ID because it contains "@"
    const encodedInboxId = encodeURIComponent(inbox.id);
    const url = `${API_BASE}/api/v1/inboxes/${encodedInboxId}/messages?limit=30`;
    const request = { url, method: 'GET' };

    try {
      updateDebug(request);
      const res = await fetch(url, { mode: 'cors' });
      const text = await res.text();
      
      updateDebug(request, {
        status: res.status,
        statusText: res.statusText,
        text: text.substring(0, 2000),
      });

      if (!res.ok) {
        // Silent fail for polling, but update debug
        return;
      }

      const json: ApiResponse<{ inboxId: string; messages: MessagePreview[] }> = JSON.parse(text);
      if (json.ok && json.data) {
        setMessages(json.data.messages);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      updateDebug(request, undefined, errorMsg);
      // Silent fail for polling
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  }, [inbox?.id]);

  const fetchMessage = useCallback(async (messageId: string) => {
    setLoading(prev => ({ ...prev, message: true }));
    
    const url = `${API_BASE}/api/v1/messages/${encodeURIComponent(messageId)}`;
    const request = { url, method: 'GET' };

    try {
      updateDebug(request);
      const res = await fetch(url, { mode: 'cors' });
      const text = await res.text();
      
      updateDebug(request, {
        status: res.status,
        statusText: res.statusText,
        text: text.substring(0, 2000),
      });

      if (!res.ok) {
        setError(`Failed to fetch message: ${res.status} - ${text.substring(0, 200)}`);
        return;
      }

      const json: ApiResponse<{ message: Message }> = JSON.parse(text);
      if (json.ok && json.data) {
        setSelectedMessage(json.data.message);
      } else {
        setError(json.error?.message || 'Failed to fetch message');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      updateDebug(request, undefined, errorMsg);
      setError(`Network error fetching message: ${errorMsg}`);
    } finally {
      setLoading(prev => ({ ...prev, message: false }));
    }
  }, []);

  // Initial domain fetch
  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // Poll messages every 5 seconds ONLY when we have an inbox
  useEffect(() => {
    if (!inbox?.id) return;
    
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    
    return () => clearInterval(interval);
  }, [inbox?.id, fetchMessages]);

  return {
    domains,
    inbox,
    messages,
    selectedMessage,
    loading,
    error,
    debugInfo,
    setError,
    generateInbox,
    fetchMessage,
    setSelectedMessage,
  };
}
