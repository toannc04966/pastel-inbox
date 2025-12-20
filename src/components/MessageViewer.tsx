import { ArrowLeft, Copy, Check, Trash2, Loader2, Download, ChevronDown, ChevronUp, MailOpen } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Message } from '@/types/mail';

interface MessageViewerProps {
  message: Message | null;
  loading: boolean;
  deleting?: boolean;
  onBack?: () => void;
  onDelete?: (id: string) => Promise<boolean>;
  onMarkAsUnread?: (id: string) => void;
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
  onMarkAsUnread,
  showBackButton,
}: MessageViewerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showHeaders, setShowHeaders] = useState(false);
  const { t } = useLanguage();

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
    toast.success(t('copied'));
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

  const downloadRawEmail = () => {
    if (!message) return;
    
    const rawContent = message.raw || message.content?.raw;
    if (!rawContent) {
      toast.error(t('rawNotAvailable'));
      return;
    }

    const blob = new Blob([rawContent], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Generate filename from subject or message ID
    const safeSubject = (message.subject || 'message')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    a.download = `${safeSubject}_${message.id}.eml`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(t('emailDownloaded'));
  };

  const hasRawContent = message && (message.raw || message.content?.raw);

  // Extract headers from raw content
  const extractHeaders = (rawContent: string): Record<string, string> => {
    const headers: Record<string, string> = {};
    const headerSection = rawContent.split('\r\n\r\n')[0] || rawContent.split('\n\n')[0];
    const lines = headerSection.split(/\r?\n/);
    
    let currentKey = '';
    let currentValue = '';
    
    for (const line of lines) {
      if (line.startsWith(' ') || line.startsWith('\t')) {
        // Continuation of previous header
        currentValue += ' ' + line.trim();
      } else {
        // Save previous header
        if (currentKey) {
          headers[currentKey] = currentValue;
        }
        // Parse new header
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          currentKey = line.substring(0, colonIndex).trim();
          currentValue = line.substring(colonIndex + 1).trim();
        }
      }
    }
    // Save last header
    if (currentKey) {
      headers[currentKey] = currentValue;
    }
    
    return headers;
  };

  if (!message && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-6">
        <div className="w-20 h-20 rounded-2xl bg-pastel-lilac flex items-center justify-center mb-4 theme-transition">
          <span className="text-3xl">✉️</span>
        </div>
        <p className="text-muted-foreground text-center">
          {t('selectMessage')}
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

  const headers = hasRaw ? extractHeaders(rawContent) : {};

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
        <pre className="text-sm text-foreground font-mono bg-secondary p-4 rounded-xl overflow-auto whitespace-pre-wrap break-words theme-transition">
          {rawContent}
        </pre>
      );
    }

    return (
      <p className="text-muted-foreground italic">{t('noContent')}</p>
    );
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-border/50 theme-transition">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {showBackButton && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="mb-3 -ml-2 rounded-lg text-muted-foreground hover:text-foreground h-8 px-2 theme-transition"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                {t('back')}
              </Button>
            )}

            <h2 className="text-lg font-semibold text-foreground mb-2 truncate" title={message.subject || t('noSubject')}>
              {message.subject || t('noSubject')}
            </h2>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-muted-foreground shrink-0">{t('from')}</span>
                <span className="font-medium text-foreground truncate">{message.from}</span>
                {message.from && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(message.from, 'from')}
                    className="h-5 w-5 rounded shrink-0 theme-transition"
                  >
                    {copiedField === 'from' ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-muted-foreground shrink-0">{t('to')}</span>
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
                {message.to && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const recipient = Array.isArray(message.to) ? message.to[0] : message.to;
                      if (recipient) copyToClipboard(recipient, 'to');
                    }}
                    className="h-5 w-5 rounded shrink-0 theme-transition"
                  >
                    {copiedField === 'to' ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                )}
              </div>

              <div className="text-[12px] text-muted-foreground">
                {formatTime(message.receivedAt)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Mark as Unread */}
            {onMarkAsUnread && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onMarkAsUnread(message.id)}
                      className="h-8 w-8 rounded-lg theme-transition"
                    >
                      <MailOpen className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('markAsUnread')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Download Raw Email */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={downloadRawEmail}
                    className="h-8 w-8 rounded-lg theme-transition"
                    disabled={!hasRawContent}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{hasRawContent ? t('downloadRaw') : t('rawNotAvailable')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Delete */}
            {onDelete && (
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 theme-transition"
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
                    <AlertDialogTitle>{t('deleteMessage')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('deleteDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Email Headers (Collapsible) */}
        {hasRaw && Object.keys(headers).length > 0 && (
          <Collapsible open={showHeaders} onOpenChange={setShowHeaders} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground theme-transition">
                {showHeaders ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                {showHeaders ? t('hideHeaders') : t('showHeaders')}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-secondary rounded-lg p-3 text-xs font-mono space-y-1 max-h-48 overflow-auto theme-transition">
                {headers['Message-ID'] && (
                  <div><span className="text-muted-foreground">Message-ID:</span> {headers['Message-ID']}</div>
                )}
                {headers['Received'] && (
                  <div className="truncate"><span className="text-muted-foreground">Received:</span> {headers['Received']}</div>
                )}
                {headers['Authentication-Results'] && (
                  <div className="truncate"><span className="text-muted-foreground">Auth:</span> {headers['Authentication-Results']}</div>
                )}
                {headers['DKIM-Signature'] && (
                  <div className="truncate"><span className="text-muted-foreground">DKIM:</span> Present</div>
                )}
                {headers['X-Spam-Status'] && (
                  <div><span className="text-muted-foreground">Spam:</span> {headers['X-Spam-Status']}</div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {renderContent()}
      </div>
    </div>
  );
}
