import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMailApi } from '@/hooks/useMailApi';
import { useIsMobile } from '@/hooks/use-mobile';
import { TopBar } from '@/components/TopBar';
import { MessageList } from '@/components/MessageList';
import { MessageViewer } from '@/components/MessageViewer';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Skeleton } from '@/components/ui/skeleton';

const Inbox = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, loading: authLoading, logout, isAuthenticated } = useAuth();
  
  const [mobileView, setMobileView] = useState<'list' | 'viewer'>('list');

  const {
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
  } = useMailApi();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSelectMessage = (id: string) => {
    fetchMessage(id);
    if (isMobile) {
      setMobileView('viewer');
    }
  };

  const handleBackToList = () => {
    setMobileView('list');
    setSelectedMessage(null);
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar
        domains={domains}
        selectedDomain={selectedDomain}
        allDomainsValue={ALL_DOMAINS}
        onDomainChange={handleDomainChange}
        onRefresh={refreshMessages}
        loading={loading.messages || loading.domains}
        user={user}
        onLogout={logout}
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="flex-1 p-4 md:p-6 overflow-hidden">
        {/* Main Content - Two Column Layout */}
        <div className="pastel-card flex-1 overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
          {isMobile ? (
            // Mobile: Stacked Layout
            <div className="h-full">
              {mobileView === 'list' ? (
                <MessageList
                  messages={messages}
                  selectedId={selectedMessage?.id || null}
                  onSelect={handleSelectMessage}
                  loading={loading.messages}
                />
              ) : (
                <MessageViewer
                  message={selectedMessage}
                  loading={loading.message}
                  deleting={loading.deleting}
                  onBack={handleBackToList}
                  onDelete={deleteMessage}
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
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <MessageViewer
                  message={selectedMessage}
                  loading={loading.message}
                  deleting={loading.deleting}
                  onDelete={deleteMessage}
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
