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

  const resp = await fetch(`${API}${path}`, {
    ...init,
    headers,
    body: json !== undefined ? JSON.stringify(json) : init.body,
  });

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
