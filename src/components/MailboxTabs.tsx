import { cn } from '@/lib/utils';
import { Inbox, Send } from 'lucide-react';

export type MailboxTab = 'inbox' | 'sent';

interface MailboxTabsProps {
  activeTab: MailboxTab;
  onTabChange: (tab: MailboxTab) => void;
  inboxCount?: number;
  sentCount?: number;
  hidden?: boolean;
}

export function MailboxTabs({
  activeTab,
  onTabChange,
  inboxCount,
  sentCount,
  hidden = false,
}: MailboxTabsProps) {
  // Don't render tabs if hidden (SELF_ONLY users)
  if (hidden) {
    return null;
  }

  return (
    <div className="flex border-b border-border/50 bg-card/50">
      <button
        onClick={() => onTabChange('inbox')}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative',
          activeTab === 'inbox'
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Inbox className="w-4 h-4" />
        <span>Inbox</span>
        {inboxCount !== undefined && inboxCount > 0 && (
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded-full',
            activeTab === 'inbox' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            {inboxCount > 99 ? '99+' : inboxCount}
          </span>
        )}
        {activeTab === 'inbox' && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
        )}
      </button>

      <button
        onClick={() => onTabChange('sent')}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative',
          activeTab === 'sent'
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Send className="w-4 h-4" />
        <span>Sent</span>
        {sentCount !== undefined && sentCount > 0 && (
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded-full',
            activeTab === 'sent' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            {sentCount > 99 ? '99+' : sentCount}
          </span>
        )}
        {activeTab === 'sent' && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
        )}
      </button>
    </div>
  );
}
