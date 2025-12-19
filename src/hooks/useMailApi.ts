import { useState, useEffect, useCallback } from 'react';
import type { Inbox, MessagePreview, Message, ApiResponse } from '@/types/mail';

const API_BASE = 'https://temp-mail-worker.ahn2k22.workers.dev';

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

  const fetchDomains = useCallback(async () => {
    setLoading(prev => ({ ...prev, domains: true }));
    try {
      const res = await fetch(`${API_BASE}/api/v1/domains`);
      const json: ApiResponse<{ domains: string[] }> = await res.json();
      if (json.ok && json.data) {
        setDomains(json.data.domains);
      } else {
        setError(json.error?.message || 'Failed to fetch domains');
      }
    } catch (err) {
      setError('Network error fetching domains');
    } finally {
      setLoading(prev => ({ ...prev, domains: false }));
    }
  }, []);

  const generateInbox = useCallback(async (domain?: string, length?: number) => {
    setLoading(prev => ({ ...prev, inbox: true }));
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/inboxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, length }),
      });
      const json: ApiResponse<{ inbox: Inbox }> = await res.json();
      if (json.ok && json.data) {
        setInbox(json.data.inbox);
        setMessages([]);
        setSelectedMessage(null);
      } else {
        setError(json.error?.message || 'Failed to generate inbox');
      }
    } catch (err) {
      setError('Network error generating inbox');
    } finally {
      setLoading(prev => ({ ...prev, inbox: false }));
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!inbox?.id) return;
    setLoading(prev => ({ ...prev, messages: true }));
    try {
      const res = await fetch(`${API_BASE}/api/v1/inboxes/${inbox.id}/messages?limit=30`);
      const json: ApiResponse<{ inboxId: string; messages: MessagePreview[] }> = await res.json();
      if (json.ok && json.data) {
        setMessages(json.data.messages);
      }
    } catch (err) {
      // Silent fail for polling
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  }, [inbox?.id]);

  const fetchMessage = useCallback(async (messageId: string) => {
    setLoading(prev => ({ ...prev, message: true }));
    try {
      const res = await fetch(`${API_BASE}/api/v1/messages/${messageId}`);
      const json: ApiResponse<{ message: Message }> = await res.json();
      if (json.ok && json.data) {
        setSelectedMessage(json.data.message);
      } else {
        setError(json.error?.message || 'Failed to fetch message');
      }
    } catch (err) {
      setError('Network error fetching message');
    } finally {
      setLoading(prev => ({ ...prev, message: false }));
    }
  }, []);

  // Initial domain fetch
  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // Poll messages every 5 seconds
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
    setError,
    generateInbox,
    fetchMessage,
    setSelectedMessage,
  };
}
