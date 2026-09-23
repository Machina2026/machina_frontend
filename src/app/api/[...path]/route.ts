import { NextResponse, type NextRequest } from "next/server"

import { ROLE_COOKIE, SESSION_COOKIE } from "@/lib/auth/roles"
import { getStore } from "@/server/mock/instance"
import {
  dispatch,
  type FileResult,
  type LogoutResult,
  type SessionResult,
} from "@/server/mock/routes"
import { ApiError } from "@/server/mock/services"

// Mock backend: every /api/* request is dispatched to the in-memory demo API.
// Replace this file (or point the client at a real API) when the backend exists.

const MAX_BODY = 25 * 1024 * 1024
const COOKIE = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 24 * 3600,
}
const NO_STORE = { "Cache-Control": "no-store" }

const isKind = <T extends { kind: string }>(v: unknown, kind: T["kind"]): v is T =>
  typeof v === "object" && v !== null && (v as { kind?: unknown }).kind === kind

function clearSession(res: NextResponse) {
  res.cookies.delete(SESSION_COOKIE)
  res.cookies.delete(ROLE_COOKIE)
  return res
}

async function handle(request: NextRequest) {
  const method = request.method
  let body: Record<string, unknown> = {}
  if (method === "POST" || method === "PUT") {
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) {
      return NextResponse.json({ error: "Request too large", fields: {} }, { status: 413 })
    }
    const raw = await request.text()
    try {
      body = raw ? JSON.parse(raw) : {}
    } catch {
      return NextResponse.json({ error: "Invalid JSON", fields: {} }, { status: 400 })
    }
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? null
  const query = Object.fromEntries(request.nextUrl.searchParams)
  const store = getStore()

  try {
    const result = store.transaction(() =>
      dispatch({ store, token, body, query }, method, request.nextUrl.pathname)
    )
    if (isKind<FileResult>(result, "file")) {
      return new Response(new Uint8Array(result.content), {
        headers: {
          ...NO_STORE,
          "Content-Type": result.meta.mime,
          "Content-Disposition": `inline; filename="${result.meta.name.replace(/"/g, "")}"`,
          "X-Content-Type-Options": "nosniff",
        },
      })
    }
    if (isKind<SessionResult>(result, "session")) {
      const res = NextResponse.json(result.body, { headers: NO_STORE })
      res.cookies.set(SESSION_COOKIE, result.token, COOKIE)
      res.cookies.set(ROLE_COOKIE, result.role, COOKIE)
      return res
    }
    if (isKind<LogoutResult>(result, "logout")) {
      return clearSession(NextResponse.json(result.body, { headers: NO_STORE }))
    }
    return NextResponse.json(result, { headers: NO_STORE })
  } catch (err) {
    if (err instanceof ApiError) {
      const res = NextResponse.json(
        { error: err.message, fields: err.fields },
        { status: err.status, headers: NO_STORE }
      )
      // An expired or unknown session: drop the cookies so the UI shows the user as signed out.
      return err.status === 401 && token ? clearSession(res) : res
    }
    console.error(err)
    return NextResponse.json({ error: "Internal server error", fields: {} }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
