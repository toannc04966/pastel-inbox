import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

export function ThemeToggle() {
  const { theme, themePreference, setThemePreference } = useTheme();
  const { t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-xl h-10 w-10">
          {theme === 'dark' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        <DropdownMenuItem
          onClick={() => setThemePreference('light')}
          className={`rounded-lg ${themePreference === 'light' ? 'bg-secondary' : ''}`}
        >
          <Sun className="w-4 h-4 mr-2" />
          {t('lightMode')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setThemePreference('dark')}
          className={`rounded-lg ${themePreference === 'dark' ? 'bg-secondary' : ''}`}
        >
          <Moon className="w-4 h-4 mr-2" />
          {t('darkMode')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setThemePreference('system')}
          className={`rounded-lg ${themePreference === 'system' ? 'bg-secondary' : ''}`}
        >
          <Monitor className="w-4 h-4 mr-2" />
          {t('systemMode')}
          <span className="ml-1 text-xs text-muted-foreground">
            ({t('autoAfter18')})
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
