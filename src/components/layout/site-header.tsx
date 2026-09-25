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
import { cn } from "@/lib/utils"

import { Logo } from "./site-chrome"

const NAV: [string, string][] = [
  ["/catalog", "Catalogue"],
  ["/assistant", "Describe your job"],
  ["/accessories", "Accessories"],
  ["/become-a-partner", "Become a partner"],
]

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
  const areaHref = role ? homePathForRole(role) : null

  async function signOut() {
    await api.post("/api/auth/logout").catch(() => undefined)
    await resetData()
    router.push("/")
    router.refresh()
  }

  return (
    <header className="no-print border-border/70 sticky top-0 z-30 border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-3 px-4 sm:gap-6">
        <Logo />
        <nav
          aria-label="Main"
          className={cn(
            "max-lg:shadow-lift flex-1 items-center gap-1 max-lg:absolute max-lg:inset-x-0 max-lg:top-[72px] max-lg:flex-col max-lg:items-stretch max-lg:border-b max-lg:bg-white max-lg:p-3",
            open ? "flex" : "max-lg:hidden lg:flex"
          )}
        >
          {NAV.map(([href, label]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-foreground/75 hover:text-foreground hover:bg-muted rounded-full px-3.5 py-2 text-[0.94rem] no-underline transition-colors hover:no-underline",
                  active && "bg-primary-soft text-primary-hover hover:bg-primary-soft font-medium"
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
                "text-foreground/75 hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.94rem] no-underline transition-colors hover:no-underline",
                pathname.startsWith(areaHref) &&
                  "bg-ink hover:bg-ink-2 font-medium text-white hover:text-white"
              )}
            >
              <LayoutDashboard aria-hidden className="size-4" />
              My area
            </Link>
          )}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {role !== "partner" && (
            <Link
              href="/request"
              className={buttonVariants({ size: "sm", className: "relative rounded-full" })}
              title="Request draft"
            >
              <ClipboardList aria-hidden />
              <span className="sr-only sm:not-sr-only">Request</span>
              {draft.items.length > 0 && (
                <span className="bg-primary ring-background absolute -top-1.5 -right-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-[0.7rem] font-bold text-white ring-2">
                  {draft.items.length}
                </span>
              )}
            </Link>
          )}
          {me ? (
            <div className="border-border/80 flex items-center gap-2 rounded-full border bg-white py-1 pr-1 pl-1 shadow-[0_1px_2px_rgb(20_18_14/0.05)]">
              <span
                aria-hidden
                className="from-primary inline-flex size-8 items-center justify-center rounded-full bg-gradient-to-br to-[#e2883e] text-[0.75rem] font-bold text-white"
              >
                {initials(me.user.name)}
              </span>
              <span className="hidden max-w-[180px] min-w-0 leading-tight md:block">
                <b className="block truncate text-[0.82rem] font-semibold">{me.user.name}</b>
                <span className="text-muted-foreground block truncate text-[0.72rem]">
                  {stripDemo(me.org.name)}
                </span>
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 rounded-full"
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
              className={buttonVariants({
                size: "sm",
                variant: "primary",
                className: "rounded-full px-4",
              })}
            >
              Sign in
            </Link>
          )}
          <Button
            size="icon"
            className="rounded-full lg:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
    </header>
  )
}
