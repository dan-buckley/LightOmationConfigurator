const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export interface ApiError {
  code: string;
  message: string;
  detail?: unknown;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError; status: number };

async function request<T>(path: string, options?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        ok: false,
        status: res.status,
        error: {
          code: body.code ?? String(res.status),
          message: body.message ?? res.statusText,
          detail: body.detail,
        },
      };
    }
    const body = await res.json();
    return { ok: true, data: body.data ?? body };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: {
        code: 'network_error',
        message: err instanceof Error ? err.message : 'Network error',
      },
    };
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) =>
    // Don't set Content-Type — browser sets it with multipart boundary automatically
    request<T>(path, { method: 'POST', body: form, headers: {} }),
};
