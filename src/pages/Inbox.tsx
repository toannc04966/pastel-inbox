import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMailApi } from '@/hooks/useMailApi';
import { useIsMobile } from '@/hooks/use-mobile';
import { useReadState } from '@/hooks/useReadState';
import { useSmartRefresh } from '@/hooks/useSmartRefresh';
import { useTheme } from '@/contexts/ThemeContext';
import { TopBar } from '@/components/TopBar';
import { MessageList } from '@/components/MessageList';
import { MessageViewer } from '@/components/MessageViewer';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Skeleton } from '@/components/ui/skeleton';

const Inbox = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, loading: authLoading, logout, isAuthenticated } = useAuth();
  const { setDomainAccent } = useTheme();
  
  const [mobileView, setMobileView] = useState<'list' | 'viewer'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    domains,
    selectedDomain,
    messages,
    selectedMessage,
    loading,
    error,
    setError,
    handleDomainChange: originalHandleDomainChange,
    fetchMessage,
    setSelectedMessage,
    refreshMessages,
    deleteMessage,
    clearInbox,
    fetchDomains,
    fetchMessages,
    getInboxEmail,
    ALL_DOMAINS,
  } = useMailApi();

  const { isRead, markAsRead, markAsUnread, clearReadState } = useReadState();
  
  const { autoRefreshEnabled, toggleAutoRefresh, isPaused } = useSmartRefresh(
    fetchMessages,
    30000
  );

  // Wrap domain change to update accent color and reset mobile view
  const handleDomainChange = (domain: string) => {
    originalHandleDomainChange(domain);
    setDomainAccent(domain);
    // Reset to list view on mobile when changing domain
    if (isMobile) {
      setMobileView('list');
      setSelectedMessage(null);
    }
  };

  // Wrap refresh to reset mobile view
  const handleRefresh = () => {
    refreshMessages();
    // Reset to list view on mobile when refreshing
    if (isMobile) {
      setMobileView('list');
      setSelectedMessage(null);
    }
  };

  // Wrap clear inbox to reset mobile view
  const handleClearInboxWithReset = async (): Promise<boolean> => {
    const success = await clearInbox();
    if (success) {
      clearReadState();
      // Reset to list view on mobile when clearing inbox
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

  // Fetch messages when domain changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

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

  const handleBackToList = () => {
    setMobileView('list');
    setSelectedMessage(null);
  };

  const handleMarkAsUnread = (id: string) => {
    markAsUnread(id);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar
        domains={domains}
        selectedDomain={selectedDomain}
        allDomainsValue={ALL_DOMAINS}
        onDomainChange={handleDomainChange}
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
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="flex-1 p-2 md:p-6 overflow-hidden">
        {/* Main Content - Responsive Layout */}
        <div className="pastel-card flex-1 overflow-hidden h-[calc(100vh-88px)] md:h-[calc(100vh-140px)]">
          {isMobile ? (
            // Mobile: Single column, switch between list and detail
            <div className="h-full overflow-hidden">
              {mobileView === 'list' ? (
                <MessageList
                  messages={messages}
                  selectedId={selectedMessage?.id || null}
                  onSelect={handleSelectMessage}
                  loading={loading.messages}
                  isRead={isRead}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              ) : (
                <MessageViewer
                  message={selectedMessage}
                  loading={loading.message}
                  deleting={loading.deleting}
                  onBack={handleBackToList}
                  onDelete={deleteMessage}
                  onMarkAsUnread={handleMarkAsUnread}
                  showBackButton
                />
              )}
            </div>
          ) : (
            // Desktop: Two Column Layout
            <div className="flex h-full">
              <div className="w-[380px] border-r border-border/50 flex-shrink-0">
                <MessageList
                  messages={messages}
                  selectedId={selectedMessage?.id || null}
                  onSelect={handleSelectMessage}
                  loading={loading.messages}
                  isRead={isRead}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <MessageViewer
                  message={selectedMessage}
                  loading={loading.message}
                  deleting={loading.deleting}
                  onDelete={deleteMessage}
                  onMarkAsUnread={handleMarkAsUnread}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inbox;
