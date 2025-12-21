import { Search, Inbox } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MessagePreview } from '@/types/mail';

// Extract friendly sender name with simple priority: sender_name > sender_email > from
const getSenderLabel = (message: { sender_name?: string; sender_email?: string; from: string }): string => {
  // Priority 1: Use sender_name if non-empty
  if (message.sender_name && message.sender_name.trim()) {
    return message.sender_name.trim();
  }

  // Priority 2: Use sender_email if non-empty
  if (message.sender_email && message.sender_email.trim()) {
    return message.sender_email.trim();
  }

  // Priority 3: Fallback to from field
  const fromField = message.from || '';
  return fromField.trim() || 'Unknown sender';
};

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
  const { t } = useLanguage();
  
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
      <div className="px-3 py-2.5 border-b border-border/50 theme-transition">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-lg bg-secondary border-0 h-8 text-sm theme-transition"
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
            <div className="w-12 h-12 rounded-xl bg-pastel-cream flex items-center justify-center mb-3 theme-transition">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {search ? t('noMessagesMatch') : t('waitingForEmails')}
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
                  className={`w-full text-left px-3 py-2 message-hover theme-transition ${
                    selectedId === message.id ? 'message-selected' : ''
                  }`}
                  title={`${t('from')} ${message.from}\n${message.subject || t('noSubject')}`}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className={`text-[13px] truncate max-w-[180px] ${
                      messageIsRead 
                        ? 'font-normal text-foreground' 
                        : 'font-semibold text-foreground'
                    }`}>
                      {getSenderLabel(message)}
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
                    {message.subject || t('noSubject')}
                  </p>
                  {message.preview && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {message.preview}
                    </p>
                  )}
                  {!messageIsRead && (
                    <span className="inline-block w-2 h-2 rounded-full bg-primary mt-1 theme-transition" />
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
