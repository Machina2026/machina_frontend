"use client"

import { useQuery } from "@tanstack/react-query"
import { History } from "lucide-react"

import { PageHead } from "@/components/app/bits"
import { QueryView } from "@/components/app/query-view"
import { EmptyState } from "@/components/states/empty-state"
import { Card } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { api, qs } from "@/lib/machina/api"
import type { AuditEntry, Paged } from "@/lib/machina/types"

import { AuditList, Pager, pageOf, useUrlFilters } from "./shared"

const M = defineMessages({
  en: {
    title: "Activity log",
    intro:
      "Registrations, approvals, suspensions, invitations, team and machine changes, newest first.",
    show: "Show",
    targets: {
      "": "Everything",
      company: "Companies",
      user: "Users",
      invitation: "Invitations",
      offer: "Machines",
    },
    noActivity: "No activity yet.",
  },
  it: {
    title: "Registro attività",
    intro:
      "Registrazioni, approvazioni, sospensioni, inviti, modifiche ai team e alle macchine, dai più recenti.",
    show: "Mostra",
    targets: {
      "": "Tutto",
      company: "Aziende",
      user: "Utenti",
      invitation: "Inviti",
      offer: "Macchine",
    },
    noActivity: "Ancora nessuna attività.",
  },
})

const TARGETS = ["", "company", "user", "invitation", "offer"] as const

export function AdminAudit({ query }: { query: Record<string, string> }) {
  const t = useMessages(M)
  const setFilters = useUrlFilters("/admin/audit", query)
  const params = { targetType: query.targetType ?? "", page: pageOf(query), pageSize: 50 }
  const log = useQuery({
    queryKey: ["admin", "audit", params],
    queryFn: () => api.get<Paged<AuditEntry>>(`/api/admin/audit${qs(params)}`),
  })
  return (
    <>
      <PageHead title={t.title}>{t.intro}</PageHead>
      <Select
        aria-label={t.show}
        className="mb-4 w-auto"
        options={TARGETS.map((x) => [x, t.targets[x]] as const)}
        value={params.targetType}
        onChange={(e) => setFilters({ targetType: e.target.value })}
      />
      <QueryView query={log}>
        {(r) =>
          r.items.length ? (
            <>
              <Card>
                <AuditList entries={r.items} />
              </Card>
              <Pager {...r} onPage={(page) => setFilters({ page: String(page) })} />
            </>
          ) : (
            <EmptyState icon={History} title={t.noActivity} />
          )
        }
      </QueryView>
    </>
  )
}
