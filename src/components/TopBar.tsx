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
  onDomainChange: (domain: string) => void;
  onGenerate: () => void;
  loading: boolean;
  user?: User | null;
  onLogout?: () => void;
}

export function TopBar({
  domains,
  selectedDomain,
  onDomainChange,
  onGenerate,
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
            Auto refresh every 5s
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Domain Selector */}
        {loading && domains.length === 0 ? (
          <Skeleton className="w-32 h-10 rounded-xl" />
        ) : (
          <Select value={selectedDomain} onValueChange={onDomainChange}>
            <SelectTrigger className="w-[140px] rounded-xl bg-secondary border-0 h-10">
              <SelectValue placeholder="Select domain" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {domains.map((domain) => (
                <SelectItem key={domain} value={domain} className="rounded-lg">
                  @{domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Generate Button */}
        <Button
          onClick={onGenerate}
          disabled={loading || !selectedDomain}
          className="rounded-xl h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline">Generate address</span>
              <span className="sm:hidden">Generate</span>
            </>
          )}
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
