import { Search, Inbox } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import type { MessagePreview } from '@/types/mail';

interface MessageListProps {
  messages: MessagePreview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  hasInbox: boolean;
}

function SkeletonRow() {
  return (
    <div className="p-4 space-y-2">
      <div className="shimmer h-4 w-32 rounded" />
      <div className="shimmer h-3 w-48 rounded" />
      <div className="shimmer h-3 w-full rounded" />
    </div>
  );
}

export function MessageList({
  messages,
  selectedId,
  onSelect,
  loading,
  hasInbox,
}: MessageListProps) {
  const [search, setSearch] = useState('');

  const filteredMessages = useMemo(() => {
    if (!search.trim()) return messages;
    const query = search.toLowerCase();
    return messages.filter(
      (m) =>
        m.from.toLowerCase().includes(query) ||
        m.subject.toLowerCase().includes(query) ||
        m.preview.toLowerCase().includes(query)
    );
  }, [messages, search]);

  const formatTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return date;
    }
  };

  if (!hasInbox) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-6">
        <div className="w-20 h-20 rounded-2xl bg-pastel-blue flex items-center justify-center mb-4">
          <Inbox className="w-10 h-10 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-center">
          Generate an address to start receiving emails
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-4 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-secondary border-0 h-10"
          />
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        {loading && messages.length === 0 ? (
          <div className="divide-y divide-border/50">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="w-16 h-16 rounded-2xl bg-pastel-cream flex items-center justify-center mb-4">
              <span className="text-2xl">📭</span>
            </div>
            <p className="text-muted-foreground text-center">
              {search ? 'No messages match your search' : 'No emails yet. They will appear here automatically.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredMessages.map((message) => (
              <button
                key={message.id}
                onClick={() => onSelect(message.id)}
                className={`w-full text-left p-4 transition-all hover:bg-secondary/50 ${
                  selectedId === message.id ? 'message-selected' : ''
                }`}
              >
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="font-medium text-foreground truncate">
                    {message.from}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTime(message.receivedAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground truncate mb-1">
                  {message.subject || '(No subject)'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {message.preview}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
