import { cn } from '@/lib/utils';
import { Inbox, Send, Mail } from 'lucide-react';

export type MailboxTab = 'inbox' | 'sent';

interface MailboxTabsProps {
  activeTab: MailboxTab;
  onTabChange: (tab: MailboxTab) => void;
  inboxCount?: number;
  sentCount?: number;
  hidden?: boolean;
  userEmail?: string;
}

export function MailboxTabs({
  activeTab,
  onTabChange,
  inboxCount,
  sentCount,
  hidden = false,
  userEmail,
}: MailboxTabsProps) {
  // For SELF_ONLY users: show "My Email" header instead of tabs
  if (hidden && userEmail) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-card/50">
        <Mail className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-sm font-medium text-foreground">My Email</h2>
          <p className="text-xs text-muted-foreground">{userEmail}</p>
        </div>
        {inboxCount !== undefined && inboxCount > 0 && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {inboxCount > 99 ? '99+' : inboxCount}
          </span>
        )}
      </div>
    );
  }

  // Don't render tabs if hidden without userEmail
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
