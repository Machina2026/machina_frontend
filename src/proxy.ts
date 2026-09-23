import { NextResponse, type NextRequest } from "next/server"

import { areaForPath, canAccessArea, homePathForRole, isRole, ROLE_COOKIE } from "@/lib/auth/roles"

// Route guard for the role areas. This is a UX redirect, not a security
// boundary: the API still checks the session and data ownership on every call.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const area = areaForPath(pathname)
  if (!area) return NextResponse.next()

  const role = request.cookies.get(ROLE_COOKIE)?.value
  if (!isRole(role)) {
    const login = new URL("/login", request.url)
    login.searchParams.set("next", pathname + search)
    return NextResponse.redirect(login)
  }
  if (!canAccessArea(role, area)) {
    return NextResponse.redirect(new URL(homePathForRole(role), request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/buyer/:path*", "/supplier/:path*"],
}
