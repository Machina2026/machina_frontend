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
import { localDate } from "@/lib/machina/format"
import { useMe } from "@/lib/machina/hooks"
import { COMPANY_TYPE } from "@/lib/machina/labels"
import type { AdminCompanyListItem, AuditEntry, Paged } from "@/lib/machina/types"

import { AuditList } from "./shared"

const PENDING = "/admin/companies?status=pending"

export function AdminOverview() {
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
              org="Machina admin"
              subtitle={
                waiting
                  ? `${waiting} compan${waiting === 1 ? "y is" : "ies are"} waiting for your approval.`
                  : "No companies are waiting for approval."
              }
              actions={
                <Link href={PENDING} className={buttonVariants({ variant: "primary" })}>
                  Review companies
                </Link>
              }
            />
            <StatGrid>
              <Stat n={waiting} label="Awaiting approval" href={PENDING} icon={Clock} hot />
              <Stat
                n={s.companies.partner.approved}
                label="Approved rental companies"
                href="/admin/companies?type=partner&status=approved"
                icon={Warehouse}
              />
              <Stat
                n={s.companies.client.approved}
                label="Customers"
                href="/admin/companies?type=client&status=approved"
                icon={HardHat}
              />
              <Stat
                n={s.users.client.active + s.users.partner.active}
                label="Active company users"
                href="/admin/users?status=active"
                icon={Users}
              />
              <Stat
                n={suspended}
                label="Suspended companies and users"
                href="/admin/companies?status=suspended"
                icon={UserX}
              />
              <Stat
                n={s.companies.partner.rejected + s.companies.client.rejected}
                label="Rejected companies"
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
                        See all {waiting}
                      </Link>
                    )
                  }
                >
                  Awaiting approval
                </PanelTitle>
                <QueryView query={pending} rows={3}>
                  {({ items }) =>
                    items.length ? (
                      <div className="space-y-2">
                        {items.map((c) => (
                          <Link
                            key={c.id}
                            href={`/admin/companies/${c.id}`}
                            className="group text-foreground border-border/70 hover:border-primary/40 hover:bg-primary-soft/40 flex items-center gap-3 rounded-xl border px-3.5 py-3 no-underline transition-colors hover:no-underline"
                          >
                            <span className="min-w-0 flex-1">
                              <b className="block truncate text-[0.93rem]">{c.name}</b>
                              <Small>
                                {COMPANY_TYPE[c.type]} · {c.city} ({c.province}) · registered{" "}
                                {localDate(c.createdAt)}
                              </Small>
                            </span>
                            <ChevronRight
                              aria-hidden
                              className="text-faint group-hover:text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                            />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="bg-ok-soft/60 text-ok m-0 rounded-xl px-4 py-3 text-sm">
                        All clear: nothing to review.
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
                      Full log
                    </Link>
                  }
                >
                  Recent activity
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
