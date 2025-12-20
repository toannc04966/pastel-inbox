import { useState, useCallback, useRef } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { MessagePreview, Message, ApiResponse } from '@/types/mail';
import { toast } from 'sonner';

const ALL_DOMAINS = '__all__';
const DOMAIN_STORAGE_KEY = 'tempmail_selected_domain';

function getStoredDomain(): string {
  try {
    return localStorage.getItem(DOMAIN_STORAGE_KEY) || ALL_DOMAINS;
  } catch {
    return ALL_DOMAINS;
  }
}

function setStoredDomain(domain: string): void {
  try {
    if (domain === ALL_DOMAINS) {
      localStorage.removeItem(DOMAIN_STORAGE_KEY);
    } else {
      localStorage.setItem(DOMAIN_STORAGE_KEY, domain);
    }
  } catch {
    // Ignore storage errors
  }
}

export function useMailApi() {
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>(getStoredDomain);
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState({
    domains: true,
    messages: false,
    message: false,
    deleting: false,
    clearingInbox: false,
  });
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

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
    setStoredDomain(domain);
  }, []);

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

  const clearInbox = useCallback(async (): Promise<boolean> => {
    setLoading(prev => ({ ...prev, clearingInbox: true }));
    
    try {
      // Delete all messages one by one (or use bulk endpoint if available)
      const deletePromises = messages.map(m => 
        apiFetch<ApiResponse<null>>(
          `/api/v1/messages/${encodeURIComponent(m.id)}`,
          { method: 'DELETE' }
        )
      );
      
      const results = await Promise.allSettled(deletePromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      if (successCount === messages.length) {
        setMessages([]);
        setSelectedMessage(null);
        toast.success('Inbox cleared');
        return true;
      } else if (successCount > 0) {
        // Partial success - refresh to get current state
        await fetchMessages();
        toast.success(`Deleted ${successCount} of ${messages.length} messages`);
        return true;
      } else {
        throw { message: 'Failed to clear inbox', status: 500 };
      }
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error('Failed to clear inbox');
      console.error('[Mail] Clear inbox error:', apiErr);
      return false;
    } finally {
      setLoading(prev => ({ ...prev, clearingInbox: false }));
    }
  }, [messages, fetchMessages]);

  const refreshMessages = useCallback(() => {
    fetchMessages();
    toast.success('Refreshed');
  }, [fetchMessages]);

  // Get inbox email based on selected domain
  const getInboxEmail = useCallback((): string | undefined => {
    if (domains.length === 0) return undefined;
    
    // If specific domain selected, use it
    if (selectedDomain !== ALL_DOMAINS) {
      return `inbox@${selectedDomain}`;
    }
    
    // Otherwise use first domain
    return domains[0] ? `inbox@${domains[0]}` : undefined;
  }, [domains, selectedDomain]);

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
    clearInbox,
    fetchDomains,
    fetchMessages,
    getInboxEmail,
    ALL_DOMAINS,
  };
}
