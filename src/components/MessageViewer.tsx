import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import type { Message } from '@/types/mail';

interface MessageViewerProps {
  message: Message | null;
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

export function MessageViewer({
  message,
  loading,
  onBack,
  showBackButton,
}: MessageViewerProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
      <div className="p-6 border-b border-border/50">
        {showBackButton && (
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 -ml-2 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to inbox
          </Button>
        )}

        <h2 className="text-xl font-semibold text-foreground mb-3">
          {message.subject || '(No subject)'}
        </h2>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">From:</span>
            <span className="text-sm font-medium text-foreground">{message.from}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(message.from, 'from')}
              className="h-6 w-6 rounded-lg"
            >
              {copiedField === 'from' ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>

          <span className="text-sm text-muted-foreground">
            {formatTime(message.receivedAt)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {renderContent()}
      </div>
    </div>
  );
}
