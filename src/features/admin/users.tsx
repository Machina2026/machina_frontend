"use client"

import { useQuery } from "@tanstack/react-query"
import { Users } from "lucide-react"
import Link from "next/link"

import { PageHead, Small, TableWrap } from "@/components/app/bits"
import { QueryView } from "@/components/app/query-view"
import { StatusBadge } from "@/components/app/status-badge"
import { EmptyState } from "@/components/states/empty-state"
import { Select } from "@/components/ui/select"
import { api, qs } from "@/lib/machina/api"
import { localDateTime } from "@/lib/machina/format"
import { COMPANY_ROLE, ROLE } from "@/lib/machina/labels"
import type { AdminUserListItem, Paged } from "@/lib/machina/types"

import { UserStatusButton } from "./companies"
import { Pager, pageOf, SearchBox, useUrlFilters } from "./shared"

const ROLE_OPTIONS = [
  ["", "All roles"],
  ["client", "Customers"],
  ["partner", "Rental companies"],
  ["admin", "Machina admins"],
] as const

const STATUS_OPTIONS = [
  ["", "Any status"],
  ["active", "Active"],
  ["suspended", "Suspended"],
  ["removed", "Removed from their team"],
] as const

export function AdminUsers({ query }: { query: Record<string, string> }) {
  const setFilters = useUrlFilters("/admin/users", query)
  const params = {
    role: query.role ?? "",
    status: query.status ?? "",
    q: query.q ?? "",
    page: pageOf(query),
  }
  const list = useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => api.get<Paged<AdminUserListItem>>(`/api/admin/users${qs(params)}`),
  })

  return (
    <>
      <PageHead title="Users">
        Everyone with a Machina account. Suspending a user signs them out at once.
      </PageHead>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          aria-label="Role"
          className="w-auto"
          options={ROLE_OPTIONS}
          value={params.role}
          onChange={(e) => setFilters({ role: e.target.value })}
        />
        <Select
          aria-label="Status"
          className="w-auto"
          options={STATUS_OPTIONS}
          value={params.status}
          onChange={(e) => setFilters({ status: e.target.value })}
        />
        <SearchBox
          key={params.q}
          value={params.q}
          placeholder="Search by name, email or company"
          onSearch={(q) => setFilters({ q })}
        />
      </div>
      <QueryView query={list}>
        {(r) =>
          r.items.length ? (
            <>
              <TableWrap>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last sign-in</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {r.items.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <b>{u.name}</b>
                        <Small>{u.email}</Small>
                      </td>
                      <td>
                        {u.company ? (
                          <Link href={`/admin/companies/${u.company.id}`}>{u.company.name}</Link>
                        ) : (
                          "Machina"
                        )}
                      </td>
                      <td>
                        {ROLE[u.role]}
                        {u.companyRole && <Small>{COMPANY_ROLE[u.companyRole]}</Small>}
                      </td>
                      <td>
                        <StatusBadge kind="user" status={u.status} />
                      </td>
                      <td className="whitespace-nowrap">
                        {u.lastLoginAt ? localDateTime(u.lastLoginAt) : "Never"}
                      </td>
                      <td className="text-right">
                        <UserStatusButton user={u} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              <Pager {...r} onPage={(page) => setFilters({ page: String(page) })} />
            </>
          ) : (
            <EmptyState icon={Users} title="No users found." />
          )
        }
      </QueryView>
    </>
  )
}
