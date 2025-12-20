import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch, ApiError } from '@/lib/api';
import type { MessagePreview, Message, ApiResponse } from '@/types/mail';
import { toast } from 'sonner';

const ALL_DOMAINS = '__all__';
const DOMAIN_PARAM = 'domain';

export function useMailApi() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDomain = searchParams.get(DOMAIN_PARAM) || ALL_DOMAINS;
  
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>(initialDomain);
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState({
    domains: true,
    messages: false,
    message: false,
    deleting: false,
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
    // Persist domain in URL
    const newParams = new URLSearchParams(searchParams);
    if (domain === ALL_DOMAINS) {
      newParams.delete(DOMAIN_PARAM);
    } else {
      newParams.set(DOMAIN_PARAM, domain);
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    setLoading(prev => ({ ...prev, deleting: true }));
    
    try {
      const res = await apiFetch<ApiResponse<null>>(
        `/api/v1/messages/${encodeURIComponent(messageId)}`,
        { method: 'DELETE' }
      );
      
      if (res.ok) {
        // Find index of deleted message
        const idx = messages.findIndex(m => m.id === messageId);
        const newMessages = messages.filter(m => m.id !== messageId);
        setMessages(newMessages);
        
        // Auto-select next message
        if (newMessages.length > 0) {
          const nextIdx = idx < newMessages.length ? idx : newMessages.length - 1;
          const nextMessage = newMessages[nextIdx];
          // Fetch the full message
          const msgRes = await apiFetch<ApiResponse<{ message: Message }>>(
            `/api/v1/messages/${encodeURIComponent(nextMessage.id)}`
          );
          if (msgRes.ok && msgRes.data) {
            setSelectedMessage(msgRes.data.message);
          }
        } else {
          setSelectedMessage(null);
        }
        
        toast.success('Message deleted');
        return true;
      } else {
        throw { message: 'Failed to delete message', status: 500 };
      }
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error('Failed to delete message');
      console.error('[Mail] Delete error:', apiErr);
      return false;
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
    }
  }, [messages]);

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
    deleteMessage,
    ALL_DOMAINS,
  };
}
