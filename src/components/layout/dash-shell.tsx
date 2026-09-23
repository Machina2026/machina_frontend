"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { usePathname } from "next/navigation"

import type { Area } from "@/lib/auth/roles"
import { api } from "@/lib/machina/api"
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

type MenuItem = { href: string; label: string; count?: number }

function useBuyerMenu(): MenuItem[] {
  const c = useBuyerSummary().data?.counts
  return [
    { href: "/buyer", label: "Overview" },
    { href: "/buyer/requests", label: "Requests and quotes", count: c?.quotesToEvaluate },
    { href: "/buyer/orders", label: "Orders" },
    {
      href: "/buyer/changes",
      label: "Changes to approve",
      count: c ? c.changesToApprove + c.chargesToVerify : undefined,
    },
    { href: "/buyer/documents", label: "Documents and invoices" },
    { href: "/buyer/company", label: "Company and sites" },
  ]
}

function useSupplierMenu(): MenuItem[] {
  const c = useSupplierSummary().data?.counts
  return [
    { href: "/supplier", label: "Overview" },
    { href: "/supplier/equipment", label: "Equipment catalogue" },
    { href: "/supplier/pricing", label: "Prices, accessories and terms" },
    { href: "/supplier/quotes", label: "Requests and quotes", count: c?.newRequests },
    { href: "/supplier/orders", label: "Orders" },
    {
      href: "/supplier/changes",
      label: "Rental changes",
      count: c ? c.changesOpen + c.chargesContested : undefined,
    },
    { href: "/supplier/documents", label: "Documents and draft invoices" },
    { href: "/supplier/commissions", label: "Commissions and plan" },
    { href: "/supplier/profile", label: "Company profile" },
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
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.href === active ? "page" : undefined}
          className={cn(
            "text-foreground hover:bg-muted flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-[0.92rem] no-underline hover:no-underline",
            i.href === active && "bg-primary-soft text-primary-hover font-semibold"
          )}
        >
          {i.label}
          {!!i.count && (
            <span className="bg-primary rounded-full px-1.5 text-[0.72rem] font-bold text-white">
              {i.count}
            </span>
          )}
        </Link>
      ))}
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
    <div className="grid items-start gap-5 md:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="no-print bg-card rounded-lg border p-2.5 md:sticky md:top-[76px]">
        <div className="mb-2 border-b px-2 pb-2.5">
          <span className="text-muted-foreground block text-[0.8rem]">
            {area === "buyer" ? "Customer area" : "Rental company area"}
          </span>
          <b className="text-[0.95rem]">{me?.org.name ?? " "}</b>
        </div>
        {area === "buyer" ? <BuyerNav /> : <SupplierNav />}
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  )
}
