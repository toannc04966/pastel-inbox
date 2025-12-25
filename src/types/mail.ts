export interface Inbox {
  id: string;
  address: string;
  domain: string;
  createdAt: string;
}

export type PermissionMode = 'ALL_INBOXES' | 'ADDRESS_ONLY' | 'SELF_ONLY';

export interface DomainPermission {
  domain: string;
  mode: PermissionMode;
}

export interface MessagePreview {
  id: string;
  from: string;
  sender_name?: string;
  sender_email?: string;
  subject: string;
  preview: string;
  receivedAt: string;
  inboxId?: string;
  domain?: string;
}

export interface MessageContent {
  text?: string;
  html?: string;
  raw?: string;
}

export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface Message {
  id: string;
  inboxId: string;
  from: string;
  sender_name?: string;
  sender_email?: string;
  to?: string | string[];
  subject: string;
  receivedAt: string;
  content?: MessageContent;
  html?: string;
  text?: string;
  raw?: string;
  is_html?: boolean;
  content_html?: string;
  content_text?: string;
  htmlBody?: string;
  bodyHtml?: string;
  attachments?: Attachment[];
}

export interface RecentEmail {
  email: string;
  messageCount: number;
  lastAccessed: number;
}

export interface RecentEmailsByDomain {
  [domain: string]: RecentEmail[];
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string | { message: string };
}

export interface DomainsData {
  domains: string[];
  permissions: DomainPermission[];
  hasAllInboxesAccess?: boolean;
  hasOnlySelfOnlyMode?: boolean;
  userEmail?: string;
}
