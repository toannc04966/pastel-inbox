import { useState } from 'react';
import { Mail, X, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { RecentEmail } from '@/types/mail';

interface AddressOnlyInputProps {
  domain: string;
  recentEmails: RecentEmail[];
  onSubmit: (email: string) => Promise<void>;
  onRemoveRecent: (email: string) => void;
  loading?: boolean;
}

export function AddressOnlyInput({
  domain,
  recentEmails,
  onSubmit,
  onRemoveRecent,
  loading = false,
}: AddressOnlyInputProps) {
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const email = emailInput.trim().toLowerCase();
    
    if (!email) {
      setError(t('enterEmailAddress'));
      return;
    }

    // Validate email ends with @domain
    if (!email.endsWith(`@${domain.toLowerCase()}`)) {
      setError(t('emailMustEndWith', { domain }));
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('invalidEmailFormat'));
      return;
    }

    await onSubmit(email);
  };

  const handleRecentClick = async (email: string) => {
    setEmailInput(email);
    await onSubmit(email);
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
            ADDRESS_ONLY
          </span>
          <span>@{domain}</span>
        </div>
      </div>

      {/* Email Input Form */}
      <div className="p-4 border-b border-border/50">
        <p className="text-sm text-muted-foreground mb-3">
          {t('enterEmailToView')}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={`inbox@${domain}`}
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setError(null);
              }}
              className="pl-10 pr-4 h-10 rounded-xl bg-secondary border-0"
              disabled={loading}
            />
          </div>
          
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          
          <Button 
            type="submit" 
            className="w-full rounded-xl h-10"
            disabled={loading || !emailInput.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('loading')}
              </>
            ) : (
              <>
                {t('openInbox')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Recent Emails */}
      {recentEmails.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 border-b border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('recentInboxes')}
            </p>
          </div>
          
          <div className="divide-y divide-border/50">
            {recentEmails.map((recent) => (
              <div
                key={recent.email}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/50 transition-colors group"
              >
                <button
                  onClick={() => handleRecentClick(recent.email)}
                  className="flex-1 flex items-center gap-3 text-left"
                  disabled={loading}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {recent.email}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span>{recent.messageCount} {recent.messageCount === 1 ? 'message' : 'messages'}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(recent.lastAccessed)}</span>
                    </p>
                  </div>
                </button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemoveRecent(recent.email)}
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {recentEmails.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
            <Mail className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {t('noRecentInboxes')}
          </p>
        </div>
      )}
    </div>
  );
}
