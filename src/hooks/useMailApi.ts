import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { MessagePreview, Message, ApiResponse } from '@/types/mail';
import { toast } from 'sonner';

const ALL_DOMAINS = '__all__';

export function useMailApi() {
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>(ALL_DOMAINS);
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState({
    domains: true,
    messages: false,
    message: false,
  });
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const fetchMessages = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(prev => ({ ...prev, messages: true }));

    try {
      const url = selectedDomain === ALL_DOMAINS
        ? '/api/v1/messages'
        : `/api/v1/messages?domain=${encodeURIComponent(selectedDomain)}`;
      
      const res = await apiFetch<ApiResponse<{ messages: MessagePreview[] }>>(
        url,
        { signal: abortControllerRef.current.signal }
      );

      if (res.ok && res.data) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[Mail] Fetch messages error:', err);
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  }, [selectedDomain]);

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

  const handleDomainChange = useCallback((domain: string) => {
    setSelectedDomain(domain);
    setSelectedMessage(null);
  }, []);

  const refreshMessages = useCallback(() => {
    fetchMessages();
    toast.success('Refreshed');
  }, [fetchMessages]);

  // Fetch domains on mount
  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // Poll messages every 30 seconds and when domain changes
  useEffect(() => {
    // Initial fetch
    fetchMessages();

    // Set up polling
    pollIntervalRef.current = setInterval(fetchMessages, 30000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchMessages]);

  return {
    domains,
    selectedDomain,
    messages,
    selectedMessage,
    loading,
    error,
    setError,
    handleDomainChange,
    fetchMessage,
    setSelectedMessage,
    refreshMessages,
    ALL_DOMAINS,
  };
}
