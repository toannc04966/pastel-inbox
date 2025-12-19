export interface User {
  id: string;
  email: string;
  isAdmin?: boolean;
}

export interface AuthResponse {
  ok: boolean;
  data?: { user: User };
  error?: string;
}
