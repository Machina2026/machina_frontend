"use client"

import { ClipboardList, Menu } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import { buttonVariants, Button } from "@/components/ui/button"
import { homePathForRole } from "@/lib/auth/roles"
import { api } from "@/lib/machina/api"
import { useDraft } from "@/lib/machina/draft"
import { useMe, useResetSessionData } from "@/lib/machina/hooks"
import { cn } from "@/lib/utils"

import { Logo } from "./site-chrome"

const NAV: [string, string][] = [
  ["/catalog", "Catalogue"],
  ["/assistant", "Describe your job"],
  ["/accessories", "Accessories"],
  ["/become-a-partner", "Become a partner"],
]

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const me = useMe().data
  const draft = useDraft()
  const resetData = useResetSessionData()
  const role = me?.user.role
  const nav = role ? [...NAV, [homePathForRole(role), "My area"] as [string, string]] : NAV

  async function signOut() {
    await api.post("/api/auth/logout").catch(() => undefined)
    await resetData()
    router.push("/")
    router.refresh()
  }

  return (
    <header className="no-print border-border/80 sticky top-0 z-30 border-b bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center gap-3 px-4 sm:gap-8">
        <Logo />
        <nav
          aria-label="Main"
          className={cn(
            "max-lg:shadow-soft flex-1 gap-1 max-lg:absolute max-lg:inset-x-0 max-lg:top-[68px] max-lg:flex-col max-lg:border-b max-lg:bg-white max-lg:p-3 lg:gap-6",
            open ? "flex" : "max-lg:hidden lg:flex"
          )}
        >
          {nav.map(([href, label]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-foreground/80 hover:text-foreground max-lg:hover:bg-muted lg:after:bg-primary relative py-2 text-[0.95rem] no-underline transition-colors hover:no-underline max-lg:rounded-lg max-lg:px-3 lg:after:absolute lg:after:inset-x-0 lg:after:-bottom-[14px] lg:after:h-0.5 lg:after:scale-x-0 lg:after:transition-transform lg:hover:after:scale-x-100",
                  active && "text-foreground max-lg:bg-muted font-medium lg:after:scale-x-100"
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {role !== "partner" && (
            <Link href="/request" className={buttonVariants({ size: "sm" })} title="Request draft">
              <ClipboardList aria-hidden className="sm:hidden" />
              <span className="sr-only sm:not-sr-only">Request</span>
              {draft.items.length > 0 && (
                <span className="bg-primary rounded-full px-1.5 text-[0.72rem] font-bold text-white">
                  {draft.items.length}
                </span>
              )}
            </Link>
          )}
          {me ? (
            <>
              <span
                className="text-muted-foreground hidden max-w-[220px] truncate text-[0.85rem] md:inline"
                title={me.org.name}
              >
                {me.user.name} · {me.org.name}
              </span>
              <Button size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm", variant: "primary" })}>
              Sign in
            </Link>
          )}
          <Button
            size="sm"
            className="lg:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Menu />
          </Button>
        </div>
      </div>
    </header>
  )
}
