"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Building2,
  ChevronRight,
  Clock,
  History,
  HardHat,
  UserX,
  Users,
  Warehouse,
} from "lucide-react"
import Link from "next/link"

import { Small } from "@/components/app/bits"
import { PanelTitle, Stat, StatGrid, WelcomeBanner } from "@/components/app/dashboard"
import { QueryView } from "@/components/app/query-view"
import { useAdminStats } from "@/components/layout/dash-shell"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api, qs } from "@/lib/machina/api"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages, plural } from "@/i18n/messages"
import { useMe } from "@/lib/machina/hooks"
import { useLabels } from "@/lib/machina/labels"
import type { AdminCompanyListItem, AuditEntry, Paged } from "@/lib/machina/types"

import { AuditList } from "./shared"

const PENDING = "/admin/companies?status=pending"

const M = defineMessages({
  en: {
    org: "Machina admin",
    waiting: (n: number) =>
      `${n} ${plural(n, "company is", "companies are")} waiting for your approval.`,
    noneWaiting: "No companies are waiting for approval.",
    review: "Review companies",
    awaitingApproval: "Awaiting approval",
    approvedPartners: "Approved rental companies",
    customers: "Customers",
    activeUsers: "Active company users",
    suspended: "Suspended companies and users",
    rejected: "Rejected companies",
    seeAll: (n: number) => `See all ${n}`,
    registered: (d: string) => `registered ${d}`,
    allClear: "All clear: nothing to review.",
    fullLog: "Full log",
    recentActivity: "Recent activity",
  },
  it: {
    org: "Amministrazione Machina",
    waiting: (n: number) =>
      `${n} ${plural(n, "azienda attende", "aziende attendono")} la tua approvazione.`,
    noneWaiting: "Nessuna azienda in attesa di approvazione.",
    review: "Valuta le aziende",
    awaitingApproval: "In attesa di approvazione",
    approvedPartners: "Noleggiatori approvati",
    customers: "Clienti",
    activeUsers: "Utenti aziendali attivi",
    suspended: "Aziende e utenti sospesi",
    rejected: "Aziende rifiutate",
    seeAll: (n: number) => `Vedi tutte (${n})`,
    registered: (d: string) => `registrata il ${d}`,
    allClear: "Tutto a posto: niente da valutare.",
    fullLog: "Registro completo",
    recentActivity: "Attività recenti",
  },
})

export function AdminOverview() {
  const t = useMessages(M)
  const L = useLabels()
  const { localDate } = useFormat()
  const me = useMe().data
  const stats = useAdminStats()
  const pending = useQuery({
    queryKey: ["admin", "companies", { status: "pending", pageSize: 5 }],
    queryFn: () =>
      api.get<Paged<AdminCompanyListItem>>(
        `/api/admin/companies${qs({ status: "pending", pageSize: 5 })}`
      ),
  })
  const activity = useQuery({
    queryKey: ["admin", "audit", { pageSize: 8 }],
    queryFn: () => api.get<Paged<AuditEntry>>(`/api/admin/audit${qs({ pageSize: 8 })}`),
  })

  return (
    <QueryView query={stats}>
      {(s) => {
        const waiting = s.companies.partner.pending + s.companies.client.pending
        const suspended =
          s.companies.partner.suspended +
          s.companies.client.suspended +
          s.users.client.suspended +
          s.users.partner.suspended +
          s.users.admin.suspended
        return (
          <>
            <WelcomeBanner
              name={me?.user.name}
              org={t.org}
              subtitle={waiting ? t.waiting(waiting) : t.noneWaiting}
              actions={
                <Link href={PENDING} className={buttonVariants({ variant: "primary" })}>
                  {t.review}
                </Link>
              }
            />
            <StatGrid>
              <Stat n={waiting} label={t.awaitingApproval} href={PENDING} icon={Clock} hot />
              <Stat
                n={s.companies.partner.approved}
                label={t.approvedPartners}
                href="/admin/companies?type=partner&status=approved"
                icon={Warehouse}
              />
              <Stat
                n={s.companies.client.approved}
                label={t.customers}
                href="/admin/companies?type=client&status=approved"
                icon={HardHat}
              />
              <Stat
                n={s.users.client.active + s.users.partner.active}
                label={t.activeUsers}
                href="/admin/users?status=active"
                icon={Users}
              />
              <Stat
                n={suspended}
                label={t.suspended}
                href="/admin/companies?status=suspended"
                icon={UserX}
              />
              <Stat
                n={s.companies.partner.rejected + s.companies.client.rejected}
                label={t.rejected}
                href="/admin/companies?status=rejected"
                icon={Building2}
              />
            </StatGrid>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <PanelTitle
                  icon={Clock}
                  aside={
                    waiting > 5 && (
                      <Link href={PENDING} className="text-sm">
                        {t.seeAll(waiting)}
                      </Link>
                    )
                  }
                >
                  {t.awaitingApproval}
                </PanelTitle>
                <QueryView query={pending} rows={3}>
                  {({ items }) =>
                    items.length ? (
                      <div className="space-y-2">
                        {items.map((c) => (
                          <Link
                            key={c.id}
                            href={`/admin/companies/${c.id}`}
                            className="group text-foreground border-border hover:border-primary/40 hover:bg-primary-soft/40 flex items-center gap-3 rounded-xl border px-3.5 py-3 no-underline transition-colors hover:no-underline"
                          >
                            <span className="min-w-0 flex-1">
                              <b className="block truncate text-[0.93rem]">{c.name}</b>
                              <Small>
                                {L.COMPANY_TYPE[c.type]} · {c.city} ({c.province}) ·{" "}
                                {t.registered(localDate(c.createdAt))}
                              </Small>
                            </span>
                            <ChevronRight
                              aria-hidden
                              className="text-faint group-hover:text-brand size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                            />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="bg-ok-soft/60 text-ok m-0 rounded-xl px-4 py-3 text-sm">
                        {t.allClear}
                      </p>
                    )
                  }
                </QueryView>
              </Card>
              <Card>
                <PanelTitle
                  icon={History}
                  aside={
                    <Link href="/admin/audit" className="text-sm">
                      {t.fullLog}
                    </Link>
                  }
                >
                  {t.recentActivity}
                </PanelTitle>
                <QueryView query={activity} rows={4}>
                  {({ items }) => <AuditList entries={items} />}
                </QueryView>
              </Card>
            </div>
          </>
        )
      }}
    </QueryView>
  )
}
