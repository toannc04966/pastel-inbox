import { ArrowLeft, Copy, Check, Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import type { Message } from '@/types/mail';

interface MessageViewerProps {
  message: Message | null;
  loading: boolean;
  deleting?: boolean;
  onBack?: () => void;
  onDelete?: (id: string) => Promise<boolean>;
  showBackButton?: boolean;
}

function SkeletonViewer() {
  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="shimmer h-6 w-3/4 rounded" />
      <div className="shimmer h-4 w-1/2 rounded" />
      <div className="shimmer h-4 w-1/3 rounded" />
      <div className="mt-8 space-y-2">
        <div className="shimmer h-4 w-full rounded" />
        <div className="shimmer h-4 w-full rounded" />
        <div className="shimmer h-4 w-2/3 rounded" />
      </div>
    </div>
  );
}

export function MessageViewer({
  message,
  loading,
  deleting = false,
  onBack,
  onDelete,
  showBackButton,
}: MessageViewerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (!message || !onDelete) return;
    const success = await onDelete(message.id);
    if (success) {
      setDeleteDialogOpen(false);
    }
  };

  const formatRecipients = (to: string | string[] | undefined): string => {
    if (!to) return '(unknown)';
    if (typeof to === 'string') return to;
    if (Array.isArray(to) && to.length === 0) return '(unknown)';
    if (to.length === 1) return to[0];
    return `${to[0]} (+${to.length - 1})`;
  };

  const getFullRecipients = (to: string | string[] | undefined): string => {
    if (!to) return '(unknown)';
    if (typeof to === 'string') return to;
    return to.join(', ');
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatTime = (date: string | number) => {
    try {
      const d = typeof date === 'number' ? new Date(date) : new Date(date);
      return `${formatDistanceToNow(d, { addSuffix: true })} · ${format(d, 'MMM d, yyyy HH:mm')}`;
    } catch {
      return String(date);
    }
  };

  if (!message && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-6">
        <div className="w-20 h-20 rounded-2xl bg-pastel-lilac flex items-center justify-center mb-4">
          <span className="text-3xl">✉️</span>
        </div>
        <p className="text-muted-foreground text-center">
          Select a message to view its content
        </p>
      </div>
    );
  }

  if (loading) {
    return <SkeletonViewer />;
  }

  if (!message) return null;

  // Determine content to display: prefer html > text > raw
  const htmlContent = message.html || message.content?.html || '';
  const textContent = message.text || message.content?.text || '';
  const rawContent = message.raw || message.content?.raw || '';

  const hasHtml = htmlContent.trim().length > 0;
  const hasText = textContent.trim().length > 0;
  const hasRaw = rawContent.trim().length > 0;

  const renderContent = () => {
    if (hasHtml) {
      return (
        <div
          className="prose prose-sm max-w-none text-foreground [&_a]:text-primary"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      );
    }

    if (hasText) {
      return (
        <pre className="text-sm text-foreground whitespace-pre-wrap break-words">
          {textContent}
        </pre>
      );
    }

    if (hasRaw) {
      return (
        <pre className="text-sm text-foreground font-mono bg-secondary p-4 rounded-xl overflow-auto whitespace-pre-wrap break-words">
          {rawContent}
        </pre>
      );
    }

    return (
      <p className="text-muted-foreground italic">No content available</p>
    );
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {showBackButton && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="mb-3 -ml-2 rounded-lg text-muted-foreground hover:text-foreground h-8 px-2"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
            )}

            <h2 className="text-lg font-semibold text-foreground mb-2 truncate" title={message.subject || '(No subject)'}>
              {message.subject || '(No subject)'}
            </h2>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-muted-foreground shrink-0">From:</span>
                <span className="font-medium text-foreground truncate">{message.from}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(message.from, 'from')}
                  className="h-5 w-5 rounded shrink-0"
                >
                  {copiedField === 'from' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-muted-foreground shrink-0">To:</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-medium text-foreground truncate cursor-default">
                        {formatRecipients(message.to)}
                      </span>
                    </TooltipTrigger>
                    {Array.isArray(message.to) && message.to.length > 1 && (
                      <TooltipContent>
                        <p className="max-w-xs break-all">{getFullRecipients(message.to)}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="text-[12px] text-muted-foreground">
                {formatTime(message.receivedAt)}
              </div>
            </div>
          </div>

          {onDelete && (
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {renderContent()}
      </div>
    </div>
  );
}
