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
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { useLabels } from "@/lib/machina/labels"
import type { AdminUserListItem, Paged } from "@/lib/machina/types"

import { UserStatusButton } from "./companies"
import { Pager, pageOf, SearchBox, useUrlFilters } from "./shared"

const M = defineMessages({
  en: {
    title: "Users",
    intro: "Everyone with a Machina account. Suspending a user signs them out at once.",
    roles: {
      "": "All roles",
      client: "Customers",
      partner: "Rental companies",
      admin: "Machina admins",
    },
    statuses: {
      "": "Any status",
      active: "Active",
      suspended: "Suspended",
      removed: "Removed from their team",
    },
    role: "Role",
    status: "Status",
    searchPh: "Search by name, email or company",
    name: "Name",
    company: "Company",
    lastSignIn: "Last sign-in",
    never: "Never",
    noUsers: "No users found.",
  },
  it: {
    title: "Utenti",
    intro: "Tutti coloro che hanno un account Machina. Sospendere un utente lo disconnette subito.",
    roles: {
      "": "Tutti i ruoli",
      client: "Clienti",
      partner: "Noleggiatori",
      admin: "Amministratori Machina",
    },
    statuses: {
      "": "Qualsiasi stato",
      active: "Attivi",
      suspended: "Sospesi",
      removed: "Rimossi dal proprio team",
    },
    role: "Ruolo",
    status: "Stato",
    searchPh: "Cerca per nome, email o azienda",
    name: "Nome",
    company: "Azienda",
    lastSignIn: "Ultimo accesso",
    never: "Mai",
    noUsers: "Nessun utente trovato.",
  },
})

const ROLES = ["", "client", "partner", "admin"] as const
const STATUSES = ["", "active", "suspended", "removed"] as const

export function AdminUsers({ query }: { query: Record<string, string> }) {
  const t = useMessages(M)
  const L = useLabels()
  const { localDateTime } = useFormat()
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
      <PageHead title={t.title}>{t.intro}</PageHead>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          aria-label={t.role}
          className="w-auto"
          options={ROLES.map((x) => [x, t.roles[x]] as const)}
          value={params.role}
          onChange={(e) => setFilters({ role: e.target.value })}
        />
        <Select
          aria-label={t.status}
          className="w-auto"
          options={STATUSES.map((x) => [x, t.statuses[x]] as const)}
          value={params.status}
          onChange={(e) => setFilters({ status: e.target.value })}
        />
        <SearchBox
          key={params.q}
          value={params.q}
          placeholder={t.searchPh}
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
                    <th>{t.name}</th>
                    <th>{t.company}</th>
                    <th>{t.role}</th>
                    <th>{t.status}</th>
                    <th>{t.lastSignIn}</th>
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
                        {L.ROLE[u.role]}
                        {u.companyRole && <Small>{L.COMPANY_ROLE[u.companyRole]}</Small>}
                      </td>
                      <td>
                        <StatusBadge kind="user" status={u.status} />
                      </td>
                      <td className="whitespace-nowrap">
                        {u.lastLoginAt ? localDateTime(u.lastLoginAt) : t.never}
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
            <EmptyState icon={Users} title={t.noUsers} />
          )
        }
      </QueryView>
    </>
  )
}
