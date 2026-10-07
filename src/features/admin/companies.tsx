"use client"

import { useQuery } from "@tanstack/react-query"
import { Building2, History, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Crumbs, KV, PageHead, Small, TableWrap } from "@/components/app/bits"
import { useConfirm } from "@/components/app/confirm"
import { PanelTitle } from "@/components/app/dashboard"
import { QueryView } from "@/components/app/query-view"
import { StatusBadge } from "@/components/app/status-badge"
import { EmptyState } from "@/components/states/empty-state"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Modal, ModalActions } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api, qs } from "@/lib/machina/api"
import { localDate, localDateTime } from "@/lib/machina/format"
import { useMe, useMeta } from "@/lib/machina/hooks"
import { COMPANY_ROLE, COMPANY_TYPE } from "@/lib/machina/labels"
import type {
  AdminCompanyDetail,
  AdminCompanyListItem,
  AdminUser,
  AuditEntry,
  CompanyStatus,
  Paged,
} from "@/lib/machina/types"
import { cn } from "@/lib/utils"

import { AuditList, Pager, pageOf, SearchBox, useAdminAction, useUrlFilters } from "./shared"

const STATUS_TABS: { id: CompanyStatus | ""; label: string }[] = [
  { id: "pending", label: "Awaiting approval" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "suspended", label: "Suspended" },
  { id: "", label: "All" },
]

const TYPE_OPTIONS = [
  ["", "All types"],
  ["partner", "Rental companies"],
  ["client", "Customers"],
] as const

export function AdminCompanies({ query }: { query: Record<string, string> }) {
  const router = useRouter()
  const setFilters = useUrlFilters("/admin/companies", query)
  const params = {
    status: query.status ?? "",
    type: query.type ?? "",
    q: query.q ?? "",
    page: pageOf(query),
  }
  const list = useQuery({
    queryKey: ["admin", "companies", params],
    queryFn: () => api.get<Paged<AdminCompanyListItem>>(`/api/admin/companies${qs(params)}`),
  })

  return (
    <>
      <PageHead title="Companies">
        Rental companies can only sign in once you approve them. Customers are approved when they
        register.
      </PageHead>
      <div className="bg-muted mb-4 inline-flex flex-wrap gap-1 rounded-xl p-1" role="tablist">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id || "all"}
            type="button"
            role="tab"
            aria-selected={params.status === t.id}
            onClick={() => setFilters({ status: t.id })}
            className={cn(
              "text-muted-foreground hover:text-foreground cursor-pointer rounded-lg px-3.5 py-2 text-[0.92rem]",
              params.status === t.id &&
                "text-foreground bg-white font-semibold shadow-[0_1px_3px_rgb(20_18_14/0.12)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          aria-label="Company type"
          className="w-auto"
          options={TYPE_OPTIONS}
          value={params.type}
          onChange={(e) => setFilters({ type: e.target.value })}
        />
        <SearchBox
          key={params.q}
          value={params.q}
          placeholder="Search by name, VAT number or email"
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
                    <th>Company</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th className="num">Users</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {r.items.map((c) => (
                    <tr
                      key={c.id}
                      className="clickable"
                      onClick={() => router.push(`/admin/companies/${c.id}`)}
                    >
                      <td>
                        <Link
                          href={`/admin/companies/${c.id}`}
                          className="text-foreground font-semibold"
                        >
                          {c.name}
                        </Link>
                        <Small>VAT {c.vat}</Small>
                      </td>
                      <td>{COMPANY_TYPE[c.type]}</td>
                      <td>
                        {c.city} ({c.province})
                      </td>
                      <td>
                        <StatusBadge kind="company" status={c.status} />
                      </td>
                      <td className="num">{c.memberCount}</td>
                      <td className="whitespace-nowrap">{localDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              <Pager {...r} onPage={(page) => setFilters({ page: String(page) })} />
            </>
          ) : (
            <EmptyState
              icon={Building2}
              title={params.status === "pending" ? "Nothing to review." : "No companies found."}
            />
          )
        }
      </QueryView>
    </>
  )
}

type CompanyAction = "approve" | "reject" | "suspend" | "reactivate"

/** Actions that open a dialog: rejecting needs a reason, suspending can have one. */
const REASON_DIALOG = {
  reject: {
    title: "Reject this company",
    body: "Its users won't be able to sign in. You can still approve it later.",
    confirm: "Reject",
    required: true,
  },
  suspend: {
    title: "Suspend this company",
    body: "All its users are signed out at once and can't sign in until you reactivate it.",
    confirm: "Suspend",
    required: false,
  },
} as const

function ReasonDialog({
  action,
  onClose,
  onSubmit,
  busy,
}: {
  action: "reject" | "suspend" | null
  onClose: () => void
  onSubmit: (reason: string) => void
  busy: boolean
}) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const d = action ? REASON_DIALOG[action] : null
  return (
    <Modal
      open={action !== null}
      onOpenChange={(open) => !open && onClose()}
      title={d?.title ?? ""}
      description={d?.body}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (d?.required && !reason.trim()) return setError("Give a reason")
          onSubmit(reason.trim())
        }}
      >
        <Field
          label={d?.required ? "Reason" : "Reason (optional)"}
          htmlFor="reason"
          error={error}
          hint="Recorded in the activity log."
        >
          <Textarea
            id="reason"
            rows={3}
            maxLength={1000}
            aria-invalid={!!error}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setError("")
            }}
          />
        </Field>
        <ModalActions>
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={busy}>
            {d?.confirm}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

function CompanyActions({ id, status }: { id: string; status: CompanyStatus }) {
  const [dialog, setDialog] = useState<"reject" | "suspend" | null>(null)
  const act = useAdminAction(
    ({ action, reason }: { action: CompanyAction; reason?: string }) =>
      api.post(`/api/admin/companies/${id}/${action}`, reason ? { reason } : {}),
    "Company updated"
  )
  const run = (action: CompanyAction, reason?: string) =>
    act.mutate({ action, reason }, { onSuccess: () => setDialog(null) })

  return (
    <>
      {(status === "pending" || status === "rejected") && (
        <Button variant="ok" disabled={act.isPending} onClick={() => run("approve")}>
          Approve
        </Button>
      )}
      {status === "pending" && (
        <Button variant="danger" disabled={act.isPending} onClick={() => setDialog("reject")}>
          Reject
        </Button>
      )}
      {status === "approved" && (
        <Button variant="danger" disabled={act.isPending} onClick={() => setDialog("suspend")}>
          Suspend
        </Button>
      )}
      {status === "suspended" && (
        <Button variant="ok" disabled={act.isPending} onClick={() => run("reactivate")}>
          Reactivate
        </Button>
      )}
      <ReasonDialog
        key={dialog ?? "closed"}
        action={dialog}
        busy={act.isPending}
        onClose={() => setDialog(null)}
        onSubmit={(reason) => dialog && run(dialog, reason)}
      />
    </>
  )
}

/** Suspend or reactivate one user; not offered on yourself or on removed users. */
export function UserStatusButton({ user }: { user: Pick<AdminUser, "id" | "name" | "status"> }) {
  const me = useMe().data
  const confirm = useConfirm()
  const act = useAdminAction(
    (action: "suspend" | "reactivate") => api.post(`/api/admin/users/${user.id}/${action}`),
    "User updated"
  )
  if (user.id === me?.user.id || user.status === "removed") return null
  return user.status === "active" ? (
    <Button
      size="sm"
      variant="danger"
      disabled={act.isPending}
      onClick={async () => {
        const ok = await confirm({
          title: `Suspend ${user.name}?`,
          body: "They are signed out at once and can't sign in until you reactivate them.",
          confirmLabel: "Suspend",
          danger: true,
        })
        if (ok) act.mutate("suspend")
      }}
    >
      Suspend
    </Button>
  ) : (
    <Button size="sm" disabled={act.isPending} onClick={() => act.mutate("reactivate")}>
      Reactivate
    </Button>
  )
}

export function AdminCompany({ id }: { id: string }) {
  const meta = useMeta().data
  const detail = useQuery({
    queryKey: ["admin", "company", id],
    queryFn: () => api.get<AdminCompanyDetail>(`/api/admin/companies/${id}`),
  })
  const activity = useQuery({
    queryKey: ["admin", "audit", { targetId: id }],
    queryFn: () =>
      api.get<Paged<AuditEntry>>(
        `/api/admin/audit${qs({ targetType: "company", targetId: id, pageSize: 20 })}`
      ),
  })
  const province = (pid: string) => meta?.provinces.find((p) => p.id === pid)?.name ?? pid
  const plan = (pid: string | null) =>
    pid ? (meta?.settings.plans.find((p) => p.id === pid)?.name ?? pid) : "—"

  return (
    <QueryView query={detail}>
      {({ company: c, members }) => (
        <>
          <Crumbs items={[["Companies", "/admin/companies"], [c.name]]} />
          <PageHead
            title={c.name}
            eyebrow={COMPANY_TYPE[c.type]}
            actions={<CompanyActions id={c.id} status={c.status} />}
          >
            <span className="inline-flex flex-wrap items-center gap-2">
              <StatusBadge kind="company" status={c.status} />
              <span>Registered {localDateTime(c.createdAt)}</span>
            </span>
          </PageHead>
          {c.status === "pending" && c.type === "partner" && (
            <Alert tone="warn" className="mb-4" title="Waiting for your approval">
              Check the VAT number and company details before approving. Its users can&apos;t sign
              in until you do.
            </Alert>
          )}
          {c.status === "rejected" && c.rejectionReason && (
            <Alert tone="bad" className="mb-4" title="Rejected">
              {c.rejectionReason}
            </Alert>
          )}
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <PanelTitle icon={Building2}>Company details</PanelTitle>
              <KV
                items={[
                  ["VAT number", c.vat],
                  ["Address", `${c.address}, ${c.city} (${c.province})`],
                  [
                    "Email",
                    <a key="email" href={`mailto:${c.email}`}>
                      {c.email}
                    </a>,
                  ],
                  ["PEC", c.pec || "—"],
                  ["Phone", c.phone || "—"],
                  ...(c.type === "client"
                    ? ([["SDI code", c.sdi || "—"]] as [string, string][])
                    : ([
                        ["Provinces served", c.zones.map(province).join(", ") || "—"],
                        ["Plan", plan(c.planId)],
                      ] as [string, string][])),
                ]}
              />
            </Card>
            <Card>
              <PanelTitle icon={History}>Review and activity</PanelTitle>
              {c.reviewedAt && (
                <Small className="mb-3">
                  Last reviewed {localDateTime(c.reviewedAt)}
                  {c.reviewedBy ? ` by ${c.reviewedBy.name}` : ""}.
                </Small>
              )}
              <QueryView query={activity} rows={3}>
                {({ items }) => <AuditList entries={items} />}
              </QueryView>
            </Card>
          </div>
          <Card>
            <PanelTitle icon={Users}>Users ({members.length})</PanelTitle>
            {members.length ? (
              <TableWrap className="shadow-none">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Team role</th>
                    <th>Status</th>
                    <th>Last sign-in</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {members.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <b>{u.name}</b>
                        <Small>
                          {u.email}
                          {u.phone ? ` · ${u.phone}` : ""}
                        </Small>
                      </td>
                      <td>{u.companyRole ? COMPANY_ROLE[u.companyRole] : "—"}</td>
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
            ) : (
              <Small>No users.</Small>
            )}
          </Card>
        </>
      )}
    </QueryView>
  )
}
