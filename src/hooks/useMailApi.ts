import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { Inbox, MessagePreview, Message, ApiResponse } from '@/types/mail';
import { toast } from 'sonner';

const STORAGE_KEY = 'tempmail_inbox';

interface StoredInbox {
  inboxId: string;
  address: string;
  domain: string;
}

export function useMailApi() {
  const [domains, setDomains] = useState<string[]>([]);
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState({
    domains: true,
    inbox: false,
    messages: false,
    message: false,
  });
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load inbox from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: StoredInbox = JSON.parse(stored);
        setInbox({
          id: parsed.inboxId,
          address: parsed.address,
          domain: parsed.domain,
          createdAt: '',
        });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Persist inbox to localStorage
  useEffect(() => {
    if (inbox) {
      const toStore: StoredInbox = {
        inboxId: inbox.id,
        address: inbox.address,
        domain: inbox.domain,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    }
  }, [inbox]);

  const fetchDomains = useCallback(async () => {
    setLoading(prev => ({ ...prev, domains: true }));
    try {
      const res = await apiFetch<ApiResponse<{ domains: string[] }>>('/api/v1/domains');
      if (res.ok && res.data) {
        setDomains(res.data.domains);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setError(`Failed to fetch domains: ${apiErr.message}`);
      toast.error('Failed to load domains');
    } finally {
      setLoading(prev => ({ ...prev, domains: false }));
    }
  }, []);

  const generateInbox = useCallback(async (domain?: string, length: number = 10) => {
    setLoading(prev => ({ ...prev, inbox: true }));
    setError(null);

    try {
      const res = await apiFetch<ApiResponse<{ inbox: Inbox }>>('/api/v1/inboxes', {
        method: 'POST',
        body: JSON.stringify({ domain, length }),
      });

      if (res.ok && res.data) {
        setInbox(res.data.inbox);
        setMessages([]);
        setSelectedMessage(null);
        toast.success('Address generated!');
      } else {
        throw { message: 'Failed to generate inbox', status: 500 };
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setError(`Failed to generate inbox: ${apiErr.message}`);
      toast.error(apiErr.message);
    } finally {
      setLoading(prev => ({ ...prev, inbox: false }));
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!inbox?.id) return;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(prev => ({ ...prev, messages: true }));

    try {
      const encodedId = encodeURIComponent(inbox.id);
      const res = await apiFetch<ApiResponse<{ inboxId: string; messages: MessagePreview[] }>>(
        `/api/v1/inboxes/${encodedId}/messages?limit=30`,
        { signal: abortControllerRef.current.signal }
      );

      if (res.ok && res.data) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // Silent fail for polling
      console.error('[Mail] Fetch messages error:', err);
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  }, [inbox?.id]);

  const fetchMessage = useCallback(async (messageId: string) => {
    setLoading(prev => ({ ...prev, message: true }));

    try {
      const res = await apiFetch<ApiResponse<{ message: Message }>>(
        `/api/v1/messages/${encodeURIComponent(messageId)}`
      );

      if (res.ok && res.data) {
        setSelectedMessage(res.data.message);
      } else {
        throw { message: 'Failed to fetch message', status: 500 };
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setError(`Failed to fetch message: ${apiErr.message}`);
      toast.error('Failed to load message');
    } finally {
      setLoading(prev => ({ ...prev, message: false }));
    }
  }, []);

  // Fetch domains on mount
  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // Poll messages every 5 seconds when inbox exists
  useEffect(() => {
    if (!inbox?.id) return;

    // Initial fetch
    fetchMessages();

    // Set up polling
    pollIntervalRef.current = setInterval(fetchMessages, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [inbox?.id, fetchMessages]);

  return {
    domains,
    inbox,
    messages,
    selectedMessage,
    loading,
    error,
    setError,
    generateInbox,
    fetchMessage,
    setSelectedMessage,
  };
}
