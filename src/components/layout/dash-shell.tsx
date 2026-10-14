"use client"

import { useQuery } from "@tanstack/react-query"
import {
  BadgePercent,
  Building2,
  ClipboardCheck,
  FileText,
  FileUp,
  GitPullRequestArrow,
  History,
  LayoutGrid,
  type LucideIcon,
  MessageSquareQuote,
  Package,
  ShieldCheck,
  Tags,
  Truck,
  UserRound,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import type { Area } from "@/lib/auth/roles"
import { api } from "@/lib/machina/api"
import { stripDemo } from "@/lib/machina/format"
import { useMe } from "@/lib/machina/hooks"
import type { AdminStats, ClientSummary, PartnerSummary } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

import { Container } from "./container"

export const buyerSummaryKey = ["buyer", "summary"] as const
export const supplierSummaryKey = ["supplier", "summary"] as const
export const adminStatsKey = ["admin", "stats"] as const

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

export function useAdminStats() {
  return useQuery({
    queryKey: adminStatsKey,
    queryFn: () => api.get<AdminStats>("/api/admin/stats"),
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

function useAdminMenu(): MenuItem[] {
  const c = useAdminStats().data?.companies
  return [
    { href: "/admin", label: "Overview", icon: LayoutGrid },
    {
      href: "/admin/companies",
      label: "Companies",
      icon: Building2,
      count: c ? c.partner.pending + c.client.pending : undefined,
    },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/team", label: "Admins", icon: ShieldCheck },
    { href: "/admin/audit", label: "Activity log", icon: History },
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
              "text-muted-foreground hover:bg-secondary hover:text-foreground relative flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-[0.93rem] font-medium no-underline transition-colors hover:no-underline",
              on &&
                "bg-primary-soft text-foreground hover:bg-primary-soft md:before:bg-primary md:before:absolute md:before:inset-y-2 md:before:-left-3 md:before:w-1 md:before:rounded-r-full"
            )}
          >
            <Icon aria-hidden className={cn("size-[18px] shrink-0", on && "text-ink")} />
            <span className="flex-1 leading-snug">{label}</span>
            {!!count && (
              <span className="bg-ink text-primary min-w-5 rounded-full px-1.5 text-center text-[0.72rem] font-bold">
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
function AdminNav() {
  return <Menu items={useAdminMenu()} area="admin" />
}

const AREA_LABEL: Record<Area, string> = {
  buyer: "Customer area",
  supplier: "Rental company",
  admin: "Machina admin",
}

/** Dashboard layout: side menu with pending counts, then the page. */
export function DashShell({ area, children }: { area: Area; children: React.ReactNode }) {
  const me = useMe().data
  return (
    <Container className="grid items-start gap-6 pt-8 pb-24 md:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
      <aside className="no-print border-border bg-card rounded-xl border p-3 md:sticky md:top-[88px]">
        <div className="border-border mb-3 flex items-center gap-3 border-b px-1 pt-1 pb-4">
          <span
            aria-hidden
            className="bg-ink text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-[0.85rem] font-bold"
          >
            {(me?.org?.name ?? me?.user.name ?? "")
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")}
          </span>
          <span className="min-w-0">
            <span className="text-muted-foreground block text-[0.78rem] font-medium">
              {AREA_LABEL[area]}
            </span>
            <b className="block truncate text-[0.95rem] leading-snug font-semibold">
              {me?.org ? stripDemo(me.org.name) : (me?.user.name ?? " ")}
            </b>
          </span>
        </div>
        {area === "buyer" ? <BuyerNav /> : area === "supplier" ? <SupplierNav /> : <AdminNav />}
      </aside>
      <section className="min-w-0">{children}</section>
    </Container>
  )
}
