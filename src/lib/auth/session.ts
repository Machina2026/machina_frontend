import "server-only"

import { cookies } from "next/headers"

import type { User } from "@/lib/machina/types"
import { userForToken } from "@/server/mock/auth"
import { getStore } from "@/server/mock/instance"

import { SESSION_COOKIE } from "./roles"

/** The signed-in user, resolved from the session cookie against the (mock) API store. */
export async function getSessionUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return userForToken(getStore(), token)
}
