import "server-only"

import { cookies } from "next/headers"

import type { SessionUser } from "@/lib/machina/types"
import { userForToken } from "@/server/mock/auth"
import { getStore } from "@/server/mock/instance"

import { backendUrl, fetchMe } from "./backend"
import { SESSION_COOKIE } from "./roles"

/** The signed-in user: from the Machina API when configured, else from the mock store. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies()
  const base = backendUrl()
  if (base) return (await fetchMe(base, jar.toString()))?.user ?? null
  return userForToken(getStore(), jar.get(SESSION_COOKIE)?.value)
}
