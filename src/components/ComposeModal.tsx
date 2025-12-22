import { useState, useEffect, useCallback } from 'react';
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
import { ChevronDown, ChevronUp, Loader2, Send, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComposeDraft, SendEmailPayload } from '@/types/sent';
import type { Message } from '@/types/mail';
import { format } from 'date-fns';

interface SendConfig {
  allowedDomains: string[];
  defaultFrom: string;
  rateLimit: { maxEmails: number; windowMinutes: number };
}

const MAX_SUBJECT_LENGTH = 200;
const DRAFT_STORAGE_KEY = 'bpink_compose_draft';

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
      const res = await fetch(`${API_BASE}/send/config`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch config');
      const json = await res.json();
      return json.data as SendConfig;
    },
    enabled: open,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const allowedDomains = configData?.allowedDomains || [];
  const defaultFrom = configData?.defaultFrom || '';

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

  // Auto-save draft
  useEffect(() => {
    if (!open) return;
    
    const timer = setInterval(() => {
      if (hasContent) {
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
      }
    }, 5000);

    return () => clearInterval(timer);
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

    const result = await sendEmail(payload);
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

  // Show loading state
  if (configLoading) {
    return isMobile ? (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95vh] p-0">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </SheetContent>
      </Sheet>
    ) : (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl h-[80vh]">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show error or no permission state
  if (configError || allowedDomains.length === 0) {
    const errorContent = (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {configError ? 'Failed to load email configuration.' : 'You do not have permission to send emails.'}
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
              className="flex-1"
            />
            <span className="text-muted-foreground font-medium">@</span>
            <Select 
              value={selectedDomain} 
              onValueChange={setSelectedDomain}
              disabled={allowedDomains.length <= 1}
            >
              <SelectTrigger className="w-[180px]">
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
          {fromUsername && selectedDomain && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Email will be sent from: <span className="font-medium text-foreground">{from}</span>
            </p>
          )}
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
