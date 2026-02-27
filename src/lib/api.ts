// CSRF token store
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.bpink.io.vn';

export interface ApiError {
  message: string;
  status: number;
}

const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

async function refreshCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/me`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (data?.data?.csrfToken) {
      csrfToken = data.data.csrfToken;
      return csrfToken;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const method = (options.method || 'GET').toUpperCase();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Add Content-Type for JSON bodies
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  // Add CSRF token to state-changing requests
  if (STATE_CHANGING_METHODS.includes(method) && csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  console.log(`[API] ${method} ${url}`);

  const doFetch = async (): Promise<T> => {
    const res = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: 'include',
    });

    let data: any;
    const text = await res.text();

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error('[API] Failed to parse JSON:', text.substring(0, 500));
      throw {
        message: `Invalid JSON response: ${text.substring(0, 200)}`,
        status: res.status,
      } as ApiError;
    }

    console.log(`[API] Response ${res.status}:`, data);

    if (!res.ok) {
      const errorMessage = data?.error || data?.message || res.statusText || 'Request failed';
      console.error(`[API] Error ${res.status}:`, errorMessage);
      throw {
        message: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
        status: res.status,
      } as ApiError;
    }

    return data as T;
  };

  try {
    return await doFetch();
  } catch (err) {
    const apiErr = err as ApiError;
    // Auto-retry once on 403 CSRF error
    if (apiErr.status === 403 && STATE_CHANGING_METHODS.includes(method)) {
      console.log('[API] 403 on state-changing request, refreshing CSRF token...');
      const newToken = await refreshCsrfToken();
      if (newToken) {
        headers['x-csrf-token'] = newToken;
        return await doFetch();
      }
    }
    throw err;
  }
}
