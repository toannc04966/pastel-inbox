export interface Inbox {
  id: string;
  address: string;
  domain: string;
  createdAt: string;
}

export interface MessagePreview {
  id: string;
  from: string;
  sender_name?: string;
  sender_email?: string;
  subject: string;
  preview: string;
  receivedAt: string;
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
  attachments?: Attachment[];
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: { message: string };
}
