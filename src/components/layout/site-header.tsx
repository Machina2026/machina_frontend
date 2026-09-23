"use client"

import { Menu } from "lucide-react"
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
    <header className="no-print bg-card sticky top-0 z-30 border-b">
      <div className="mx-auto flex h-[60px] max-w-[1240px] items-center gap-5 px-4">
        <Logo />
        <nav
          aria-label="Main"
          className={cn(
            "max-lg:bg-card flex-1 gap-1 max-lg:absolute max-lg:inset-x-0 max-lg:top-[60px] max-lg:flex-col max-lg:border-b max-lg:p-2",
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
                  "text-foreground hover:bg-muted hover:text-primary-hover rounded-md px-2.5 py-2 text-[0.93rem] no-underline hover:no-underline",
                  active && "bg-muted text-primary-hover"
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {role !== "partner" && (
            <Link href="/request" className={buttonVariants({ size: "sm" })} title="Request draft">
              Request
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
