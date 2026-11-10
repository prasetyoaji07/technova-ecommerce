const API_ROOT = '/api';
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR_MIN = 500;
const MESSAGE_DEFAULT = 'Permintaan belum berhasil. Coba lagi.';
const MESSAGE_TOO_MANY = 'Terlalu banyak permintaan, tunggu sebentar.';
const MESSAGE_SERVER = 'Server bermasalah. Coba lagi beberapa saat.';
const MESSAGE_NETWORK = 'Koneksi bermasalah. Periksa jaringan kamu lalu coba lagi.';

export class ApiError extends Error {
  constructor(message, code = 'REQUEST_FAILED', status = 0, details = []) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function fallbackMessage(status) {
  if (status === HTTP_TOO_MANY_REQUESTS) return MESSAGE_TOO_MANY;
  if (status >= HTTP_SERVER_ERROR_MIN) return MESSAGE_SERVER;
  return MESSAGE_DEFAULT;
}

async function send(path, init) {
  try {
    return await fetch(`${API_ROOT}${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
    });
  } catch (cause) {
    console.error('network', path, cause);
    throw new ApiError(MESSAGE_NETWORK, 'NETWORK_ERROR', 0);
  }
}

export async function api(path, options = {}) {
  const { redirectOn401 = true, ...init } = options;
  const response = await send(path, init);
  // Respons 429 dari rate limiter berupa teks biasa, bukan JSON envelope.
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(response.status, path);
    const error = payload.error || {};
    if (response.status === 401 && redirectOn401 && !location.pathname.endsWith('login.html')) {
      location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    }
    throw new ApiError(error.message || fallbackMessage(response.status), error.code, response.status, error.details);
  }
  return payload.data;
}

export const get = (path, options) => api(path, options);
export const post = (path, body, options = {}) => api(path, { ...options, method: 'POST', body: JSON.stringify(body) });
export const patch = (path, body, options = {}) => api(path, { ...options, method: 'PATCH', body: JSON.stringify(body) });
export const remove = (path, options = {}) => api(path, { ...options, method: 'DELETE' });