import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="mx-4 mt-4 p-4 rounded-2xl bg-destructive/20 border border-destructive/30 flex items-center gap-3 animate-fade-in">
      <AlertCircle className="w-5 h-5 text-destructive-foreground shrink-0" />
      <p className="text-sm text-destructive-foreground flex-1">{message}</p>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDismiss}
        className="h-8 w-8 rounded-lg hover:bg-destructive/20"
      >
        <X className="w-4 h-4 text-destructive-foreground" />
      </Button>
    </div>
  );
}
