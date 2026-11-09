const API_ROOT = '/api';

export class ApiError extends Error {
  constructor(message, code = 'REQUEST_FAILED', status = 0, details = []) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function api(path, options = {}) {
  const { redirectOn401 = true, ...init } = options;
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  let payload = {};
  try { payload = await response.json(); } catch { /* Empty response is handled below. */ }
  if (!response.ok) {
    const error = payload.error || {};
    if (response.status === 401 && redirectOn401 && !location.pathname.endsWith('login.html')) {
      location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    }
    throw new ApiError(error.message || 'Permintaan belum berhasil. Coba lagi.', error.code, response.status, error.details);
  }
  return payload.data;
}

export const get = (path, options) => api(path, options);
export const post = (path, body, options = {}) => api(path, { ...options, method: 'POST', body: JSON.stringify(body) });
export const patch = (path, body, options = {}) => api(path, { ...options, method: 'PATCH', body: JSON.stringify(body) });
export const remove = (path, options = {}) => api(path, { ...options, method: 'DELETE' });
