"use client";

const API = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export function getTokens() {
  if (typeof window === "undefined") return { access: null, refresh: null };
  return {
    access: localStorage.getItem("lai_access"),
    refresh: localStorage.getItem("lai_refresh"),
  };
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("lai_access", access);
  localStorage.setItem("lai_refresh", refresh);
}

export function clearTokens() {
  localStorage.removeItem("lai_access");
  localStorage.removeItem("lai_refresh");
}

async function tryRefresh(): Promise<boolean> {
  const { refresh } = getTokens();
  if (!refresh) return false;
  const resp = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!resp.ok) return false;
  const data = await resp.json();
  setTokens(data.access_token, data.refresh_token);
  return true;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isLocalOrigin(): boolean {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function unreachableMessage(): string {
  return isLocalOrigin()
    ? "Cannot reach the LinguaAI backend. Is `docker compose up` running? (Use http://localhost:8080, not the frontend dev port.)"
    : "Cannot reach the LinguaAI server right now. Free-tier servers sleep after 15 minutes idle and take up to a minute to wake up — please try again in a moment.";
}

async function fetchWithWakeupRetry(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    // A network-level failure (not an HTTP error) often means a sleeping
    // free-tier instance was mid-wakeup — give it a moment and retry once.
    await new Promise((r) => setTimeout(r, 4000));
    try {
      return await fetch(url, init);
    } catch {
      throw err;
    }
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
  retried = false
): Promise<T> {
  const { json, ...init } = options;
  const { access } = getTokens();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (access) headers.Authorization = `Bearer ${access}`;
  if (json !== undefined) headers["Content-Type"] = "application/json";

  let resp: Response;
  try {
    resp = await fetchWithWakeupRetry(`${API}${path}`, {
      ...init,
      headers,
      body: json !== undefined ? JSON.stringify(json) : init.body,
    });
  } catch {
    throw new ApiError(0, unreachableMessage());
  }
  // Frontend dev server without a backend answers /api/* itself with an HTML 404
  if (resp.status === 404 && (resp.headers.get("content-type") || "").includes("text/html")) {
    throw new ApiError(0, unreachableMessage());
  }

  if (resp.status === 401 && !retried && (await tryRefresh())) {
    return api<T>(path, options, true);
  }
  if (resp.status === 401) {
    clearTokens();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError(401, "Session expired");
  }
  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = await resp.json();
      detail = body.detail || JSON.stringify(body);
    } catch { /* keep statusText */ }
    throw new ApiError(resp.status, detail);
  }
  if (resp.status === 204) return undefined as T;
  return resp.json();
}

export function wsUrl(runId: string): string {
  const { access } = getTokens();
  const base = process.env.NEXT_PUBLIC_WS_URL || "/api/v1/ws";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = base.startsWith("/") ? `${proto}://${window.location.host}${base}` : base;
  return `${host}/runs/${runId}?token=${access}`;
}
