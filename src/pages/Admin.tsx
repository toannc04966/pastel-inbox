import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, KeyRound, Users, RefreshCw, Shield } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PermissionsModal } from '@/components/PermissionsModal';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  isAdmin?: boolean;
  createdAt?: string;
}

interface UsersResponse {
  ok: boolean;
  data?: { users: AdminUser[] };
  error?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Create user form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // Reset password form
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<UsersResponse>('/api/v1/admin/users', {
        credentials: 'include',
      });
      if (res.ok && res.data?.users) {
        setUsers(res.data.users);
      }
    } catch (err: any) {
      toast.error(err.message || t('loadUsersFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!authLoading && user && !user.isAdmin) {
      navigate('/');
      return;
    }
    if (!authLoading && user?.isAdmin) {
      fetchUsers();
    }
  }, [authLoading, isAuthenticated, user, navigate, fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;

    setCreating(true);
    try {
      await apiFetch('/api/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail, password: newPassword }),
        credentials: 'include',
      });
      toast.success(t('userCreated'));
      setCreateDialogOpen(false);
      setNewEmail('');
      setNewPassword('');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || t('createUserFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !resetPassword) return;

    setResetting(true);
    try {
      await apiFetch(`/api/v1/admin/users/${selectedUser.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: resetPassword }),
        credentials: 'include',
      });
      toast.success(t('passwordReset'));
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      setResetPassword('');
    } catch (err: any) {
      toast.error(err.message || t('resetPasswordFailed'));
    } finally {
      setResetting(false);
    }
  };

  const openResetPasswordDialog = (adminUser: AdminUser) => {
    setSelectedUser(adminUser);
    setResetPassword('');
    setResetPasswordDialogOpen(true);
  };

  const openPermissionsDialog = (adminUser: AdminUser) => {
    setSelectedUser(adminUser);
    setPermissionsDialogOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-border/50 bg-card theme-transition">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center theme-transition">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">{t('adminPanel')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchUsers}
            disabled={loading}
            className="rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            {t('createUser')}
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 md:p-6">
        <div className="pastel-card">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t('noUsers')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('email')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead>{t('createdAt')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((adminUser) => (
                  <TableRow key={adminUser.id}>
                    <TableCell className="font-medium">{adminUser.email}</TableCell>
                    <TableCell>
                      {adminUser.isAdmin ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                          {t('admin')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                          {t('user')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {adminUser.createdAt
                        ? new Date(adminUser.createdAt).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openPermissionsDialog(adminUser)}
                                className="rounded-lg h-8 w-8"
                              >
                                <Shield className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('managePermissions')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openResetPasswordDialog(adminUser)}
                          className="rounded-lg"
                        >
                          <KeyRound className="w-4 h-4 mr-1" />
                          {t('resetPassword')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t('createUser')}
            </DialogTitle>
            <DialogDescription>
              {t('createUserDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? t('creating') : t('create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              {t('resetPassword')}
            </DialogTitle>
            <DialogDescription>
              {t('resetPasswordFor', { email: selectedUser?.email || '' })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="newPassword">{t('newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={resetting}>
                {resetting ? t('resetting') : t('resetPassword')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <PermissionsModal
        isOpen={permissionsDialogOpen}
        onClose={() => setPermissionsDialogOpen(false)}
        userId={selectedUser?.id || null}
        userEmail={selectedUser?.email || null}
        isAdmin={selectedUser?.isAdmin || false}
        onSaved={fetchUsers}
      />
    </div>
  );
};

export default Admin;
