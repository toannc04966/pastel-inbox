import { useState } from 'react';
import { ArrowLeft, Copy, Check, Mail, AlertCircle } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import type { SentMessage } from '@/types/sent';

interface SentMessageViewerProps {
  message: SentMessage | null;
  loading: boolean;
  onBack?: () => void;
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

export function SentMessageViewer({
  message,
  loading,
  onBack,
  showBackButton,
}: SentMessageViewerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { t } = useLanguage();

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(t('copied'));
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatTime = (timestamp: number) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy HH:mm');
    } catch {
      return '';
    }
  };

  if (!message && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-6">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Mail className="w-10 h-10 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-center">
          Select a sent message to view details
        </p>
      </div>
    );
  }

  if (loading) {
    return <SkeletonViewer />;
  }

  if (!message) return null;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        {showBackButton && (
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              onClick={onBack}
              className="-ml-2 rounded-lg text-muted-foreground hover:text-foreground h-9 px-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {t('back')}
            </Button>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Subject */}
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-semibold text-foreground break-words">
                {message.subject || '(No subject)'}
              </h2>
              <Badge
                variant={message.status === 'sent' ? 'default' : 'destructive'}
                className="shrink-0"
              >
                {message.status === 'sent' ? 'Sent' : 'Failed'}
              </Badge>
            </div>

            <div className="space-y-1">
              {/* From */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">From:</span>
                <span className="font-medium text-foreground truncate">{message.from_address}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(message.from_address, 'from')}
                  className="h-5 w-5 rounded shrink-0"
                >
                  {copiedField === 'from' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>

              {/* To */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">To:</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-medium text-foreground truncate cursor-default">
                        {message.to.length === 1 ? message.to[0] : `${message.to[0]} (+${message.to.length - 1})`}
                      </span>
                    </TooltipTrigger>
                    {message.to.length > 1 && (
                      <TooltipContent>
                        <p className="max-w-xs break-all">{message.to.join(', ')}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* CC */}
              {message.cc && message.cc.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">CC:</span>
                  <span className="text-foreground truncate">{message.cc.join(', ')}</span>
                </div>
              )}

              {/* BCC */}
              {message.bcc && message.bcc.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">BCC:</span>
                  <span className="text-foreground truncate">{message.bcc.join(', ')}</span>
                </div>
              )}

              {/* Reply-To */}
              {message.reply_to && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">Reply-To:</span>
                  <span className="text-foreground truncate">{message.reply_to}</span>
                </div>
              )}

              {/* Date */}
              <div className="text-xs text-muted-foreground">
                {formatTime(message.created_at)}
              </div>

              {/* Provider Message ID */}
              {message.provider_message_id && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">ID:</span>
                  <code className="font-mono text-muted-foreground bg-muted px-1 rounded text-[10px]">
                    {message.provider_message_id}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(message.provider_message_id!, 'id')}
                    className="h-4 w-4 rounded"
                  >
                    {copiedField === 'id' ? (
                      <Check className="w-2.5 h-2.5" />
                    ) : (
                      <Copy className="w-2.5 h-2.5" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error message for failed emails */}
        {message.status === 'failed' && message.error && (
          <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{message.error}</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {message.html_body ? (
          <div
            className="prose prose-sm max-w-none text-foreground [&_a]:text-primary [&_a]:underline"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(message.html_body, { USE_PROFILES: { html: true } }),
            }}
          />
        ) : message.text_body ? (
          <div className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
            {message.text_body}
          </div>
        ) : (
          <p className="text-muted-foreground italic">No content</p>
        )}
      </div>
    </div>
  );
}
