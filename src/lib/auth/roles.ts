import type { Role } from "@/lib/machina/types"

// Kept free of server-only imports so proxy.ts can use it.

export const AREAS = ["buyer", "supplier"] as const
export type Area = (typeof AREAS)[number]

const AREA_BY_ROLE: Record<Role, Area> = {
  client: "buyer",
  partner: "supplier",
}

/** httpOnly session token issued by the API. */
export const SESSION_COOKIE = "machina_session"
/** Role of the signed-in user; only used by proxy.ts to redirect early. */
export const ROLE_COOKIE = "machina_role"

export function isRole(value: unknown): value is Role {
  return value === "client" || value === "partner"
}

export function areaForRole(role: Role): Area {
  return AREA_BY_ROLE[role]
}

export function homePathForRole(role: Role): string {
  return `/${areaForRole(role)}`
}

/** Area a pathname belongs to, or null for public pages. */
export function areaForPath(pathname: string): Area | null {
  const first = pathname.split("/")[1]
  return (AREAS as readonly string[]).includes(first) ? (first as Area) : null
}

export function canAccessArea(role: Role, area: Area): boolean {
  return areaForRole(role) === area
}

/** Only allow same-site relative redirects, to avoid open redirects via ?next=. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return null
  }
  return next
}
