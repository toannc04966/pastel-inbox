import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatTime = (date: string) => {
    try {
      const d = new Date(date);
      return `${formatDistanceToNow(d, { addSuffix: true })} · ${format(d, 'MMM d, yyyy HH:mm')}`;
    } catch {
      return date;
    }
  };

  // Update iframe content when message changes
  useEffect(() => {
    if (message?.content.html && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: 'Inter', system-ui, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                color: #333;
                padding: 16px;
                margin: 0;
              }
              img { max-width: 100%; height: auto; }
              a { color: #7c6cbb; }
            </style>
          </head>
          <body>${message.content.html}</body>
          </html>
        `);
        doc.close();
      }
    }
  }, [message?.content.html]);

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
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="preview" className="h-full flex flex-col">
          <div className="px-6 pt-4">
            <TabsList className="rounded-xl bg-secondary p-1">
              <TabsTrigger value="preview" className="rounded-lg">
                Preview
              </TabsTrigger>
              <TabsTrigger value="raw" className="rounded-lg">
                Raw
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="preview" className="flex-1 overflow-auto m-0 p-6">
            {message.content.html ? (
              <iframe
                ref={iframeRef}
                title="Email content"
                className="w-full h-full min-h-[400px] rounded-xl border border-border/50 bg-card"
                sandbox="allow-same-origin"
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                {message.content.text || 'No content available'}
              </pre>
            )}
          </TabsContent>

          <TabsContent value="raw" className="flex-1 overflow-auto m-0 p-6">
            <pre className="text-xs text-muted-foreground font-mono bg-secondary p-4 rounded-xl overflow-auto max-h-full">
              {message.content.raw || JSON.stringify(message, null, 2)}
            </pre>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
