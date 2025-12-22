// Sent message types
export interface SentMessagePreview {
  id: string;
  from_address: string;
  sender_name?: string;
  to: string[];
  subject: string;
  status: 'sent' | 'failed';
  provider_message_id?: string;
  created_at: number;
}

export interface SentMessage {
  id: string;
  from_address: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string;
  subject: string;
  text_body?: string;
  html_body?: string;
  provider_message_id?: string;
  status: 'sent' | 'failed';
  error?: string;
  created_at: number;
}

export interface SendEmailPayload {
  from?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendEmailResponse {
  id: string;
  status: string;
  provider_message_id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: number;
}

export interface ComposeDraft {
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  reply_to: string;
  subject: string;
  text: string;
  html: string;
  savedAt: number;
}
