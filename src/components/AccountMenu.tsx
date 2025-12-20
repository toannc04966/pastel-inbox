import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, KeyRound, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import type { User as UserType } from '@/types/auth';

interface AccountMenuProps {
  user: UserType;
  onLogout: () => void;
}

export function AccountMenu({ user, onLogout }: AccountMenuProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-10 px-3 rounded-xl hover:bg-secondary theme-transition"
          >
            <User className="w-4 h-4 mr-2" />
            <span className="hidden lg:inline truncate max-w-32">
              {user.email}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user.email}</p>
            {user.isAdmin && (
              <p className="text-xs text-muted-foreground">{t('admin')}</p>
            )}
          </div>
          <DropdownMenuSeparator />
          {user.isAdmin && (
            <>
              <DropdownMenuItem onClick={() => navigate('/admin')}>
                <Shield className="w-4 h-4 mr-2" />
                {t('adminPanel')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
            <KeyRound className="w-4 h-4 mr-2" />
            {t('changePassword')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            {t('logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </>
  );
}
