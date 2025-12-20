import { Search, Inbox } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import type { MessagePreview } from '@/types/mail';

interface MessageListProps {
  messages: MessagePreview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  isRead?: (id: string) => boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

function SkeletonRow() {
  return (
    <div className="px-3 py-2.5 space-y-1.5">
      <div className="shimmer h-3.5 w-28 rounded" />
      <div className="shimmer h-3 w-40 rounded" />
      <div className="shimmer h-2.5 w-full rounded" />
    </div>
  );
}

export function MessageList({
  messages,
  selectedId,
  onSelect,
  loading,
  isRead,
  searchQuery: externalSearch,
  onSearchChange,
}: MessageListProps) {
  const [internalSearch, setInternalSearch] = useState('');
  
  // Use external search if provided, otherwise internal
  const search = externalSearch !== undefined ? externalSearch : internalSearch;
  const setSearch = onSearchChange || setInternalSearch;

  // Debounced search for performance
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 150);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredMessages = useMemo(() => {
    if (!debouncedSearch.trim()) return messages;
    const query = debouncedSearch.toLowerCase();
    return messages.filter(
      (m) =>
        m.from.toLowerCase().includes(query) ||
        m.subject.toLowerCase().includes(query) ||
        (m.preview && m.preview.toLowerCase().includes(query))
    );
  }, [messages, debouncedSearch]);

  const formatTime = (date: string | number) => {
    try {
      const d = typeof date === 'number' ? new Date(date) : new Date(date);
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return String(date);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="px-3 py-2.5 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search sender, subject, content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-lg bg-secondary border-0 h-8 text-sm"
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
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <div className="w-12 h-12 rounded-xl bg-pastel-cream flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {search ? 'No messages match your search' : 'Waiting for incoming emails…'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredMessages.map((message) => {
              const messageIsRead = isRead ? isRead(message.id) : true;
              
              return (
                <button
                  key={message.id}
                  onClick={() => onSelect(message.id)}
                  className={`w-full text-left px-3 py-2 transition-all hover:bg-secondary/50 ${
                    selectedId === message.id ? 'message-selected' : ''
                  }`}
                  title={`From: ${message.from}\nSubject: ${message.subject || '(No subject)'}`}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className={`text-[13px] truncate max-w-[180px] ${
                      messageIsRead 
                        ? 'font-normal text-foreground' 
                        : 'font-semibold text-foreground'
                    }`}>
                      {message.from}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatTime(message.receivedAt)}
                    </span>
                  </div>
                  <p className={`text-[13px] truncate mb-0.5 ${
                    messageIsRead 
                      ? 'font-normal text-muted-foreground' 
                      : 'font-semibold text-foreground'
                  }`}>
                    {message.subject || '(No subject)'}
                  </p>
                  {message.preview && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {message.preview}
                    </p>
                  )}
                  {!messageIsRead && (
                    <span className="inline-block w-2 h-2 rounded-full bg-primary mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
