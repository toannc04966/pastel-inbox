import { Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TopBarProps {
  domains: string[];
  selectedDomain: string;
  onDomainChange: (domain: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

export function TopBar({
  domains,
  selectedDomain,
  onDomainChange,
  onGenerate,
  loading,
}: TopBarProps) {
  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-border/50 bg-card">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary-foreground" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Pastel Temp Mail</h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground hidden sm:block">
          Auto refresh every 5s
        </span>

        <Select value={selectedDomain} onValueChange={onDomainChange}>
          <SelectTrigger className="w-[180px] rounded-xl bg-secondary border-0 h-10">
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

        <Button
          onClick={onGenerate}
          disabled={loading}
          className="rounded-xl h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            'Generate address'
          )}
        </Button>
      </div>
    </header>
  );
}
