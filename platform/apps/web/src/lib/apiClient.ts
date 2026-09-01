import { firebaseAuth } from "./firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

async function getAuthHeader(forceRefresh = false): Promise<Record<string, string>> {
  const user = firebaseAuth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken(forceRefresh);
  return { Authorization: `Bearer ${token}` };
}

// Successor to config-worker.js: every call goes through this instead of hitting
// Airtable/the Cloudflare Worker directly, and it always sends a real Firebase ID
// token — the new Express API actually verifies it, unlike the old Worker.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const doFetch = async (forceRefresh: boolean) => {
    const authHeader = await getAuthHeader(forceRefresh);
    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
        ...options.headers,
      },
    });
  };

  let res = await doFetch(false);

  // The Firebase client SDK caches ID tokens and only refreshes them on their own
  // ~hourly cycle — it doesn't know when a token's claims (email_verified, or a role
  // change requiring a custom-claim refresh) go stale sooner than that. A fresh
  // sign-in can briefly still be holding an older cached token from an earlier
  // session on the same device (confirmed via real end-to-end testing: sign-up
  // auto-logs in with an unverified token, and a *parallel* auth-state listener can
  // race a normal sign-in's own token refresh). Retrying once with a forced refresh
  // handles this whole class of staleness without needing to reason about which
  // call site raced; a token that's genuinely invalid will just fail the same way twice.
  if ((res.status === 401 || res.status === 403) && firebaseAuth.currentUser) {
    res = await doFetch(true);
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => undefined);

  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `Request failed with status ${res.status}`, body?.details);
  }

  return body as T;
}

export const apiGet = <T>(path: string) => apiFetch<T>(path);
export const apiPost = <T>(path: string, data?: unknown) =>
  apiFetch<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined });
export const apiPatch = <T>(path: string, data?: unknown) =>
  apiFetch<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined });
export const apiDelete = <T>(path: string) => apiFetch<T>(path, { method: "DELETE" });
