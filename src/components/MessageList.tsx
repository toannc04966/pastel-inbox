import { Search, Inbox, Trash2, Check, Reply } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { EmailPagination } from '@/components/EmailPagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  showDomainBadge?: boolean;
  onDelete?: (id: string) => Promise<boolean>;
  onBulkDelete?: (ids: string[]) => Promise<{ total: number; failed: number }>;
  deleting?: boolean;
  bulkDeleting?: boolean;
  allowedDomains?: string[];
  onReply?: (message: MessagePreview) => void;
  // Pagination props
  currentPage?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (value: number) => void;
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

// Helper function to extract domain from email
const getDomainFromEmail = (email: string): string => {
  const parts = email.split('@');
  return parts[1]?.toLowerCase() || '';
};

export function MessageList({
  messages,
  selectedId,
  onSelect,
  loading,
  isRead,
  searchQuery: externalSearch,
  onSearchChange,
  showDomainBadge = false,
  onDelete,
  onBulkDelete,
  deleting = false,
  bulkDeleting = false,
  allowedDomains = [],
  onReply,
  // Pagination props
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 20,
  onPageChange,
  onItemsPerPageChange,
}: MessageListProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const { t } = useLanguage();
  
  // Select mode state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MessagePreview | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
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

  // Reset select mode when messages change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [messages]);

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

  // Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = filteredMessages.map(m => m.id);
    if (selectedIds.size === filteredMessages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleSingleDelete = (message: MessagePreview, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(message);
    setDeleteDialogOpen(true);
  };

  const handleConfirmSingleDelete = async () => {
    if (itemToDelete && onDelete) {
      await onDelete(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (onBulkDelete && selectedIds.size > 0) {
      await onBulkDelete(Array.from(selectedIds));
      setBulkDeleteDialogOpen(false);
      setSelectedIds(new Set());
      setSelectMode(false);
    }
  };

  const handleCancelSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Select Mode Controls */}
      <div className="px-3 py-2.5 border-b border-border/50 theme-transition">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-sm font-medium text-foreground">
            {selectMode 
              ? `${selectedIds.size} selected`
              : `${filteredMessages.length} ${filteredMessages.length === 1 ? 'message' : 'messages'}`
            }
          </span>
          
          <div className="flex items-center gap-1">
            {selectMode ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-7 text-xs"
                >
                  {selectedIds.size === filteredMessages.length ? 'Unselect All' : 'Select All'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelSelectMode}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedIds.size === 0 || bulkDeleting}
                  onClick={handleBulkDelete}
                  className="h-7 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {bulkDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
                </Button>
              </>
            ) : (
              onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectMode(true)}
                  className="h-7 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Select
                </Button>
              )
            )}
          </div>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 md:w-3.5 h-4 md:h-3.5 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 md:pl-9 rounded-lg bg-secondary border-0 h-10 md:h-8 text-base md:text-sm theme-transition"
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
              const isSelected = selectedIds.has(message.id);
              
              // Check if this email is from an owned domain (can reply)
              const recipientDomain = message.inboxId ? getDomainFromEmail(message.inboxId) : (message.domain || '');
              const canReply = onReply && allowedDomains.includes(recipientDomain);
              
              return (
                <div
                  key={message.id}
                  onClick={() => {
                    if (selectMode) {
                      handleToggleSelect(message.id);
                    } else {
                      onSelect(message.id);
                    }
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 md:py-2 message-hover theme-transition cursor-pointer group relative",
                    selectedId === message.id && !selectMode && 'message-selected',
                    isSelected && selectMode && 'bg-primary/10 border-l-4 border-primary'
                  )}
                  title={`${t('from')} ${message.from}\n${message.subject || t('noSubject')}`}
                >
                  <div className="flex items-start gap-2">
                    {/* Checkbox in select mode */}
                    {selectMode && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelect(message.id)}
                        className="h-5 w-5 mt-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Select email"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={cn(
                                "text-sm md:text-[13px] truncate max-w-[65%] md:max-w-[180px]",
                                messageIsRead 
                                  ? 'font-normal text-foreground' 
                                  : 'font-semibold text-foreground'
                              )}>
                                {getSenderLabel(message)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{message.from}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="text-xs md:text-[11px] text-muted-foreground shrink-0">
                          {formatTime(message.receivedAt)}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm md:text-[13px] truncate mb-0.5",
                        messageIsRead 
                          ? 'font-normal text-muted-foreground' 
                          : 'font-semibold text-foreground'
                      )}>
                        {message.subject || t('noSubject')}
                      </p>
                      {message.preview && (
                        <p className="text-xs md:text-[11px] text-muted-foreground truncate">
                          {message.preview}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        {!messageIsRead && (
                          <span className="inline-block w-2 h-2 rounded-full bg-primary theme-transition" />
                        )}
                        {showDomainBadge && message.domain && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground border-muted-foreground/30">
                            @{message.domain}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Action buttons (hidden in select mode) */}
                    {!selectMode && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {/* Reply button - only for owned domains */}
                        {canReply && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReply(message);
                                  }}
                                  className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10"
                                  aria-label="Reply to email"
                                >
                                  <Reply className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reply</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        
                        {/* Delete button */}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleSingleDelete(message, e)}
                            disabled={deleting}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label="Delete email"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {onPageChange && onItemsPerPageChange && totalItems > 0 && (
        <EmailPagination
          currentPage={currentPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
          loading={loading}
        />
      )}

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Delete Email?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Are you sure you want to delete this email?</p>
                {itemToDelete && (
                  <div className="bg-muted p-2 rounded text-sm">
                    <p><strong>From:</strong> {getSenderLabel(itemToDelete)}</p>
                    <p><strong>Subject:</strong> {itemToDelete.subject || '(No Subject)'}</p>
                  </div>
                )}
                <p className="text-destructive">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSingleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ⚠️ Delete {selectedIds.size} Email{selectedIds.size > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Are you sure you want to delete {selectedIds.size} selected email{selectedIds.size > 1 ? 's' : ''}?
                </p>
                <p className="text-destructive">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {bulkDeleting ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
