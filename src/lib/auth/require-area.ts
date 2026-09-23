import "server-only"

import { redirect } from "next/navigation"

import { canAccessArea, homePathForRole, type Area } from "./roles"
import { getSessionUser } from "./session"

/** Server-side backup to proxy.ts: send users without access to the right place. */
export async function requireArea(area: Area) {
  const user = await getSessionUser()
  if (!user) redirect(`/login?next=/${area}`)
  if (!canAccessArea(user.role, area)) redirect(homePathForRole(user.role))
  return user
}
