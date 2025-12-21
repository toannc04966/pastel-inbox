import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMailApi } from '@/hooks/useMailApi';
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

const Inbox = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, loading: authLoading, logout, isAuthenticated } = useAuth();
  const { setDomainAccent } = useTheme();
  
  const [mobileView, setMobileView] = useState<'list' | 'viewer'>('list');
  const [searchQuery, setSearchQuery] = useState('');

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
    clearInbox,
    fetchDomains,
    fetchMessages,
    getInboxEmail,
    getPermissionMode,
  } = useMailApi();

  const { addRecentEmail, getRecentEmails, removeRecentEmail } = useRecentEmails();
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

  // Handle email submission for ADDRESS_ONLY mode
  const handleEmailSubmit = async (email: string) => {
    const count = await fetchMessagesByEmail(email);
    addRecentEmail(selectedDomain, email, count);
    
    // Stay on list view for mobile
    if (isMobile) {
      setMobileView('list');
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

  // Fetch messages when domain changes (only for ALL_INBOXES mode)
  useEffect(() => {
    if (currentPermissionMode === 'ALL_INBOXES') {
      fetchMessages();
    }
  }, [fetchMessages, currentPermissionMode, selectedDomain]);

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

  // Determine if we should show the address input (ADDRESS_ONLY without email selected)
  const showAddressInput = currentPermissionMode === 'ADDRESS_ONLY' && !selectedEmail;
  
  // Show domain badge when viewing "all" domains
  const showDomainBadge = selectedDomain === 'all';
  
  // Get recent emails for current domain
  const recentEmails = getRecentEmails(selectedDomain);

  // Render the message list or address input based on mode
  const renderListPanel = () => {
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
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="flex-1 p-2 md:p-6 overflow-hidden">
        {/* Main Content - Responsive Layout */}
        <div className="pastel-card flex-1 overflow-hidden h-[calc(100vh-88px)] md:h-[calc(100vh-140px)]">
          {isMobile ? (
            // Mobile: Single column, switch between list and detail
            <div className="h-full overflow-hidden">
              {mobileView === 'list' ? (
                renderListPanel()
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
                {renderListPanel()}
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
