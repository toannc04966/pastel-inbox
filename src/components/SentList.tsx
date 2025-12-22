import { formatDistanceToNow, format } from 'date-fns';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SentMessagePreview } from '@/types/sent';

interface SentListProps {
  messages: SentMessagePreview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

function SkeletonList() {
  return (
    <div className="p-2 space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-3 rounded-xl">
          <div className="flex items-start gap-2">
            <Skeleton className="w-5 h-5 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 h-full">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Mail className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-center text-sm">
        No sent messages yet
      </p>
      <p className="text-muted-foreground/60 text-center text-xs mt-1">
        Compose your first email!
      </p>
    </div>
  );
}

export function SentList({
  messages,
  selectedId,
  onSelect,
  loading,
  hasMore,
  onLoadMore,
}: SentListProps) {
  const formatRecipients = (to: string[]): string => {
    if (to.length === 0) return '(unknown)';
    if (to.length === 1) return to[0];
    return `${to[0]} +${to.length - 1}`;
  };

  const formatTime = (timestamp: number): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      // Less than 24 hours ago
      if (diff < 24 * 60 * 60 * 1000) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
      
      // Less than 7 days ago
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return format(date, 'EEEE');
      }
      
      return format(date, 'MMM d');
    } catch {
      return '';
    }
  };

  if (loading && messages.length === 0) {
    return <SkeletonList />;
  }

  if (!loading && messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {messages.map((msg) => (
          <button
            key={msg.id}
            onClick={() => onSelect(msg.id)}
            className={cn(
              'w-full text-left p-3 rounded-xl transition-colors',
              'hover:bg-muted/50',
              selectedId === msg.id && 'bg-muted'
            )}
          >
            <div className="flex items-start gap-2">
              {/* Status icon */}
              <div className="mt-0.5">
                {msg.status === 'sent' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Recipients */}
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-medium text-sm text-foreground truncate">
                    {formatRecipients(msg.to)}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTime(msg.created_at)}
                  </span>
                </div>

                {/* Subject */}
                <p className="text-sm text-muted-foreground truncate">
                  {msg.subject || '(No subject)'}
                </p>
              </div>
            </div>
          </button>
        ))}

        {/* Load more */}
        {hasMore && (
          <div className="pt-2 pb-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load more'
              )}
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
