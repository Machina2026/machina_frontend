"use client"

import { ClipboardList, LayoutDashboard, LogOut, Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import { buttonVariants, Button } from "@/components/ui/button"
import { homePathForRole } from "@/lib/auth/roles"
import { api } from "@/lib/machina/api"
import { useDraft } from "@/lib/machina/draft"
import { stripDemo } from "@/lib/machina/format"
import { useMe, useResetSessionData } from "@/lib/machina/hooks"
import type { SessionRole } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

import { Container } from "./container"
import { Logo } from "./site-chrome"

const PUBLIC_NAV: [string, string][] = [
  ["/catalog", "Catalogue"],
  ["/assistant", "Describe your job"],
  ["/accessories", "Accessories"],
  ["/become-a-partner", "Become a partner"],
]

// Partners and admins see their working sections instead of the buyer-facing links.
const NAV_BY_ROLE: Partial<Record<SessionRole, [string, string][]>> = {
  partner: [
    ["/supplier", "Dashboard"],
    ["/supplier/equipment", "Equipment"],
    ["/supplier/quotes", "Requests and quotes"],
    ["/supplier/orders", "Orders"],
    ["/catalog", "Marketplace"],
  ],
  admin: [
    ["/admin", "Dashboard"],
    ["/admin/companies", "Companies"],
    ["/admin/users", "Users"],
    ["/admin/audit", "Activity log"],
    ["/catalog", "Catalogue"],
  ],
}

const ROLE_BADGE: Partial<Record<SessionRole, string>> = {
  partner: "Partner",
  admin: "Admin",
}

/** The most specific nav entry matching the pathname, so /supplier/orders doesn't also light up "Dashboard". */
function activeHref(nav: [string, string][], pathname: string) {
  return nav
    .map(([href]) => href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")
}

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const me = useMe().data
  const draft = useDraft()
  const resetData = useResetSessionData()
  const role = me?.user.role
  const roleNav = role ? NAV_BY_ROLE[role] : undefined
  const nav = roleNav ?? PUBLIC_NAV
  const current = activeHref(nav, pathname)
  // Role navs already start with "Dashboard".
  const areaHref = role && !roleNav ? homePathForRole(role) : null
  const badge = role ? ROLE_BADGE[role] : undefined

  async function signOut() {
    await api.post("/api/auth/logout").catch(() => undefined)
    await resetData()
    router.push("/")
    router.refresh()
  }

  return (
    <header className="no-print border-border sticky top-0 z-30 border-b bg-white">
      <Container className="flex h-16 items-center gap-3 sm:gap-8">
        <div className="flex shrink-0 items-center gap-2.5">
          <Logo />
          {badge && (
            <span className="bg-ink rounded-md px-2 py-0.5 text-[0.7rem] font-semibold text-white">
              {badge}
            </span>
          )}
        </div>
        <nav
          aria-label="Main"
          className={cn(
            "max-lg:shadow-lift flex-1 items-center gap-6 max-lg:absolute max-lg:inset-x-0 max-lg:top-16 max-lg:flex-col max-lg:items-stretch max-lg:gap-0 max-lg:border-b max-lg:bg-white max-lg:p-2",
            open ? "flex" : "max-lg:hidden lg:flex"
          )}
        >
          {nav.map(([href, label]) => {
            const active = href === current
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-foreground/70 hover:text-foreground relative py-2 text-[0.95rem] font-medium no-underline transition-colors hover:no-underline max-lg:rounded-lg max-lg:px-3",
                  active &&
                    "text-foreground lg:after:bg-primary max-lg:bg-primary-soft lg:after:absolute lg:after:inset-x-0 lg:after:-bottom-[12px] lg:after:h-[3px] lg:after:rounded-full"
                )}
              >
                {label}
              </Link>
            )
          })}
          {areaHref && (
            <Link
              href={areaHref}
              onClick={() => setOpen(false)}
              aria-current={pathname.startsWith(areaHref) ? "page" : undefined}
              className={cn(
                "text-foreground/70 hover:text-foreground relative inline-flex items-center gap-1.5 py-2 text-[0.95rem] font-medium no-underline transition-colors hover:no-underline max-lg:rounded-lg max-lg:px-3",
                pathname.startsWith(areaHref) &&
                  "text-foreground lg:after:bg-primary max-lg:bg-primary-soft lg:after:absolute lg:after:inset-x-0 lg:after:-bottom-[12px] lg:after:h-[3px] lg:after:rounded-full"
              )}
            >
              <LayoutDashboard aria-hidden className="size-4" />
              My area
            </Link>
          )}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {(!role || role === "client") && (
            <Link
              href="/request"
              className={buttonVariants({ size: "sm", className: "relative" })}
              title="Request draft"
            >
              <ClipboardList aria-hidden />
              <span className="sr-only sm:not-sr-only">Request</span>
              {draft.items.length > 0 && (
                <span className="bg-primary text-ink ring-background absolute -top-1.5 -right-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[0.7rem] font-bold ring-2">
                  {draft.items.length}
                </span>
              )}
            </Link>
          )}
          {me ? (
            <div className="flex items-center gap-2 pl-1">
              <span
                aria-hidden
                className="bg-ink text-primary inline-flex size-8 items-center justify-center rounded-full text-[0.75rem] font-bold"
              >
                {initials(me.user.name)}
              </span>
              <span className="hidden max-w-[180px] min-w-0 leading-tight md:block">
                <b className="block truncate text-[0.84rem] font-semibold">{me.user.name}</b>
                <span className="text-muted-foreground block truncate text-[0.74rem]">
                  {me.org ? stripDemo(me.org.name) : "Machina staff"}
                </span>
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={signOut}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut />
              </Button>
            </div>
          ) : (
            <Link
              href="/login"
              className={buttonVariants({ size: "sm", variant: "primary", className: "px-4" })}
            >
              Sign in
            </Link>
          )}
          <Button
            size="icon"
            className="lg:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </Container>
    </header>
  )
}
