import { Copy, RefreshCw, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Inbox } from '@/types/mail';

interface AddressCardProps {
  inbox: Inbox | null;
  onRegenerate: () => void;
  loading: boolean;
}

export function AddressCard({ inbox, onRegenerate, loading }: AddressCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!inbox?.address) return;
    
    await navigator.clipboard.writeText(inbox.address);
    setCopied(true);
    toast.success('Copied to clipboard!', {
      className: 'rounded-2xl',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inbox) {
    return (
      <div className="pastel-card p-6 animate-fade-in">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-pastel-lilac mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl">📬</span>
          </div>
          <p className="text-muted-foreground">
            Click "Generate address" to create a temporary email
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pastel-card p-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xl font-semibold text-foreground truncate">
            {inbox.address}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            This address is temporary. New emails appear automatically.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="rounded-xl h-10 w-10 hover:bg-pastel-mint transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-accent-foreground" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onRegenerate}
            disabled={loading}
            className="rounded-xl h-10 w-10 hover:bg-pastel-peach transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
