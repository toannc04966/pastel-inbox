import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useMailApi } from '@/hooks/useMailApi';
import { API_BASE } from '@/lib/api';
import { useSentApi } from '@/hooks/useSentApi';
import { useRecentEmails } from '@/hooks/useRecentEmails';
import { useIsMobile } from '@/hooks/use-mobile';
import { useReadState } from '@/hooks/useReadState';
import { useSmartRefresh } from '@/hooks/useSmartRefresh';
import { useTheme } from '@/contexts/ThemeContext';
import { TopBar } from '@/components/TopBar';
import { MessageList } from '@/components/MessageList';
import { MessageViewer } from '@/components/MessageViewer';
import { AddressOnlyInput } from '@/components/AddressOnlyInput';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { MailboxTabs, MailboxTab } from '@/components/MailboxTabs';
import { SentList } from '@/components/SentList';
import { SentMessageViewer } from '@/components/SentMessageViewer';
import { ComposeModal } from '@/components/ComposeModal';
import { Button } from '@/components/ui/button';
import { PenSquare, GripVertical } from 'lucide-react';
import type { Message } from '@/types/mail';

const Inbox = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user, loading: authLoading, logout, isAuthenticated } = useAuth();
  const { setDomainAccent } = useTheme();

  // Clear any stale error toasts on route change or mount
  useEffect(() => {
    toast.dismiss();
  }, [location.pathname]);
  
  const [mobileView, setMobileView] = useState<'list' | 'viewer'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<MailboxTab>('inbox');
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [replyAll, setReplyAll] = useState(false);
  const [forward, setForward] = useState<Message | null>(null);

  const {
    domains,
    permissions,
    selectedDomain,
    selectedEmail,
    messages,
    selectedMessage,
    loading,
    error,
    currentPermissionMode,
    setError,
    handleDomainChange: originalHandleDomainChange,
    handleEmailChange,
    fetchMessage,
    fetchMessagesByEmail,
    setSelectedMessage,
    refreshMessages,
    deleteMessage,
    bulkDeleteMessages,
    clearInbox,
    fetchDomains,
    fetchMessages,
    getInboxEmail,
    getPermissionMode,
  } = useMailApi();

  const {
    sentMessages,
    selectedSentMessage,
    hasMore: hasMoreSent,
    loading: sentLoading,
    error: sentError,
    fetchSentMessages,
    loadMoreSent,
    fetchSentMessage,
    setSelectedSentMessage,
    deleteSentMessage,
    bulkDeleteSentMessages,
  } = useSentApi();

  const { addRecentEmail, getRecentEmails, removeRecentEmail } = useRecentEmails();
  const { isRead, markAsRead, markAsUnread, clearReadState } = useReadState();
  
  const { autoRefreshEnabled, toggleAutoRefresh, isPaused } = useSmartRefresh(
    fetchMessages,
    30000
  );

  // Fetch send config to check if user has only SELF_ONLY mode
  const { data: sendConfigData } = useQuery({
    queryKey: ['send-config'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/send/config`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch send config');
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: isAuthenticated,
  });

  const hasOnlySelfOnlyMode = sendConfigData?.data?.hasOnlySelfOnlyMode || false;
  const selfOnlyEmail = sendConfigData?.data?.defaultFrom || '';

  // For SELF_ONLY users, auto-fetch their inbox by email
  useEffect(() => {
    if (hasOnlySelfOnlyMode && selfOnlyEmail && !selectedEmail) {
      fetchMessagesByEmail(selfOnlyEmail);
    }
  }, [hasOnlySelfOnlyMode, selfOnlyEmail, selectedEmail, fetchMessagesByEmail]);

  // Wrap domain change to update accent color and reset mobile view
  const handleDomainChange = (domain: string) => {
    originalHandleDomainChange(domain);
    setDomainAccent(domain);
    if (isMobile) {
      setMobileView('list');
      setSelectedMessage(null);
    }
  };

  // Handle email submission for ADDRESS_ONLY mode
  const handleEmailSubmit = async (email: string) => {
    const count = await fetchMessagesByEmail(email);
    addRecentEmail(selectedDomain, email, count);
    if (isMobile) {
      setMobileView('list');
    }
  };

  // Wrap refresh to reset mobile view
  const handleRefresh = () => {
    if (activeTab === 'inbox') {
      // SELF_ONLY users: always refresh by their email
      if (hasOnlySelfOnlyMode && selfOnlyEmail) {
        fetchMessagesByEmail(selfOnlyEmail);
      } else {
        refreshMessages();
      }
    } else {
      fetchSentMessages(true);
    }
    if (isMobile) {
      setMobileView('list');
      setSelectedMessage(null);
      setSelectedSentMessage(null);
    }
  };

  // Wrap clear inbox to reset mobile view
  const handleClearInboxWithReset = async (): Promise<boolean> => {
    const success = await clearInbox();
    if (success) {
      clearReadState();
      if (isMobile) {
        setMobileView('list');
        setSelectedMessage(null);
      }
    }
    return success;
  };

  // Fetch domains on mount
  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // Fetch messages when domain changes (only for ALL_INBOXES mode)
  useEffect(() => {
    if (currentPermissionMode === 'ALL_INBOXES') {
      fetchMessages();
    }
  }, [fetchMessages, currentPermissionMode, selectedDomain]);

  // Fetch sent messages when tab changes to sent
  useEffect(() => {
    if (activeTab === 'sent' && sentMessages.length === 0) {
      fetchSentMessages(true);
    }
  }, [activeTab, fetchSentMessages, sentMessages.length]);

  // Set initial domain accent
  useEffect(() => {
    setDomainAccent(selectedDomain);
  }, [selectedDomain, setDomainAccent]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSelectMessage = (id: string) => {
    fetchMessage(id);
    markAsRead(id);
    if (isMobile) {
      setMobileView('viewer');
    }
  };

  const handleSelectSentMessage = (id: string) => {
    fetchSentMessage(id);
    if (isMobile) {
      setMobileView('viewer');
    }
  };

  const handleBackToList = () => {
    setMobileView('list');
    setSelectedMessage(null);
    setSelectedSentMessage(null);
  };

  const handleMarkAsUnread = (id: string) => {
    markAsUnread(id);
  };

  const handleTabChange = (tab: MailboxTab) => {
    // Prevent navigation to tabs for SELF_ONLY users
    if (hasOnlySelfOnlyMode) return;
    
    setActiveTab(tab);
    setMobileView('list');
    setSelectedMessage(null);
    setSelectedSentMessage(null);
  };

  const handleComposeSent = () => {
    setActiveTab('sent');
    fetchSentMessages(true);
  };

  const handleReply = (message: Message, all: boolean = false) => {
    setReplyTo(message);
    setReplyAll(all);
    setForward(null);
    setComposeOpen(true);
  };

  const handleForward = (message: Message) => {
    setForward(message);
    setReplyTo(null);
    setReplyAll(false);
    setComposeOpen(true);
  };

  // Show loading skeleton while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="h-16 border-b border-border/50 bg-card">
          <div className="h-full px-4 flex items-center">
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <div className="flex-1 p-4 md:p-6">
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const inboxEmail = getInboxEmail();
  const showAddressInput = currentPermissionMode === 'ADDRESS_ONLY' && !selectedEmail;
  const showDomainBadge = selectedDomain === 'all';
  const recentEmails = getRecentEmails(selectedDomain);

  // Render the message list or address input based on mode
  const renderListPanel = () => {
    if (activeTab === 'sent') {
      return (
        <SentList
          messages={sentMessages}
          selectedId={selectedSentMessage?.id || null}
          onSelect={handleSelectSentMessage}
          loading={sentLoading.list}
          hasMore={hasMoreSent}
          onLoadMore={loadMoreSent}
          onDelete={deleteSentMessage}
          onBulkDelete={bulkDeleteSentMessages}
          deleting={sentLoading.deleting}
          bulkDeleting={sentLoading.bulkDeleting}
        />
      );
    }

    if (showAddressInput) {
      return (
        <AddressOnlyInput
          domain={selectedDomain}
          recentEmails={recentEmails}
          onSubmit={handleEmailSubmit}
          onRemoveRecent={(email) => removeRecentEmail(selectedDomain, email)}
          loading={loading.messages}
        />
      );
    }

    return (
      <MessageList
        messages={messages}
        selectedId={selectedMessage?.id || null}
        onSelect={handleSelectMessage}
        loading={loading.messages}
        isRead={isRead}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showDomainBadge={showDomainBadge}
        onDelete={deleteMessage}
        onBulkDelete={bulkDeleteMessages}
        deleting={loading.deleting}
        bulkDeleting={loading.bulkDeleting}
        allowedDomains={sendConfigData?.data?.allowedDomains || []}
        onReply={(message) => {
          // Convert MessagePreview to Message for reply
          const fullMessage = { ...message, inboxId: message.inboxId || '' } as unknown as Message;
          handleReply(fullMessage);
        }}
      />
    );
  };

  const renderViewerPanel = () => {
    if (activeTab === 'sent') {
      return (
        <SentMessageViewer
          message={selectedSentMessage}
          loading={sentLoading.detail}
          onBack={handleBackToList}
          showBackButton={isMobile}
        />
      );
    }

    return (
      <MessageViewer
        message={selectedMessage}
        loading={loading.message}
        deleting={loading.deleting}
        onBack={handleBackToList}
        onDelete={deleteMessage}
        onMarkAsUnread={handleMarkAsUnread}
        showBackButton={isMobile}
        onReply={() => selectedMessage && handleReply(selectedMessage)}
        onReplyAll={() => selectedMessage && handleReply(selectedMessage, true)}
        onForward={() => selectedMessage && handleForward(selectedMessage)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar
        domains={domains}
        permissions={permissions}
        selectedDomain={selectedDomain}
        selectedEmail={selectedEmail}
        onDomainChange={handleDomainChange}
        onEmailClear={() => handleEmailChange('')}
        onRefresh={handleRefresh}
        onClearInbox={handleClearInboxWithReset}
        loading={loading.messages || loading.domains}
        clearingInbox={loading.clearingInbox}
        user={user}
        onLogout={logout}
        inboxEmail={inboxEmail}
        autoRefreshEnabled={autoRefreshEnabled}
        autoRefreshPaused={isPaused}
        onToggleAutoRefresh={toggleAutoRefresh}
        messageCount={messages.length}
        getPermissionMode={getPermissionMode}
        onCompose={() => {
          setReplyTo(null);
          setReplyAll(false);
          setForward(null);
          setComposeOpen(true);
        }}
      />

      {(error || sentError) && <ErrorBanner message={error || sentError || ''} onDismiss={() => setError(null)} />}

      <div className="flex-1 p-2 md:p-6 overflow-hidden">
        <div className="pastel-card flex-1 overflow-hidden h-[calc(100vh-88px)] md:h-[calc(100vh-140px)] flex flex-col">
          {/* Mailbox Tabs - Hidden for SELF_ONLY users */}
          <MailboxTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            inboxCount={messages.length}
            sentCount={sentMessages.length}
            hidden={hasOnlySelfOnlyMode}
          />

          {isMobile ? (
            <div className="flex-1 overflow-hidden">
              {mobileView === 'list' ? renderListPanel() : renderViewerPanel()}
            </div>
          ) : (
            <PanelGroup direction="horizontal" className="flex-1">
              {/* Left: Message List */}
              <Panel defaultSize={35} minSize={25} maxSize={50}>
                <div className="h-full overflow-hidden border-r border-border/50">
                  {renderListPanel()}
                </div>
              </Panel>

              {/* Resize Handle */}
              <PanelResizeHandle className="w-1.5 bg-border/30 hover:bg-primary/50 transition-colors flex items-center justify-center group">
                <GripVertical className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </PanelResizeHandle>

              {/* Right: Message Detail */}
              <Panel defaultSize={65} minSize={40}>
                <div className="h-full overflow-hidden">
                  {renderViewerPanel()}
                </div>
              </Panel>
            </PanelGroup>
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      {isMobile && mobileView === 'list' && (
        <Button
          size="lg"
          className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50"
          onClick={() => {
            setReplyTo(null);
            setReplyAll(false);
            setForward(null);
            setComposeOpen(true);
          }}
        >
          <PenSquare className="w-6 h-6" />
        </Button>
      )}

      {/* Compose Modal */}
      <ComposeModal
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSent={handleComposeSent}
        replyTo={replyTo}
        replyAll={replyAll}
        forward={forward}
      />
    </div>
  );
};

export default Inbox;
