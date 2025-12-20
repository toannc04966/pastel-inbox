export interface Inbox {
  id: string;
  address: string;
  domain: string;
  createdAt: string;
}

export interface MessagePreview {
  id: string;
  from: string;
  subject: string;
  preview: string;
  receivedAt: string;
}

export interface MessageContent {
  text?: string;
  html?: string;
  raw?: string;
}

export interface Message {
  id: string;
  inboxId: string;
  from: string;
  subject: string;
  receivedAt: string;
  content?: MessageContent;
  html?: string;
  text?: string;
  raw?: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: { message: string };
}
