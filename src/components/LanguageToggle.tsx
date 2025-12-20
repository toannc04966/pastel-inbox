import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-xl h-10 w-10">
          <Languages className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        <DropdownMenuItem
          onClick={() => setLocale('en')}
          className={`rounded-lg ${locale === 'en' ? 'bg-secondary' : ''}`}
        >
          🇺🇸 {t('english')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale('vi')}
          className={`rounded-lg ${locale === 'vi' ? 'bg-secondary' : ''}`}
        >
          🇻🇳 {t('vietnamese')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
