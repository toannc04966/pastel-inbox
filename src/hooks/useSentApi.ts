import { useState, useCallback, useRef } from 'react';
import { apiFetch, ApiError, API_BASE } from '@/lib/api';
import type { SentMessagePreview, SentMessage, SendEmailPayload, SendEmailResponse } from '@/types/sent';
import type { ApiResponse } from '@/types/mail';
import { toast } from 'sonner';

interface RateLimitInfo {
  remaining: number;
  resetAt: number | null;
  limit: number;
}

const RATE_LIMIT_STORAGE_KEY = 'bpink_rate_limit';
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 10;

function getStoredRateLimit(): RateLimitInfo {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // Reset if window has passed
      if (data.resetAt && Date.now() > data.resetAt) {
        return { remaining: RATE_LIMIT_MAX, resetAt: null, limit: RATE_LIMIT_MAX };
      }
      return data;
    }
  } catch {
    // Ignore
  }
  return { remaining: RATE_LIMIT_MAX, resetAt: null, limit: RATE_LIMIT_MAX };
}

function saveRateLimit(info: RateLimitInfo) {
  try {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(info));
  } catch {
    // Ignore
  }
}

export const ERROR_MESSAGES: Record<string, string> = {
  RATE_LIMITED: "You've reached the sending limit (10 emails per 5 minutes). Please wait.",
  INVALID_FROM: "From address must end with @nuoicpa.online",
  MISSING_RECIPIENTS: "Please add at least one recipient",
  INVALID_RECIPIENT: "One or more recipient emails are invalid",
  INVALID_CC: "One or more CC emails are invalid",
  INVALID_BCC: "One or more BCC emails are invalid",
  SUBJECT_TOO_LONG: "Subject must be 200 characters or less",
  MISSING_CONTENT: "Please add email content (text or HTML)",
  PAYLOAD_TOO_LARGE: "Email content too large (max 200KB)",
  PROVIDER_ERROR: "Email provider error. Please try again.",
  SEND_FAILED: "Failed to send email. Please try again.",
};

export function useSentApi() {
  const [sentMessages, setSentMessages] = useState<SentMessagePreview[]>([]);
  const [selectedSentMessage, setSelectedSentMessage] = useState<SentMessage | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>(getStoredRateLimit);
  const [loading, setLoading] = useState({
    list: false,
    detail: false,
    sending: false,
    deleting: false,
    bulkDeleting: false,
  });
  const [error, setError] = useState<string | null>(null);
  
  const offsetRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateRateLimit = useCallback((decrease: boolean = false) => {
    setRateLimit(prev => {
      const now = Date.now();
      let newInfo = { ...prev };
      
      // Reset if window has passed
      if (prev.resetAt && now > prev.resetAt) {
        newInfo = { remaining: RATE_LIMIT_MAX, resetAt: null, limit: RATE_LIMIT_MAX };
      }
      
      if (decrease) {
        newInfo.remaining = Math.max(0, newInfo.remaining - 1);
        if (!newInfo.resetAt) {
          newInfo.resetAt = now + RATE_LIMIT_WINDOW;
        }
      }
      
      saveRateLimit(newInfo);
      return newInfo;
    });
  }, []);

  const fetchSentMessages = useCallback(async (reset: boolean = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (reset) {
      offsetRef.current = 0;
      setSentMessages([]);
      setHasMore(true);
    }

    setLoading(prev => ({ ...prev, list: true }));
    setError(null);

    try {
      const res = await apiFetch<ApiResponse<{ messages: SentMessagePreview[]; limit: number; offset: number }>>(
        `/api/v1/sent?limit=50&offset=${offsetRef.current}`,
        { signal: abortControllerRef.current.signal }
      );

      if (res.ok && res.data) {
        const newMessages = res.data.messages || [];
        
        if (reset) {
          setSentMessages(newMessages);
        } else {
          setSentMessages(prev => [...prev, ...newMessages]);
        }
        
        setHasMore(newMessages.length === 50);
        offsetRef.current += newMessages.length;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      
      const apiErr = err as ApiError;
      setError(apiErr.message || 'Failed to fetch sent messages');
      console.error('[Sent] Fetch error:', err);
    } finally {
      setLoading(prev => ({ ...prev, list: false }));
    }
  }, []);

  const loadMoreSent = useCallback(async () => {
    if (loading.list || !hasMore) return;
    await fetchSentMessages(false);
  }, [fetchSentMessages, loading.list, hasMore]);

  const fetchSentMessage = useCallback(async (messageId: string) => {
    setLoading(prev => ({ ...prev, detail: true }));

    try {
      const res = await apiFetch<ApiResponse<{ message: SentMessage }>>(
        `/api/v1/sent/${encodeURIComponent(messageId)}`
      );

      if (res.ok && res.data) {
        setSelectedSentMessage(res.data.message);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || 'Failed to fetch message');
      toast.error('Failed to load message');
    } finally {
      setLoading(prev => ({ ...prev, detail: false }));
    }
  }, []);

  const sendEmail = useCallback(async (payload: SendEmailPayload, attachments?: File[]): Promise<SendEmailResponse | null> => {
    // Check rate limit
    const currentLimit = getStoredRateLimit();
    if (currentLimit.remaining <= 0 && currentLimit.resetAt && Date.now() < currentLimit.resetAt) {
      const waitMinutes = Math.ceil((currentLimit.resetAt - Date.now()) / 60000);
      toast.error(`Rate limited. Please wait ${waitMinutes} minute(s).`);
      return null;
    }

    setLoading(prev => ({ ...prev, sending: true }));
    setError(null);

    try {
      let res: ApiResponse<SendEmailResponse>;

      if (attachments && attachments.length > 0) {
        // Send with attachments using FormData
        const formData = new FormData();
        formData.append('json', JSON.stringify(payload));
        
        attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });

        const response = await fetch(`${API_BASE}/api/v1/send`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
          // Don't set Content-Type header - browser will set it with boundary
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw { message: errorData.message || 'Failed to send email', status: response.status, error: errorData.error };
        }

        res = await response.json();
      } else {
        // Send without attachments (standard JSON)
        res = await apiFetch<ApiResponse<SendEmailResponse>>(
          '/api/v1/send',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
      }

      if (res.ok && res.data) {
        updateRateLimit(true);
        toast.success('Email sent!');
        return res.data;
      }
      
      throw { message: 'Failed to send email', status: 500 };
    } catch (err) {
      const apiErr = err as ApiError;
      const errorCode = (apiErr as any).error || '';
      const message = ERROR_MESSAGES[errorCode] || apiErr.message || 'Failed to send email';
      
      if (errorCode === 'RATE_LIMITED') {
        setRateLimit({
          remaining: 0,
          resetAt: Date.now() + RATE_LIMIT_WINDOW,
          limit: RATE_LIMIT_MAX,
        });
      }
      
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, sending: false }));
    }
  }, [updateRateLimit]);

  const deleteSentMessage = useCallback(async (messageId: string): Promise<boolean> => {
    setLoading(prev => ({ ...prev, deleting: true }));

    try {
      const res = await apiFetch<ApiResponse<{ deleted: boolean; id: string }>>(
        `/api/v1/sent/${encodeURIComponent(messageId)}`,
        { method: 'DELETE' }
      );

      if (res.ok && res.data?.deleted) {
        // Remove from local state
        setSentMessages(prev => prev.filter(m => m.id !== messageId));
        // Clear selected if deleted
        if (selectedSentMessage?.id === messageId) {
          setSelectedSentMessage(null);
        }
        toast.success('Message deleted');
        return true;
      }
      
      throw { message: 'Failed to delete message', status: 500 };
    } catch (err) {
      const apiErr = err as ApiError;
      if ((apiErr as any).status === 404) {
        toast.error('Message not found. It may have been already deleted.');
        fetchSentMessages(true);
      } else {
        toast.error(apiErr.message || 'Failed to delete message');
      }
      return false;
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
    }
  }, [selectedSentMessage, fetchSentMessages]);

  const bulkDeleteSentMessages = useCallback(async (
    messageIds: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ success: number; failed: number }> => {
    setLoading(prev => ({ ...prev, bulkDeleting: true }));

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < messageIds.length; i++) {
      const id = messageIds[i];
      onProgress?.(i + 1, messageIds.length);

      try {
        const res = await apiFetch<ApiResponse<{ deleted: boolean; id: string }>>(
          `/api/v1/sent/${encodeURIComponent(id)}`,
          { method: 'DELETE' }
        );

        if (res.ok && res.data?.deleted) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    // Refresh list after bulk delete
    await fetchSentMessages(true);
    setSelectedSentMessage(null);

    if (failedCount === 0) {
      toast.success(`${successCount} message${successCount > 1 ? 's' : ''} deleted`);
    } else {
      toast.warning(`${successCount}/${messageIds.length} messages deleted`);
    }

    setLoading(prev => ({ ...prev, bulkDeleting: false }));
    return { success: successCount, failed: failedCount };
  }, [fetchSentMessages]);

  const refreshSent = useCallback(() => {
    fetchSentMessages(true);
  }, [fetchSentMessages]);

  return {
    sentMessages,
    selectedSentMessage,
    hasMore,
    rateLimit,
    loading,
    error,
    setError,
    fetchSentMessages,
    loadMoreSent,
    fetchSentMessage,
    sendEmail,
    refreshSent,
    setSelectedSentMessage,
    deleteSentMessage,
    bulkDeleteSentMessages,
  };
}
