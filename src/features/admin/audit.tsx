"use client"

import { useQuery } from "@tanstack/react-query"
import { History } from "lucide-react"

import { PageHead } from "@/components/app/bits"
import { QueryView } from "@/components/app/query-view"
import { EmptyState } from "@/components/states/empty-state"
import { Card } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { api, qs } from "@/lib/machina/api"
import type { AuditEntry, Paged } from "@/lib/machina/types"

import { AuditList, Pager, pageOf, useUrlFilters } from "./shared"

const TARGET_OPTIONS = [
  ["", "Everything"],
  ["company", "Companies"],
  ["user", "Users"],
  ["invitation", "Invitations"],
] as const

export function AdminAudit({ query }: { query: Record<string, string> }) {
  const setFilters = useUrlFilters("/admin/audit", query)
  const params = { targetType: query.targetType ?? "", page: pageOf(query), pageSize: 50 }
  const log = useQuery({
    queryKey: ["admin", "audit", params],
    queryFn: () => api.get<Paged<AuditEntry>>(`/api/admin/audit${qs(params)}`),
  })
  return (
    <>
      <PageHead title="Activity log">
        Registrations, approvals, suspensions, invitations and team changes, newest first.
      </PageHead>
      <Select
        aria-label="Show"
        className="mb-4 w-auto"
        options={TARGET_OPTIONS}
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
            <EmptyState icon={History} title="No activity yet." />
          )
        }
      </QueryView>
    </>
  )
}
