import "server-only"

import type { Me } from "@/lib/machina/types"

/**
 * Base URL of the Machina API (machina_backend), or null when it isn't
 * configured: then the built-in mock API serves everything, sign-in included.
 * next.config.ts reads the same variable to proxy the account routes.
 */
export function backendUrl(): string | null {
  return process.env.MACHINA_API_URL?.replace(/\/+$/, "") || null
}

/** The signed-in user according to the API, for a request's Cookie header. */
export async function fetchMe(base: string, cookieHeader: string): Promise<Me | null> {
  if (!cookieHeader) return null
  const res = await fetch(`${base}/api/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  })
  // 401: signed out. 403: suspended, or the company is no longer approved.
  if (res.status === 401 || res.status === 403) return null
  if (!res.ok) throw new Error(`Machina API GET /api/auth/me failed: ${res.status}`)
  return (await res.json()) as Me
}
