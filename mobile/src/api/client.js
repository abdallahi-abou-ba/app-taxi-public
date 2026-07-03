import { getApiBaseUrl } from '../config/env';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Wired up by AuthContext once it exists (see src/context/AuthContext.js):
// lets this module attach the current access token and react to a 401 by
// refreshing and retrying once, without api/*.js callers needing to know
// anything about tokens.
let getAccessToken = () => null;
let onUnauthorized = async () => false; // returns true if a retry should be attempted

export function configureApiAuth({ getAccessToken: getToken, onUnauthorized: onUnauth }) {
  getAccessToken = getToken;
  onUnauthorized = onUnauth;
}

async function parseResponse(res) {
  const json = await res.json().catch(() => null);
  if (!json || !json.success) {
    const error = json?.error || {};
    throw new ApiError(res.status, error.code || 'UNKNOWN_ERROR', error.message || 'Something went wrong', error.details);
  }
  return json.data;
}

async function doFetch(method, path, { body, skipAuth } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(getApiBaseUrl() + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return { res, path, skipAuth };
}

export async function request(method, path, options = {}) {
  const { res } = await doFetch(method, path, options);

  if (res.status === 401 && !options.skipAuth) {
    const shouldRetry = await onUnauthorized();
    if (shouldRetry) {
      const { res: retryRes } = await doFetch(method, path, options);
      return parseResponse(retryRes);
    }
  }

  return parseResponse(res);
}

export const api = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...options, body }),
  patch: (path, body, options) => request('PATCH', path, { ...options, body }),
  delete: (path, body, options) => request('DELETE', path, { ...options, body }),
};
