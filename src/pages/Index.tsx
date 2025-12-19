import { useState, useEffect } from 'react';
import { TopBar } from '@/components/TopBar';
import { AddressCard } from '@/components/AddressCard';
import { MessageList } from '@/components/MessageList';
import { MessageViewer } from '@/components/MessageViewer';
import { ErrorBanner } from '@/components/ErrorBanner';
import { useMailApi } from '@/hooks/useMailApi';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const isMobile = useIsMobile();
  const [selectedDomain, setSelectedDomain] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'viewer'>('list');

  const {
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
  } = useMailApi();

  // Set default domain when domains load
  useEffect(() => {
    if (domains.length > 0 && !selectedDomain) {
      setSelectedDomain(domains[0]);
    }
  }, [domains, selectedDomain]);

  const handleGenerate = () => {
    generateInbox(selectedDomain);
  };

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar
        domains={domains}
        selectedDomain={selectedDomain}
        onDomainChange={setSelectedDomain}
        onGenerate={handleGenerate}
        loading={loading.inbox || loading.domains}
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="flex-1 p-4 md:p-6 overflow-hidden">
        {/* Address Card */}
        <div className="mb-4 md:mb-6">
          <AddressCard
            inbox={inbox}
            onRegenerate={handleGenerate}
            loading={loading.inbox}
          />
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="pastel-card flex-1 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
          {isMobile ? (
            // Mobile: Stacked Layout
            <div className="h-full">
              {mobileView === 'list' ? (
                <MessageList
                  messages={messages}
                  selectedId={selectedMessage?.id || null}
                  onSelect={handleSelectMessage}
                  loading={loading.messages}
                  hasInbox={!!inbox}
                />
              ) : (
                <MessageViewer
                  message={selectedMessage}
                  loading={loading.message}
                  onBack={handleBackToList}
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
                  hasInbox={!!inbox}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <MessageViewer
                  message={selectedMessage}
                  loading={loading.message}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
