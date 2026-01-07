import { useState, useCallback, useRef } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { MessagePreview, Message, ApiResponse, DomainPermission, PermissionMode, DomainsData } from '@/types/mail';
import { toast } from 'sonner';

const DOMAIN_STORAGE_KEY = 'tempmail_selected_domain';
const EMAIL_STORAGE_KEY = 'tempmail_selected_email';
const ITEMS_PER_PAGE_KEY = 'tempmail_items_per_page';

function getStoredDomain(): string {
  try {
    return localStorage.getItem(DOMAIN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function setStoredDomain(domain: string): void {
  try {
    if (!domain) {
      localStorage.removeItem(DOMAIN_STORAGE_KEY);
    } else {
      localStorage.setItem(DOMAIN_STORAGE_KEY, domain);
    }
  } catch {
    // Ignore storage errors
  }
}

function getStoredEmail(): string {
  try {
    return localStorage.getItem(EMAIL_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function setStoredEmail(email: string): void {
  try {
    if (!email) {
      localStorage.removeItem(EMAIL_STORAGE_KEY);
    } else {
      localStorage.setItem(EMAIL_STORAGE_KEY, email);
    }
  } catch {
    // Ignore storage errors
  }
}

function getStoredItemsPerPage(): number {
  try {
    const stored = localStorage.getItem(ITEMS_PER_PAGE_KEY);
    const value = stored ? parseInt(stored, 10) : 20;
    return [10, 20, 50, 100].includes(value) ? value : 20;
  } catch {
    return 20;
  }
}

function setStoredItemsPerPage(value: number): void {
  try {
    localStorage.setItem(ITEMS_PER_PAGE_KEY, String(value));
  } catch {
    // Ignore storage errors
  }
}

export function useMailApi() {
  const [domains, setDomains] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<DomainPermission[]>([]);
  const [hasOnlySelfOnlyMode, setHasOnlySelfOnlyMode] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<string>(getStoredDomain);
  const [selectedEmail, setSelectedEmail] = useState<string>(getStoredEmail);
  const [messages, setMessages] = useState<MessagePreview[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState({
    domains: true,
    messages: false,
    message: false,
    deleting: false,
    bulkDeleting: false,
    clearingInbox: false,
  });
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(getStoredItemsPerPage);
  const [totalItems, setTotalItems] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get permission mode for a domain
  const getPermissionMode = useCallback((domain: string): PermissionMode | null => {
    const permission = permissions.find((p) => p.domain === domain);
    return permission?.mode || null;
  }, [permissions]);

  // Get current permission mode
  const currentPermissionMode = getPermissionMode(selectedDomain);

  const fetchDomains = useCallback(async () => {
    // Clear previous error state before fetching
    setError(null);
    setLoading((prev) => ({ ...prev, domains: true }));
    try {
      const res = await apiFetch<ApiResponse<DomainsData>>(
        '/api/v1/domains'
      );
      if (res.ok && res.data) {
        const domainList = res.data.domains || [];
        const permissionList = res.data.permissions || [];
        
        setDomains(domainList);
        setPermissions(permissionList);
        setHasOnlySelfOnlyMode(res.data.hasOnlySelfOnlyMode || false);
        setUserEmail(res.data.userEmail || '');

        // Auto-select "all" if available, otherwise first domain
        const storedDomain = getStoredDomain();
        if (!storedDomain || !domainList.includes(storedDomain)) {
          if (domainList.includes('all')) {
            setSelectedDomain('all');
            setStoredDomain('all');
          } else if (domainList.length > 0) {
            setSelectedDomain(domainList[0]);
            setStoredDomain(domainList[0]);
          }
        }
      }
    } catch (err) {
      const apiErr = err as ApiError;
      // Don't show error toast for 401 (will redirect to login)
      if (apiErr.status !== 401) {
        setError(`Failed to fetch domains: ${apiErr.message}`);
        toast.error('Failed to load domains');
      }
    } finally {
      setLoading((prev) => ({ ...prev, domains: false }));
    }
  }, []);

  const fetchMessages = useCallback(async (page?: number, limit?: number) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const usePage = page ?? currentPage;
    const useLimit = limit ?? itemsPerPage;
    const offset = (usePage - 1) * useLimit;

    // SELF_ONLY mode: always use email parameter
    if (hasOnlySelfOnlyMode) {
      if (!userEmail) {
        setMessages([]);
        setTotalItems(0);
        return;
      }

      setLoading((prev) => ({ ...prev, messages: true }));
      setError(null);

      try {
        const url = `/api/v1/messages?email=${encodeURIComponent(userEmail)}&limit=${useLimit}&offset=${offset}`;
        console.log('[Messages] SELF_ONLY fetch:', url);

        const res = await apiFetch<ApiResponse<{ messages: MessagePreview[]; total?: number }>>(
          url,
          { signal: abortControllerRef.current.signal }
        );

        if (res.ok && res.data) {
          const msgs = res.data.messages || [];
          setMessages(msgs);
          
          // Handle total count - backend may or may not return it
          if (typeof res.data.total === 'number') {
            setTotalItems(res.data.total);
          } else {
            // Estimate: if full page returned, assume there are more
            const loadedSoFar = (usePage - 1) * useLimit + msgs.length;
            if (msgs.length === useLimit) {
              setTotalItems(Math.max(totalItems, loadedSoFar + useLimit));
            } else {
              setTotalItems(loadedSoFar);
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        
        const apiErr = err as ApiError;
        if (apiErr.status === 403) {
          setError('Access denied. You may not have permission for this resource.');
          toast.error('Access denied');
        } else if (apiErr.status === 401) {
          setError('Session expired. Please log in again.');
        } else {
          setError(apiErr.message || 'Failed to fetch messages');
        }
        
        setMessages([]);
        setTotalItems(0);
        console.error('[Mail] Fetch messages error:', err);
      } finally {
        setLoading((prev) => ({ ...prev, messages: false }));
      }
      return;
    }

    // Normal mode: use domain parameter
    if (!selectedDomain) {
      setMessages([]);
      setTotalItems(0);
      return;
    }

    const mode = getPermissionMode(selectedDomain);
    
    // For ADDRESS_ONLY mode, require email to be set
    if (mode === 'ADDRESS_ONLY' && !selectedEmail) {
      setMessages([]);
      setTotalItems(0);
      return;
    }

    setLoading((prev) => ({ ...prev, messages: true }));
    setError(null);

    try {
      let baseUrl: string;
      
      if (mode === 'ADDRESS_ONLY' && selectedEmail) {
        baseUrl = `/api/v1/messages?email=${encodeURIComponent(selectedEmail)}`;
      } else {
        baseUrl = `/api/v1/messages?domain=${encodeURIComponent(selectedDomain)}`;
      }
      
      const url = `${baseUrl}&limit=${useLimit}&offset=${offset}`;
      console.log('[Messages] Normal fetch:', url);

      const res = await apiFetch<ApiResponse<{ messages: MessagePreview[]; total?: number }>>(
        url,
        { signal: abortControllerRef.current.signal }
      );

      if (res.ok && res.data) {
        const msgs = res.data.messages || [];
        setMessages(msgs);
        
        // Handle total count
        if (typeof res.data.total === 'number') {
          setTotalItems(res.data.total);
        } else {
          const loadedSoFar = (usePage - 1) * useLimit + msgs.length;
          if (msgs.length === useLimit) {
            setTotalItems(Math.max(totalItems, loadedSoFar + useLimit));
          } else {
            setTotalItems(loadedSoFar);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      
      const apiErr = err as ApiError;
      
      // Handle specific error cases
      if (apiErr.status === 403) {
        setError('Access denied. You may not have permission for this resource.');
        toast.error('Access denied');
      } else if (apiErr.status === 401) {
        // Will be handled by auth redirect
        setError('Session expired. Please log in again.');
      } else {
        setError(apiErr.message || 'Failed to fetch messages');
      }
      
      setMessages([]);
      setTotalItems(0);
      console.error('[Mail] Fetch messages error:', err);
    } finally {
      setLoading((prev) => ({ ...prev, messages: false }));
    }
  }, [hasOnlySelfOnlyMode, userEmail, selectedDomain, selectedEmail, getPermissionMode, currentPage, itemsPerPage, totalItems]);

  const fetchMessagesByEmail = useCallback(async (email: string): Promise<number> => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading((prev) => ({ ...prev, messages: true }));
    setError(null);

    try {
      const res = await apiFetch<ApiResponse<{ messages: MessagePreview[] }>>(
        `/api/v1/messages?email=${encodeURIComponent(email)}`,
        { signal: abortControllerRef.current.signal }
      );

      if (res.ok && res.data) {
        const msgs = res.data.messages || [];
        setMessages(msgs);
        setSelectedEmail(email);
        setStoredEmail(email);
        return msgs.length;
      }
      return 0;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 0;
      
      const apiErr = err as ApiError;
      
      if (apiErr.status === 403) {
        setError('Access denied. You may not have permission for this email.');
        toast.error('Access denied');
      } else if (apiErr.status === 404) {
        // 404 means no messages - not an error
        setMessages([]);
        setSelectedEmail(email);
        setStoredEmail(email);
        return 0;
      } else {
        setError(apiErr.message || 'Failed to fetch messages');
        toast.error('Failed to load messages');
      }
      
      console.error('[Mail] Fetch messages by email error:', err);
      return 0;
    } finally {
      setLoading((prev) => ({ ...prev, messages: false }));
    }
  }, []);

  const fetchMessage = useCallback(async (messageId: string) => {
    setLoading((prev) => ({ ...prev, message: true }));

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
      
      if (apiErr.status === 403) {
        setError('Access denied. Cannot access this message.');
        toast.error('Cannot access this message');
      } else {
        setError(`Failed to fetch message: ${apiErr.message}`);
        toast.error('Failed to load message');
      }
    } finally {
      setLoading((prev) => ({ ...prev, message: false }));
    }
  }, []);

  const handleDomainChange = useCallback((domain: string) => {
    setSelectedDomain(domain);
    setSelectedMessage(null);
    setMessages([]);
    setError(null);
    setStoredDomain(domain);
    
    // Clear selected email when changing domain
    setSelectedEmail('');
    setStoredEmail('');
    
    // Reset pagination
    setCurrentPage(1);
    setTotalItems(0);
  }, []);

  const handleEmailChange = useCallback((email: string) => {
    setSelectedEmail(email);
    setStoredEmail(email);
    setSelectedMessage(null);
    
    // Reset pagination
    setCurrentPage(1);
    setTotalItems(0);
  }, []);

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((value: number) => {
    setItemsPerPage(value);
    setStoredItemsPerPage(value);
    setCurrentPage(1); // Reset to first page
  }, []);

  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    setLoading((prev) => ({ ...prev, deleting: true }));
    
    try {
      const res = await apiFetch<ApiResponse<null>>(
        `/api/v1/messages/${encodeURIComponent(messageId)}`,
        { method: 'DELETE' }
      );
      
      if (res.ok) {
        // Find index of deleted message
        const idx = messages.findIndex((m) => m.id === messageId);
        const newMessages = messages.filter((m) => m.id !== messageId);
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
      setLoading((prev) => ({ ...prev, deleting: false }));
    }
  }, [messages]);

  const clearInbox = useCallback(async (): Promise<boolean> => {
    setLoading((prev) => ({ ...prev, clearingInbox: true }));
    
    try {
      // Delete all messages one by one (or use bulk endpoint if available)
      const deletePromises = messages.map((m) =>
        apiFetch<ApiResponse<null>>(
          `/api/v1/messages/${encodeURIComponent(m.id)}`,
          { method: 'DELETE' }
        )
      );
      
      const results = await Promise.allSettled(deletePromises);
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      
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
      setLoading((prev) => ({ ...prev, clearingInbox: false }));
    }
  }, [messages, fetchMessages]);

  const bulkDeleteMessages = useCallback(async (messageIds: string[]): Promise<{ total: number; failed: number }> => {
    setLoading((prev) => ({ ...prev, bulkDeleting: true }));
    
    try {
      const results = await Promise.allSettled(
        messageIds.map((id) =>
          apiFetch<ApiResponse<null>>(
            `/api/v1/messages/${encodeURIComponent(id)}`,
            { method: 'DELETE' }
          )
        )
      );
      
      const failed = results.filter((r) => r.status === 'rejected').length;
      const successCount = messageIds.length - failed;
      
      // Update local state
      const deletedIds = new Set(messageIds);
      setMessages((prev) => prev.filter((m) => !deletedIds.has(m.id)));
      
      // Clear selected message if it was deleted
      if (selectedMessage && deletedIds.has(selectedMessage.id)) {
        setSelectedMessage(null);
      }
      
      if (failed === 0) {
        toast.success(`${successCount} email${successCount > 1 ? 's' : ''} deleted successfully`);
      } else if (successCount > 0) {
        toast.warning(`${successCount}/${messageIds.length} emails deleted. ${failed} failed.`);
      } else {
        toast.error('Failed to delete emails');
      }
      
      return { total: messageIds.length, failed };
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error('Failed to delete emails');
      console.error('[Mail] Bulk delete error:', apiErr);
      return { total: messageIds.length, failed: messageIds.length };
    } finally {
      setLoading((prev) => ({ ...prev, bulkDeleting: false }));
    }
  }, [selectedMessage]);

  const refreshMessages = useCallback(() => {
    fetchMessages();
    toast.success('Refreshed');
  }, [fetchMessages]);

  // Get inbox email based on selected domain/email
  const getInboxEmail = useCallback((): string | undefined => {
    if (selectedEmail) {
      return selectedEmail;
    }
    
    if (domains.length === 0 || !selectedDomain) return undefined;
    
    return `inbox@${selectedDomain}`;
  }, [domains, selectedDomain, selectedEmail]);

  return {
    domains,
    permissions,
    hasOnlySelfOnlyMode,
    userEmail,
    selectedDomain,
    selectedEmail,
    messages,
    selectedMessage,
    loading,
    error,
    currentPermissionMode,
    // Pagination
    currentPage,
    itemsPerPage,
    totalItems,
    handlePageChange,
    handleItemsPerPageChange,
    // Actions
    setError,
    handleDomainChange,
    handleEmailChange,
    fetchMessage,
    fetchMessages,
    fetchMessagesByEmail,
    setSelectedMessage,
    refreshMessages,
    deleteMessage,
    bulkDeleteMessages,
    clearInbox,
    fetchDomains,
    getInboxEmail,
    getPermissionMode,
  };
}
