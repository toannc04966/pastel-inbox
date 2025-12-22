import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { CheckCircle2, XCircle, Loader2, Mail, Trash2, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
  onDelete: (id: string) => Promise<boolean>;
  onBulkDelete: (ids: string[], onProgress?: (current: number, total: number) => void) => Promise<{ success: number; failed: number }>;
  deleting?: boolean;
  bulkDeleting?: boolean;
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
  onDelete,
  onBulkDelete,
  deleting = false,
  bulkDeleting = false,
}: SentListProps) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SentMessagePreview | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<{ current: number; total: number } | null>(null);

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

  const getSenderDisplay = (msg: SentMessagePreview): string => {
    if (msg.sender_name) return msg.sender_name;
    // Extract local part from email
    const atIndex = msg.from_address.indexOf('@');
    return atIndex > 0 ? msg.from_address.substring(0, atIndex) : msg.from_address;
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map(m => m.id)));
    }
  };

  const handleSingleDelete = (msg: SentMessagePreview, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(msg);
    setDeleteDialogOpen(true);
  };

  const confirmSingleDelete = async () => {
    if (!itemToDelete) return;
    await onDelete(itemToDelete.id);
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    setDeleteProgress({ current: 0, total: ids.length });
    
    await onBulkDelete(ids, (current, total) => {
      setDeleteProgress({ current, total });
    });
    
    setDeleteProgress(null);
    setBulkDeleteDialogOpen(false);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  if (loading && messages.length === 0) {
    return <SkeletonList />;
  }

  if (!loading && messages.length === 0) {
    return <EmptyState />;
  }

  const isAllSelected = messages.length > 0 && selectedIds.size === messages.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < messages.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header with select controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-background/50">
        <div className="text-sm text-muted-foreground">
          {selectMode ? (
            <span className="font-medium text-foreground">
              {selectedIds.size} selected
            </span>
          ) : (
            <span>{messages.length} sent</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {selectMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 px-2 text-xs"
              >
                <Checkbox 
                  checked={isAllSelected}
                  className="mr-1.5 h-4 w-4"
                  // @ts-ignore - indeterminate is a valid prop
                  data-state={isIndeterminate ? 'indeterminate' : undefined}
                />
                {isAllSelected ? 'Unselect All' : 'Select All'}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={exitSelectMode}
                className="h-8 px-2 text-xs"
              >
                Cancel
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedIds.size === 0 || bulkDeleting}
                onClick={handleBulkDelete}
                className="h-8 px-2 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {bulkDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectMode(true)}
              className="h-8 px-2 text-xs"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Select
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => !selectMode && onSelect(msg.id)}
              className={cn(
                'w-full text-left p-3 rounded-xl transition-colors group',
                'hover:bg-muted/50',
                selectedId === msg.id && !selectMode && 'bg-muted',
                selectedIds.has(msg.id) && selectMode && 'bg-primary/5',
                selectMode ? 'cursor-default' : 'cursor-pointer'
              )}
            >
              <div className="flex items-start gap-2">
                {/* Checkbox in select mode */}
                {selectMode && (
                  <div className="mt-0.5">
                    <Checkbox
                      checked={selectedIds.has(msg.id)}
                      onCheckedChange={() => handleToggleSelect(msg.id)}
                      aria-label={`Select message to ${msg.to[0]}`}
                      className="h-4 w-4"
                    />
                  </div>
                )}

                {/* Status icon */}
                {!selectMode && (
                  <div className="mt-0.5">
                    {msg.status === 'sent' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {/* From and time row */}
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-medium text-sm text-foreground truncate">
                            {getSenderDisplay(msg)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{msg.from_address}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>

                  {/* Recipients */}
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs text-muted-foreground truncate">
                      To: {formatRecipients(msg.to)}
                    </span>
                    {selectMode && (
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full shrink-0",
                        msg.status === 'sent' 
                          ? "bg-green-500/10 text-green-600" 
                          : "bg-destructive/10 text-destructive"
                      )}>
                        {msg.status}
                      </span>
                    )}
                  </div>

                  {/* Subject */}
                  <p className="text-sm text-muted-foreground truncate">
                    {msg.subject || '(No subject)'}
                  </p>
                </div>

                {/* Delete button - show on hover when not in select mode */}
                {!selectMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleSingleDelete(msg, e)}
                    disabled={deleting}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label="Delete message"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
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

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Delete Sent Email?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Are you sure you want to delete this sent message?</p>
                {itemToDelete && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                    <p><span className="text-muted-foreground">Subject:</span> {itemToDelete.subject || '(No subject)'}</p>
                    <p><span className="text-muted-foreground">To:</span> {itemToDelete.to.join(', ')}</p>
                  </div>
                )}
                <p className="text-destructive text-xs">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSingleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Delete {selectedIds.size} Sent Emails?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Are you sure you want to delete {selectedIds.size} selected sent message{selectedIds.size > 1 ? 's' : ''}?</p>
                <p className="text-destructive text-xs">This action cannot be undone.</p>
                {deleteProgress && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">
                        Deleting {deleteProgress.current}/{deleteProgress.total}...
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {bulkDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete All'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}