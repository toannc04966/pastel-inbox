import { Mail, RefreshCw, Pause, Play, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { AccountMenu } from '@/components/AccountMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import type { User } from '@/types/auth';

interface TopBarProps {
  domains: string[];
  selectedDomain: string;
  allDomainsValue: string;
  onDomainChange: (domain: string) => void;
  onRefresh: () => void;
  onClearInbox?: () => Promise<boolean>;
  loading: boolean;
  clearingInbox?: boolean;
  user?: User | null;
  onLogout?: () => void;
  inboxEmail?: string;
  autoRefreshEnabled?: boolean;
  autoRefreshPaused?: boolean;
  onToggleAutoRefresh?: () => void;
  messageCount?: number;
}

export function TopBar({
  domains,
  selectedDomain,
  allDomainsValue,
  onDomainChange,
  onRefresh,
  onClearInbox,
  loading,
  clearingInbox = false,
  user,
  onLogout,
  inboxEmail,
  autoRefreshEnabled = true,
  autoRefreshPaused = false,
  onToggleAutoRefresh,
  messageCount = 0,
}: TopBarProps) {
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const { t } = useLanguage();

  const handleClearInbox = async () => {
    if (!onClearInbox) return;
    const success = await onClearInbox();
    if (success) {
      setClearDialogOpen(false);
    }
  };

  const getAutoRefreshStatus = () => {
    if (!autoRefreshEnabled) return t('autoRefreshOff');
    if (autoRefreshPaused) return t('pausedUserActive');
    return t('autoRefreshOn');
  };

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-border/50 bg-card theme-transition">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center theme-transition">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Temp Mail</h1>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {getAutoRefreshStatus()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Domain Selector */}
        {loading && domains.length === 0 ? (
          <Skeleton className="w-32 md:w-40 h-10 rounded-xl" />
        ) : (
          <Select value={selectedDomain} onValueChange={onDomainChange}>
            <SelectTrigger className="w-[120px] md:w-[160px] rounded-xl bg-secondary border-0 h-10 theme-transition">
              <SelectValue placeholder={t('selectDomain')} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value={allDomainsValue} className="rounded-lg">
                {t('allDomains')}
              </SelectItem>
              {domains.map((domain) => (
                <SelectItem key={domain} value={domain} className="rounded-lg">
                  @{domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Auto-Refresh Toggle */}
        {onToggleAutoRefresh && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onToggleAutoRefresh}
                  variant="outline"
                  size="icon"
                  className={`rounded-xl h-10 w-10 theme-transition ${
                    autoRefreshEnabled 
                      ? autoRefreshPaused 
                        ? 'text-yellow-500' 
                        : 'text-green-500' 
                      : 'text-muted-foreground'
                  }`}
                >
                  {autoRefreshEnabled ? (
                    autoRefreshPaused ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{autoRefreshEnabled ? t('disableAutoRefresh') : t('enableAutoRefresh')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Refresh Button */}
        <Button
          onClick={onRefresh}
          disabled={loading}
          variant="outline"
          className="rounded-xl h-10 px-3 md:px-4 theme-transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline ml-2">{t('refresh')}</span>
        </Button>

        {/* Clear Inbox Button */}
        {onClearInbox && messageCount > 0 && (
          <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="rounded-xl h-10 px-3 md:px-4 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 theme-transition"
                disabled={clearingInbox}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden md:inline ml-2">{t('clear')}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('clearInboxQuestion')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('clearInboxDescription', { count: messageCount })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearInbox}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {clearingInbox ? t('clearing') : t('clearAll')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Language Toggle */}
        <LanguageToggle />

        {/* User & Account Menu */}
        {user && onLogout && (
          <div className="ml-1 pl-2 md:pl-3 border-l border-border/50">
            <AccountMenu user={user} onLogout={onLogout} />
          </div>
        )}
      </div>
    </header>
  );
}
