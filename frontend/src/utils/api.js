// Centralized API helpers to ensure every backend call includes owner_id.

export function getOwnerId() {
  const envOwner = import.meta?.env?.VITE_OWNER_ID;
  if (envOwner && String(envOwner).trim()) return String(envOwner).trim();

  try {
    const lsOwner = window?.localStorage?.getItem('owner_id');
    if (lsOwner && String(lsOwner).trim()) return String(lsOwner).trim();
  } catch {
    // ignore
  }

  // Backwards-compatible default (repo already hardcodes user_test in some calls)
  return 'user_test';
}

export function withOwnerId(url, ownerId = getOwnerId()) {
  if (!ownerId) return url;

  const u = new URL(url, window.location.origin);
  if (!u.searchParams.has('owner_id')) {
    u.searchParams.set('owner_id', ownerId);
  }
  return u.toString();
}

function getHeader(headers, name) {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (String(k).toLowerCase() === lower) return String(v);
  }
  return null;
}

function tryInjectOwnerIdIntoJsonString(bodyString, ownerId) {
  if (!ownerId || typeof bodyString !== 'string') return bodyString;
  try {
    const parsed = JSON.parse(bodyString);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return bodyString;
    if (Object.prototype.hasOwnProperty.call(parsed, 'owner_id')) return bodyString;
    return JSON.stringify({ ...parsed, owner_id: ownerId });
  } catch {
    return bodyString;
  }
}

function withOwnerIdInInit(init, ownerId) {
  if (!init || !ownerId) return init;
  if (!('body' in init) || init.body == null) return init;

  // FormData: append owner_id if not already present
  if (typeof FormData !== 'undefined' && init.body instanceof FormData) {
    if (!init.body.has('owner_id')) init.body.append('owner_id', ownerId);
    return init;
  }

  // If content-type is JSON and body is stringified JSON, inject owner_id
  const contentType = getHeader(init.headers, 'content-type') || '';
  if (contentType.toLowerCase().includes('application/json') && typeof init.body === 'string') {
    return { ...init, body: tryInjectOwnerIdIntoJsonString(init.body, ownerId) };
  }

  return init;
}

export async function apiFetch(url, init) {
  const ownerId = getOwnerId();
  const urlWithOwner = withOwnerId(url, ownerId);
  const initWithOwner = withOwnerIdInInit(init, ownerId);
  return fetch(urlWithOwner, initWithOwner);
}
