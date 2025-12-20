import { Mail, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/types/auth';

interface TopBarProps {
  domains: string[];
  selectedDomain: string;
  allDomainsValue: string;
  onDomainChange: (domain: string) => void;
  onRefresh: () => void;
  loading: boolean;
  user?: User | null;
  onLogout?: () => void;
}

export function TopBar({
  domains,
  selectedDomain,
  allDomainsValue,
  onDomainChange,
  onRefresh,
  loading,
  user,
  onLogout,
}: TopBarProps) {
  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-border/50 bg-card">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Temp Mail</h1>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Auto refresh every 30s
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Domain Selector */}
        {loading && domains.length === 0 ? (
          <Skeleton className="w-40 h-10 rounded-xl" />
        ) : (
          <Select value={selectedDomain} onValueChange={onDomainChange}>
            <SelectTrigger className="w-[160px] rounded-xl bg-secondary border-0 h-10">
              <SelectValue placeholder="Select domain" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value={allDomainsValue} className="rounded-lg">
                All domains
              </SelectItem>
              {domains.map((domain) => (
                <SelectItem key={domain} value={domain} className="rounded-lg">
                  @{domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Refresh Button */}
        <Button
          onClick={onRefresh}
          disabled={loading}
          variant="outline"
          className="rounded-xl h-10 px-4"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        {/* User & Logout */}
        {user && (
          <div className="flex items-center gap-2 ml-1 pl-3 border-l border-border/50">
            <span className="text-sm text-muted-foreground hidden md:inline truncate max-w-32">
              {user.email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="h-10 w-10 rounded-xl hover:bg-destructive/20"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
