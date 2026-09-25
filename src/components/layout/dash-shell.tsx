"use client"

import { useQuery } from "@tanstack/react-query"
import {
  BadgePercent,
  Building2,
  ClipboardCheck,
  FileText,
  FileUp,
  GitPullRequestArrow,
  LayoutGrid,
  type LucideIcon,
  MessageSquareQuote,
  Package,
  Tags,
  Truck,
  UserRound,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import type { Area } from "@/lib/auth/roles"
import { api } from "@/lib/machina/api"
import { stripDemo } from "@/lib/machina/format"
import { useMe } from "@/lib/machina/hooks"
import type { ClientSummary, PartnerSummary } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

export const buyerSummaryKey = ["buyer", "summary"] as const
export const supplierSummaryKey = ["supplier", "summary"] as const

export function useBuyerSummary() {
  return useQuery({
    queryKey: buyerSummaryKey,
    queryFn: () => api.get<ClientSummary>("/api/client/summary"),
  })
}
export function useSupplierSummary() {
  return useQuery({
    queryKey: supplierSummaryKey,
    queryFn: () => api.get<PartnerSummary>("/api/partner/summary"),
  })
}

type MenuItem = { href: string; label: string; icon: LucideIcon; count?: number }

function useBuyerMenu(): MenuItem[] {
  const c = useBuyerSummary().data?.counts
  return [
    { href: "/buyer", label: "Overview", icon: LayoutGrid },
    {
      href: "/buyer/requests",
      label: "Requests and quotes",
      icon: MessageSquareQuote,
      count: c?.quotesToEvaluate,
    },
    { href: "/buyer/orders", label: "Orders", icon: Package },
    {
      href: "/buyer/changes",
      label: "Changes to approve",
      icon: ClipboardCheck,
      count: c ? c.changesToApprove + c.chargesToVerify : undefined,
    },
    { href: "/buyer/documents", label: "Documents and invoices", icon: FileText },
    { href: "/buyer/company", label: "Company and sites", icon: Building2 },
  ]
}

function useSupplierMenu(): MenuItem[] {
  const c = useSupplierSummary().data?.counts
  return [
    { href: "/supplier", label: "Overview", icon: LayoutGrid },
    { href: "/supplier/equipment", label: "Equipment catalogue", icon: Truck },
    { href: "/supplier/pricing", label: "Prices, accessories and terms", icon: Tags },
    {
      href: "/supplier/quotes",
      label: "Requests and quotes",
      icon: MessageSquareQuote,
      count: c?.newRequests,
    },
    { href: "/supplier/orders", label: "Orders", icon: Package },
    {
      href: "/supplier/changes",
      label: "Rental changes",
      icon: GitPullRequestArrow,
      count: c ? c.changesOpen + c.chargesContested : undefined,
    },
    { href: "/supplier/documents", label: "Documents and draft invoices", icon: FileUp },
    { href: "/supplier/commissions", label: "Commissions and plan", icon: BadgePercent },
    { href: "/supplier/profile", label: "Company profile", icon: UserRound },
  ]
}

function Menu({ items, area }: { items: MenuItem[]; area: Area }) {
  const pathname = usePathname()
  const root = `/${area}`
  // The most specific match wins, so /supplier/equipment/new highlights "Equipment catalogue" only.
  const active = items
    .filter((i) =>
      i.href === root ? pathname === root : pathname === i.href || pathname.startsWith(`${i.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href
  return (
    <nav aria-label="Area" className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ href, label, icon: Icon, count }) => {
        const on = href === active
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "text-ink-foreground/70 group flex shrink-0 items-center gap-3 rounded-xl px-2.5 py-2 text-[0.92rem] no-underline transition-colors hover:bg-white/[0.06] hover:text-white hover:no-underline",
              on &&
                "from-primary/90 bg-gradient-to-r to-[#d9742f]/70 font-medium text-white shadow-[0_8px_20px_-10px_rgb(236_116_48/0.8)] hover:bg-transparent"
            )}
          >
            <span
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] transition-colors group-hover:bg-white/10",
                on && "bg-white/20 group-hover:bg-white/20"
              )}
            >
              <Icon aria-hidden className="size-[17px]" />
            </span>
            <span className="flex-1 leading-snug">{label}</span>
            {!!count && (
              <span
                className={cn(
                  "bg-sun text-ink min-w-5 rounded-full px-1.5 text-center text-[0.72rem] font-bold",
                  on && "text-primary-hover bg-white"
                )}
              >
                {count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function BuyerNav() {
  return <Menu items={useBuyerMenu()} area="buyer" />
}
function SupplierNav() {
  return <Menu items={useSupplierMenu()} area="supplier" />
}

/** Dashboard layout: side menu with pending counts, then the page. */
export function DashShell({ area, children }: { area: Area; children: React.ReactNode }) {
  const me = useMe().data
  return (
    <div className="grid items-start gap-6 md:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
      <aside className="no-print bg-ink text-ink-foreground shadow-lift relative overflow-hidden rounded-3xl p-3 md:sticky md:top-[96px]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(80%_100%_at_0%_0%,rgb(236_116_48/0.28),transparent_70%)]"
        />
        <div className="relative mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <span
            aria-hidden
            className="from-primary inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br to-[#f0a052] text-[0.85rem] font-bold text-white"
          >
            {(me?.org.name ?? "")
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")}
          </span>
          <span className="min-w-0">
            <span className="text-sun block text-[0.64rem] font-semibold tracking-[0.16em] uppercase">
              {area === "buyer" ? "Customer area" : "Rental company"}
            </span>
            <b className="mt-0.5 block truncate text-[0.95rem] leading-snug font-semibold text-white">
              {me ? stripDemo(me.org.name) : " "}
            </b>
          </span>
        </div>
        <div className="relative">{area === "buyer" ? <BuyerNav /> : <SupplierNav />}</div>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  )
}
