export const API_BASE = 'https://bpink-mail.ahn2k22.workers.dev';

export interface ApiError {
  message: string;
  status: number;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  
  const headers: HeadersInit = {
    ...options.headers,
  };

  // Add Content-Type for JSON bodies
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  console.log(`[API] ${options.method || 'GET'} ${url}`);

  const res = await fetch(url, {
    ...options,
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
}
