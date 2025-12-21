import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Shield, AlertCircle, Check, ChevronsUpDown } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PermissionMode } from '@/types/mail';

interface PermissionRow {
  id: string;
  domain: string;
  mode: PermissionMode;
  error?: string;
}

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userEmail: string | null;
  onSaved?: () => void;
}

interface PermissionsResponse {
  ok: boolean;
  data?: {
    userId: string;
    email: string;
    permissions: Array<{ domain: string; mode: PermissionMode }>;
  };
  error?: string;
}

interface DomainsResponse {
  ok: boolean;
  data?: {
    domains: string[];
  };
  error?: string;
}

const validateDomain = (domain: string): string | null => {
  if (!domain || !domain.trim()) {
    return 'Domain is required';
  }
  
  const normalized = domain.trim().toLowerCase();
  
  if (normalized.includes('@')) {
    return 'Enter domain only, without @ or email address';
  }
  
  if (normalized.includes('://')) {
    return 'Enter domain only, without http:// or https://';
  }
  
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
  if (!domainRegex.test(normalized)) {
    return 'Invalid domain format (e.g., example.com)';
  }
  
  return null;
};

function DomainCombobox({
  value,
  onChange,
  availableDomains,
  error,
  permId,
}: {
  value: string;
  onChange: (value: string) => void;
  availableDomains: string[];
  error?: string;
  permId: string;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filteredDomains = availableDomains.filter((domain) =>
    domain.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (domain: string) => {
    onChange(domain);
    setInputValue(domain);
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
    if (!open) setOpen(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            data-permission-id={permId}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Select or type domain"
            className={cn(
              'pr-8',
              error ? 'border-destructive' : ''
            )}
          />
          <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandList>
            {filteredDomains.length === 0 ? (
              <CommandEmpty>
                {inputValue ? 'Press Enter to use custom domain' : 'No domains available'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredDomains.map((domain) => (
                  <CommandItem
                    key={domain}
                    value={domain}
                    onSelect={() => handleSelect(domain)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === domain ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {domain}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function PermissionsModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  onSaved,
}: PermissionsModalProps) {
  const { t } = useLanguage();
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchPermissions();
      fetchDomains();
    }
  }, [isOpen, userId]);

  const fetchDomains = async () => {
    try {
      const res = await apiFetch<DomainsResponse>(
        '/api/v1/domains',
        { credentials: 'include' }
      );
      
      if (res.ok && res.data) {
        // Filter out "all" from available domains
        setAvailableDomains(res.data.domains.filter((d) => d !== 'all'));
      }
    } catch (err) {
      console.error('Failed to fetch domains:', err);
    }
  };

  const fetchPermissions = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const res = await apiFetch<PermissionsResponse>(
        `/api/v1/admin/users/${userId}/permissions`,
        { credentials: 'include' }
      );
      
      if (res.ok && res.data) {
        setPermissions(
          res.data.permissions.map((p) => ({
            id: crypto.randomUUID(),
            domain: p.domain,
            mode: p.mode,
          }))
        );
        setHasChanges(false);
      }
    } catch (err: any) {
      toast.error(err.message || t('loadUsersFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const addPermission = () => {
    const newId = crypto.randomUUID();
    setPermissions([
      ...permissions,
      {
        id: newId,
        domain: '',
        mode: 'ALL_INBOXES',
      },
    ]);
    setHasChanges(true);
    
    // Auto-focus new input after render
    setTimeout(() => {
      const input = document.querySelector(`input[data-permission-id="${newId}"]`) as HTMLInputElement;
      input?.focus();
    }, 50);
  };

  const removePermission = (id: string) => {
    setPermissions(permissions.filter((p) => p.id !== id));
    setHasChanges(true);
  };

  const updatePermission = (id: string, field: 'domain' | 'mode', value: string) => {
    setPermissions(
      permissions.map((p) => {
        if (p.id !== id) return p;
        
        const updated = { ...p, [field]: value };
        
        // Validate domain on change
        if (field === 'domain') {
          updated.error = validateDomain(value) || undefined;
        }
        
        return updated;
      })
    );
    setHasChanges(true);
  };

  const validateAll = (): boolean => {
    let valid = true;
    const domains = new Set<string>();
    
    const validated = permissions.map((p) => {
      const domainError = validateDomain(p.domain);
      const normalizedDomain = p.domain.trim().toLowerCase();
      
      let error = domainError;
      
      if (!error && domains.has(normalizedDomain)) {
        error = 'Duplicate domain';
      }
      
      domains.add(normalizedDomain);
      
      if (error) valid = false;
      
      return { ...p, error };
    });
    
    setPermissions(validated);
    return valid;
  };

  const savePermissions = async () => {
    if (!userId) return;
    
    if (!validateAll()) {
      toast.error(t('invalidEmailFormat'));
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await apiFetch<{ ok: boolean; error?: string }>(
        `/api/v1/admin/users/${userId}/permissions`,
        {
          method: 'PUT',
          body: JSON.stringify({
            permissions: permissions.map((p) => ({
              domain: p.domain.trim().toLowerCase(),
              mode: p.mode,
            })),
          }),
          credentials: 'include',
        }
      );
      
      if (res.ok) {
        toast.success(t('permissionsUpdated'));
        setHasChanges(false);
        onSaved?.();
        onClose();
      } else {
        throw new Error(res.error || 'Failed to save');
      }
    } catch (err: any) {
      toast.error(err.message || t('permissionsUpdateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm(t('discardChanges'))) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('managePermissions')}
          </DialogTitle>
          <DialogDescription>{userEmail}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : permissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('noPermissions')}</p>
              <p className="text-sm mt-1">{t('clickAddPermission')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-[1fr_180px_40px] gap-2 px-1 text-xs font-medium text-muted-foreground">
                <span>{t('domain')}</span>
                <span>{t('mode')}</span>
                <span></span>
              </div>
              
              {/* Permission rows */}
              {permissions.map((perm) => (
                <div key={perm.id} className="space-y-1">
                  <div className="grid grid-cols-[1fr_180px_40px] gap-2 items-center">
                    <DomainCombobox
                      value={perm.domain}
                      onChange={(value) => updatePermission(perm.id, 'domain', value)}
                      availableDomains={availableDomains}
                      error={perm.error}
                      permId={perm.id}
                    />
                    <Select
                      value={perm.mode}
                      onValueChange={(value) => updatePermission(perm.id, 'mode', value)}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {perm.mode === 'ALL_INBOXES' ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-sm">All Inboxes</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span className="text-sm">Address Only</span>
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_INBOXES">
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              All Inboxes
                            </span>
                            <span className="text-xs text-muted-foreground">Browse all emails in domain</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="ADDRESS_ONLY">
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              Address Only
                            </span>
                            <span className="text-xs text-muted-foreground">Must specify email to view</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePermission(perm.id)}
                      className="h-9 w-9 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {perm.error && (
                    <p className="text-xs text-destructive flex items-center gap-1 px-1">
                      <AlertCircle className="w-3 h-3" />
                      {perm.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Mode explanation */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">{t('permissionModes')}:</p>
            <ul className="space-y-1">
              <li className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-medium">All Inboxes</span> — {t('allInboxesDesc')}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-medium">Address Only</span> — {t('addressOnlyDesc')}
              </li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={addPermission}
            disabled={permissions.length >= 50}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('addPermission')}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              {t('cancel')}
            </Button>
            <Button onClick={savePermissions} disabled={isSaving || !hasChanges}>
              {isSaving ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
