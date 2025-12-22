import { useState, useEffect, useCallback, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailChipsInput } from '@/components/EmailChipsInput';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSentApi, ERROR_MESSAGES } from '@/hooks/useSentApi';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE } from '@/lib/api';
import DOMPurify from 'dompurify';
import { ChevronDown, ChevronUp, Loader2, Send, Clock, AlertCircle, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ComposeDraft, SendEmailPayload } from '@/types/sent';
import type { Message } from '@/types/mail';
import { format } from 'date-fns';

interface SendConfig {
  allowedDomains: string[];
  defaultFrom: string;
  rateLimit: { maxEmails: number; windowMinutes: number };
  isSelfOnly?: boolean;
}

const MAX_SUBJECT_LENGTH = 200;
const DRAFT_STORAGE_KEY = 'bpink_compose_draft';
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB

interface ComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
  replyTo?: Message | null;
  replyAll?: boolean;
  forward?: Message | null;
}

function getDraftKey(userId?: string): string {
  return `${DRAFT_STORAGE_KEY}_${userId || 'anonymous'}`;
}

function loadDraft(userId?: string): ComposeDraft | null {
  try {
    const stored = localStorage.getItem(getDraftKey(userId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore
  }
  return null;
}

function saveDraft(draft: ComposeDraft, userId?: string) {
  try {
    localStorage.setItem(getDraftKey(userId), JSON.stringify(draft));
  } catch {
    // Ignore
  }
}

function clearDraft(userId?: string) {
  try {
    localStorage.removeItem(getDraftKey(userId));
  } catch {
    // Ignore
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ComposeModal({
  open,
  onOpenChange,
  onSent,
  replyTo,
  replyAll,
  forward,
}: ComposeModalProps) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { sendEmail, loading, rateLimit } = useSentApi();

  // Fetch send config from backend
  const { data: configData, isLoading: configLoading, error: configError } = useQuery({
    queryKey: ['send-config'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/send/config`, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to fetch config');
      }
      const json = await res.json();
      return json.data as SendConfig;
    },
    enabled: open,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const allowedDomains = configData?.allowedDomains || [];
  const defaultFrom = configData?.defaultFrom || '';
  const isSelfOnly = configData?.isSelfOnly || false;

  const [fromUsername, setFromUsername] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [replyToEmail, setReplyToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [textContent, setTextContent] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [editorTab, setEditorTab] = useState<'visual' | 'html' | 'preview'>('visual');
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [totalAttachmentSize, setTotalAttachmentSize] = useState(0);

  // Calculate total attachment size when attachments change
  useEffect(() => {
    const total = attachments.reduce((sum, file) => sum + file.size, 0);
    setTotalAttachmentSize(total);
  }, [attachments]);

  // Computed full from address
  const from = fromUsername && selectedDomain ? `${fromUsername}@${selectedDomain}` : '';

  const hasContent = to.length > 0 || subject.trim() || htmlContent.trim() || textContent.trim() || fromUsername.trim();

  // Set default domain when config loads
  useEffect(() => {
    if (allowedDomains.length > 0 && !selectedDomain) {
      setSelectedDomain(allowedDomains[0]);
    }
    if (defaultFrom && !fromUsername) {
      const [username] = defaultFrom.split('@');
      if (username) setFromUsername(username);
    }
  }, [allowedDomains, defaultFrom, selectedDomain, fromUsername]);

  // Lock From inputs when isSelfOnly mode
  useEffect(() => {
    if (isSelfOnly && defaultFrom.includes('@')) {
      const [user, domain] = defaultFrom.split('@');
      if (user) setFromUsername(user);
      if (domain) setSelectedDomain(domain);
    }
  }, [isSelfOnly, defaultFrom]);

  // Check if form is valid
  const isValid = useCallback((): boolean => {
    if (!fromUsername.trim()) return false;
    if (!selectedDomain) return false;
    if (to.length === 0) return false;
    if (!to.every(e => EMAIL_REGEX.test(e))) return false;
    if (cc.length > 0 && !cc.every(e => EMAIL_REGEX.test(e))) return false;
    if (bcc.length > 0 && !bcc.every(e => EMAIL_REGEX.test(e))) return false;
    if (replyToEmail && !EMAIL_REGEX.test(replyToEmail)) return false;
    if (subject.length > MAX_SUBJECT_LENGTH) return false;
    if (!htmlContent.trim() && !textContent.trim()) return false;
    return true;
  }, [fromUsername, selectedDomain, to, cc, bcc, replyToEmail, subject, htmlContent, textContent]);

  // Load draft on mount
  useEffect(() => {
    if (open && !replyTo && !forward) {
      const draft = loadDraft(user?.id);
      if (draft && draft.savedAt) {
        // Parse from address into username and domain
        if (draft.from) {
          const [username, domain] = draft.from.split('@');
          if (username) setFromUsername(username);
          if (domain && allowedDomains.includes(domain)) {
            setSelectedDomain(domain);
          }
        }
        setTo(draft.to || []);
        setCc(draft.cc || []);
        setBcc(draft.bcc || []);
        setReplyToEmail(draft.reply_to || '');
        setSubject(draft.subject || '');
        setHtmlContent(draft.html || '');
        setTextContent(draft.text || '');
        setDraftRestored(true);
        if ((draft.cc && draft.cc.length > 0) || (draft.bcc && draft.bcc.length > 0)) {
          setShowCcBcc(true);
        }
      }
    }
  }, [open, user?.id, replyTo, forward, allowedDomains]);

  // Handle reply/forward prefill
  useEffect(() => {
    if (replyTo && open) {
      setTo([replyTo.from]);
      const originalSubject = replyTo.subject || '';
      const prefix = originalSubject.toLowerCase().startsWith('re:') ? '' : 'Re: ';
      setSubject(`${prefix}${originalSubject}`);
      
      const date = format(new Date(replyTo.receivedAt), 'MMM d, yyyy HH:mm');
      const quotedContent = `<br><br><p>On ${date}, ${replyTo.from} wrote:</p><blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 0; color: #666;">${
        replyTo.content_html || replyTo.html || replyTo.content?.html || `<p>${replyTo.content_text || replyTo.text || replyTo.content?.text || ''}</p>`
      }</blockquote>`;
      setHtmlContent(quotedContent);
      
      if (replyAll && Array.isArray(replyTo.to)) {
        const ccList = replyTo.to.filter(e => e !== user?.email);
        setCc(ccList);
        setShowCcBcc(ccList.length > 0);
      }
    } else if (forward && open) {
      setTo([]);
      const originalSubject = forward.subject || '';
      const prefix = originalSubject.toLowerCase().startsWith('fwd:') ? '' : 'Fwd: ';
      setSubject(`${prefix}${originalSubject}`);
      
      const date = format(new Date(forward.receivedAt), 'MMM d, yyyy HH:mm');
      const toList = Array.isArray(forward.to) ? forward.to.join(', ') : forward.to || '';
      const forwardContent = `<br><br>---------- Forwarded message ----------<br>
From: ${forward.from}<br>
Date: ${date}<br>
Subject: ${forward.subject}<br>
To: ${toList}<br><br>
${forward.content_html || forward.html || forward.content?.html || `<p>${forward.content_text || forward.text || forward.content?.text || ''}</p>`}`;
      setHtmlContent(forwardContent);
    }
  }, [replyTo, replyAll, forward, open, user?.email]);

  // Debounced auto-save draft (60 seconds after last change)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!open) return;
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    if (hasContent) {
      // Set new timer - save after 60 seconds of inactivity
      autoSaveTimerRef.current = setTimeout(() => {
        const draft: ComposeDraft = {
          from,
          to,
          cc,
          bcc,
          reply_to: replyToEmail,
          subject,
          text: textContent,
          html: htmlContent,
          savedAt: Date.now(),
        };
        saveDraft(draft, user?.id);
      }, 60000); // 60 seconds
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [open, from, to, cc, bcc, replyToEmail, subject, textContent, htmlContent, hasContent, user?.id]);

  const handleClose = () => {
    if (hasContent) {
      setDiscardDialogOpen(true);
    } else {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleDiscard = () => {
    clearDraft(user?.id);
    resetForm();
    setDiscardDialogOpen(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    // Reset to defaults from config
    if (defaultFrom) {
      const [username] = defaultFrom.split('@');
      setFromUsername(username || '');
    } else {
      setFromUsername('');
    }
    if (allowedDomains.length > 0) {
      setSelectedDomain(allowedDomains[0]);
    }
    setTo([]);
    setCc([]);
    setBcc([]);
    setReplyToEmail('');
    setSubject('');
    setHtmlContent('');
    setTextContent('');
    setShowCcBcc(false);
    setDraftRestored(false);
    setAttachments([]);
  };

  const handleAddAttachments = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const newFiles = [...attachments, ...fileArray];
    const newTotal = newFiles.reduce((sum, f) => sum + f.size, 0);
    
    if (newTotal > MAX_ATTACHMENT_SIZE) {
      toast.error('Total attachment size exceeds 5MB');
      return;
    }
    
    setAttachments(newFiles);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!isValid()) return;

    const payload: SendEmailPayload = {
      from,
      to,
      subject,
      html: htmlContent || undefined,
      text: textContent || undefined,
    };

    if (cc.length > 0) payload.cc = cc;
    if (bcc.length > 0) payload.bcc = bcc;
    if (replyToEmail) payload.reply_to = replyToEmail;

    const result = await sendEmail(payload, attachments.length > 0 ? attachments : undefined);
    if (result) {
      clearDraft(user?.id);
      resetForm();
      onOpenChange(false);
      onSent?.();
    }
  };

  // Rate limit display
  const rateLimitInfo = (() => {
    if (rateLimit.resetAt && Date.now() < rateLimit.resetAt) {
      const remaining = Math.ceil((rateLimit.resetAt - Date.now()) / 60000);
      return {
        remaining: rateLimit.remaining,
        resetMinutes: remaining,
        isLimited: rateLimit.remaining <= 0,
      };
    }
    return { remaining: rateLimit.limit, resetMinutes: 0, isLimited: false };
  })();

  // Loading skeleton for form fields
  const LoadingSkeleton = () => (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* From field skeleton */}
      <div>
        <Skeleton className="h-4 w-12 mb-1.5" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-4 w-3" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
      </div>
      
      {/* To field skeleton */}
      <div>
        <Skeleton className="h-4 w-8 mb-1.5" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      {/* Subject field skeleton */}
      <div>
        <Skeleton className="h-4 w-16 mb-1.5" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      {/* Editor skeleton */}
      <div className="flex-1 min-h-[200px]">
        <Skeleton className="h-4 w-20 mb-1.5" />
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-[180px] w-full" />
      </div>
      
      {/* Send button skeleton */}
      <div className="flex justify-end pt-2 border-t border-border">
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );

  // Show loading state with skeleton
  if (configLoading) {
    return isMobile ? (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95vh] p-0">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle>Compose Email</SheetTitle>
          </SheetHeader>
          <LoadingSkeleton />
        </SheetContent>
      </Sheet>
    ) : (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          <LoadingSkeleton />
        </DialogContent>
      </Dialog>
    );
  }

  // Show error state only for actual config errors
  if (configError) {
    const errorContent = (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load email configuration. Please try again.
        </AlertDescription>
      </Alert>
    );

    return isMobile ? (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto p-0">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle>Compose Email</SheetTitle>
          </SheetHeader>
          {errorContent}
          <div className="p-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    ) : (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          {errorContent}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const content = (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Rate limit indicator */}
      {rateLimitInfo.remaining < 5 && (
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm',
          rateLimitInfo.isLimited ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning-foreground'
        )}>
          <Clock className="w-4 h-4" />
          <span>
            {rateLimitInfo.isLimited
              ? `Rate limited. Please wait ${rateLimitInfo.resetMinutes} minute(s).`
              : `${rateLimitInfo.remaining} emails remaining`}
          </span>
        </div>
      )}

      {/* Draft restored banner */}
      {draftRestored && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-muted text-sm">
          <span>Draft restored</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearDraft(user?.id);
              resetForm();
              setDraftRestored(false);
            }}
          >
            Discard
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* From - Username + Domain Dropdown */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">From</label>
          <div className="flex items-center gap-2">
            <Input
              value={fromUsername}
              onChange={(e) => setFromUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
              placeholder="username"
              className={cn("flex-1", isSelfOnly && "bg-muted cursor-not-allowed")}
              disabled={isSelfOnly}
            />
            <span className="text-muted-foreground font-medium">@</span>
            <Select 
              value={selectedDomain} 
              onValueChange={setSelectedDomain}
              disabled={isSelfOnly || allowedDomains.length <= 1}
            >
              <SelectTrigger className={cn("w-[180px]", isSelfOnly && "bg-muted cursor-not-allowed")}>
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {allowedDomains.map((domain) => (
                  <SelectItem key={domain} value={domain}>
                    {domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isSelfOnly ? (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5 flex items-center gap-1">
              🔒 From address locked to: <strong>{defaultFrom}</strong>
            </p>
          ) : fromUsername && selectedDomain ? (
            <p className="text-xs text-muted-foreground mt-1.5">
              Email will be sent from: <span className="font-medium text-foreground">{from}</span>
            </p>
          ) : null}
        </div>

        {/* To */}
        <EmailChipsInput
          label="To"
          required
          value={to}
          onChange={setTo}
          placeholder="Add recipients..."
          error={to.length === 0 ? undefined : undefined}
        />

        {/* CC/BCC toggle */}
        <button
          type="button"
          onClick={() => setShowCcBcc(!showCcBcc)}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          {showCcBcc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showCcBcc ? 'Hide CC/BCC' : 'Add CC/BCC'}
        </button>

        {showCcBcc && (
          <>
            <EmailChipsInput
              label="CC"
              value={cc}
              onChange={setCc}
              placeholder="Add CC recipients..."
            />
            <EmailChipsInput
              label="BCC"
              value={bcc}
              onChange={setBcc}
              placeholder="Add BCC recipients..."
            />
          </>
        )}

        {/* Reply-To */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Reply-To (optional)</label>
          <Input
            type="email"
            value={replyToEmail}
            onChange={(e) => setReplyToEmail(e.target.value)}
            placeholder="reply@example.com"
          />
        </div>

        {/* Subject */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-foreground">Subject</label>
            <span className={cn(
              'text-xs',
              subject.length > 180 ? 'text-warning-foreground' : 'text-muted-foreground',
              subject.length > MAX_SUBJECT_LENGTH && 'text-destructive'
            )}>
              {subject.length} / {MAX_SUBJECT_LENGTH}
            </span>
          </div>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            maxLength={MAX_SUBJECT_LENGTH + 50}
            className={cn(subject.length > MAX_SUBJECT_LENGTH && 'border-destructive')}
          />
        </div>

        {/* Body Editor */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Body</label>
          <Tabs value={editorTab} onValueChange={(v) => setEditorTab(v as any)}>
            <TabsList className="mb-2">
              <TabsTrigger value="visual">Rich Text</TabsTrigger>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="visual" className="mt-0">
              <RichTextEditor
                value={htmlContent}
                onChange={setHtmlContent}
                placeholder="Write your message..."
              />
            </TabsContent>
            <TabsContent value="html" className="mt-0">
              <Textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="<p>Your HTML content...</p>"
                className="min-h-[250px] font-mono text-sm"
              />
            </TabsContent>
            <TabsContent value="preview" className="mt-0">
              <div className="border border-input rounded-lg p-4 min-h-[250px] bg-white">
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(htmlContent, { USE_PROFILES: { html: true } }),
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Attachments Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Attachments (max 5MB total)</Label>
          
          {/* File input */}
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <Input
                type="file"
                multiple
                onChange={(e) => {
                  handleAddAttachments(e.target.files);
                  e.target.value = ''; // Reset input
                }}
                className="hidden"
              />
              <div className="flex items-center gap-2 px-3 py-2 border border-input rounded-md bg-background hover:bg-accent text-sm transition-colors">
                <Paperclip className="w-4 h-4" />
                <span>Add files</span>
              </div>
            </label>
            
            <span className={cn(
              'text-xs',
              totalAttachmentSize > MAX_ATTACHMENT_SIZE * 0.8 ? 'text-warning-foreground' : 'text-muted-foreground',
              totalAttachmentSize > MAX_ATTACHMENT_SIZE && 'text-destructive'
            )}>
              {(totalAttachmentSize / 1024 / 1024).toFixed(2)} MB / 5 MB
            </span>
          </div>
          
          {/* Attachment list */}
          {attachments.length > 0 && (
            <div className="space-y-1">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{file.name}</span>
                    <span className="text-muted-foreground flex-shrink-0">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAttachment(index)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={!isValid() || loading.sending || rateLimitInfo.isLimited}
        >
          {loading.sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send
            </>
          )}
        </Button>
      </div>

      {/* Discard confirmation */}
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard this draft?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => v ? onOpenChange(true) : handleClose()}>
        <SheetContent side="bottom" className="h-[95vh] p-0">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle>Compose Email</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => v ? onOpenChange(true) : handleClose()}>
      <DialogContent className="max-w-[800px] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
