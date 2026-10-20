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
import { useCatalogText } from "@/i18n/catalog"
import { useFormat, useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages } from "@/i18n/messages"
import { useMe, useMeta } from "@/lib/machina/hooks"
import { useLabels } from "@/lib/machina/labels"
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

const STATUS_TABS: (CompanyStatus | "")[] = ["pending", "approved", "rejected", "suspended", ""]
const TYPES = ["", "partner", "client"] as const

const M = defineMessages({
  en: {
    tabs: {
      pending: "Awaiting approval",
      approved: "Approved",
      rejected: "Rejected",
      suspended: "Suspended",
      "": "All",
    },
    types: { "": "All types", partner: "Rental companies", client: "Customers" },
    title: "Companies",
    intro:
      "Rental companies can only sign in once you approve them. Customers are approved when they register.",
    companyType: "Company type",
    searchPh: "Search by name, VAT number or email",
    company: "Company",
    type: "Type",
    location: "Location",
    status: "Status",
    users: "Users",
    registered: "Registered",
    vat: (v: string) => `VAT ${v}`,
    nothingToReview: "Nothing to review.",
    noCompanies: "No companies found.",
    rejectTitle: "Reject this company",
    rejectBody: "Its users won't be able to sign in. You can still approve it later.",
    reject: "Reject",
    suspendTitle: "Suspend this company",
    suspendBody: "All its users are signed out at once and can't sign in until you reactivate it.",
    suspend: "Suspend",
    giveReason: "Give a reason",
    reason: "Reason",
    reasonOptional: "Reason (optional)",
    recorded: "Recorded in the activity log.",
    companyUpdated: "Company updated",
    approve: "Approve",
    reactivate: "Reactivate",
    userUpdated: "User updated",
    suspendUserTitle: (name: string) => `Suspend ${name}?`,
    suspendUserBody: "They are signed out at once and can't sign in until you reactivate them.",
    registeredOn: (at: string) => `Registered ${at}`,
    waitingTitle: "Waiting for your approval",
    waitingBody:
      "Check the VAT number and company details before approving. Its users can't sign in until you do.",
    rejected: "Rejected",
    details: "Company details",
    vatNumber: "VAT number",
    address: "Address",
    email: "Email",
    pec: "PEC",
    phone: "Phone",
    sdi: "SDI code",
    provinces: "Provinces served",
    plan: "Plan",
    review: "Review and activity",
    lastReviewed: (at: string, by: string | null) => `Last reviewed ${at}${by ? ` by ${by}` : ""}.`,
    usersCount: (n: number) => `Users (${n})`,
    name: "Name",
    teamRole: "Team role",
    lastSignIn: "Last sign-in",
    never: "Never",
    noUsers: "No users.",
  },
  it: {
    tabs: {
      pending: "In attesa di approvazione",
      approved: "Approvate",
      rejected: "Rifiutate",
      suspended: "Sospese",
      "": "Tutte",
    },
    types: { "": "Tutti i tipi", partner: "Noleggiatori", client: "Clienti" },
    title: "Aziende",
    intro:
      "I noleggiatori possono accedere solo dopo la tua approvazione. I clienti sono approvati al momento della registrazione.",
    companyType: "Tipo di azienda",
    searchPh: "Cerca per nome, partita IVA o email",
    company: "Azienda",
    type: "Tipo",
    location: "Località",
    status: "Stato",
    users: "Utenti",
    registered: "Registrata",
    vat: (v: string) => `P. IVA ${v}`,
    nothingToReview: "Niente da valutare.",
    noCompanies: "Nessuna azienda trovata.",
    rejectTitle: "Rifiuta questa azienda",
    rejectBody: "I suoi utenti non potranno accedere. Potrai comunque approvarla in seguito.",
    reject: "Rifiuta",
    suspendTitle: "Sospendi questa azienda",
    suspendBody:
      "Tutti i suoi utenti vengono disconnessi subito e non possono accedere finché non la riattivi.",
    suspend: "Sospendi",
    giveReason: "Indica un motivo",
    reason: "Motivo",
    reasonOptional: "Motivo (facoltativo)",
    recorded: "Registrato nel registro attività.",
    companyUpdated: "Azienda aggiornata",
    approve: "Approva",
    reactivate: "Riattiva",
    userUpdated: "Utente aggiornato",
    suspendUserTitle: (name: string) => `Sospendere ${name}?`,
    suspendUserBody: "Viene disconnesso subito e non può accedere finché non lo riattivi.",
    registeredOn: (at: string) => `Registrata il ${at}`,
    waitingTitle: "In attesa della tua approvazione",
    waitingBody:
      "Verifica la partita IVA e i dati aziendali prima di approvare. I suoi utenti non possono accedere finché non lo fai.",
    rejected: "Rifiutata",
    details: "Dati aziendali",
    vatNumber: "Partita IVA",
    address: "Indirizzo",
    email: "Email",
    pec: "PEC",
    phone: "Telefono",
    sdi: "Codice SDI",
    provinces: "Province servite",
    plan: "Piano",
    review: "Verifica e attività",
    lastReviewed: (at: string, by: string | null) =>
      `Ultima verifica il ${at}${by ? ` da ${by}` : ""}.`,
    usersCount: (n: number) => `Utenti (${n})`,
    name: "Nome",
    teamRole: "Ruolo nel team",
    lastSignIn: "Ultimo accesso",
    never: "Mai",
    noUsers: "Nessun utente.",
  },
})

export function AdminCompanies({ query }: { query: Record<string, string> }) {
  const t = useMessages(M)
  const L = useLabels()
  const { localDate } = useFormat()
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
      <PageHead title={t.title}>{t.intro}</PageHead>
      <div className="bg-muted mb-4 inline-flex flex-wrap gap-1 rounded-xl p-1" role="tablist">
        {STATUS_TABS.map((id) => (
          <button
            key={id || "all"}
            type="button"
            role="tab"
            aria-selected={params.status === id}
            onClick={() => setFilters({ status: id })}
            className={cn(
              "text-muted-foreground hover:text-foreground cursor-pointer rounded-lg px-3.5 py-2 text-[0.92rem]",
              params.status === id &&
                "text-foreground bg-white font-semibold shadow-[0_1px_3px_rgb(20_18_14/0.12)]"
            )}
          >
            {t.tabs[id]}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          aria-label={t.companyType}
          className="w-auto"
          options={TYPES.map((x) => [x, t.types[x]] as const)}
          value={params.type}
          onChange={(e) => setFilters({ type: e.target.value })}
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
                    <th>{t.company}</th>
                    <th>{t.type}</th>
                    <th>{t.location}</th>
                    <th>{t.status}</th>
                    <th className="num">{t.users}</th>
                    <th>{t.registered}</th>
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
                        <Small>{t.vat(c.vat)}</Small>
                      </td>
                      <td>{L.COMPANY_TYPE[c.type]}</td>
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
              title={params.status === "pending" ? t.nothingToReview : t.noCompanies}
            />
          )
        }
      </QueryView>
    </>
  )
}

type CompanyAction = "approve" | "reject" | "suspend" | "reactivate"

/** Actions that open a dialog: rejecting needs a reason, suspending can have one. */
const REASON_REQUIRED = { reject: true, suspend: false } as const

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
  const t = useMessages(M)
  const c = useCommon()
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const d = action
    ? {
        title: action === "reject" ? t.rejectTitle : t.suspendTitle,
        body: action === "reject" ? t.rejectBody : t.suspendBody,
        confirm: action === "reject" ? t.reject : t.suspend,
        required: REASON_REQUIRED[action],
      }
    : null
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
          if (d?.required && !reason.trim()) return setError(t.giveReason)
          onSubmit(reason.trim())
        }}
      >
        <Field
          label={d?.required ? t.reason : t.reasonOptional}
          htmlFor="reason"
          error={error}
          hint={t.recorded}
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
            {c.cancel}
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
  const t = useMessages(M)
  const [dialog, setDialog] = useState<"reject" | "suspend" | null>(null)
  const act = useAdminAction(
    ({ action, reason }: { action: CompanyAction; reason?: string }) =>
      api.post(`/api/admin/companies/${id}/${action}`, reason ? { reason } : {}),
    t.companyUpdated
  )
  const run = (action: CompanyAction, reason?: string) =>
    act.mutate({ action, reason }, { onSuccess: () => setDialog(null) })

  return (
    <>
      {(status === "pending" || status === "rejected") && (
        <Button variant="ok" disabled={act.isPending} onClick={() => run("approve")}>
          {t.approve}
        </Button>
      )}
      {status === "pending" && (
        <Button variant="danger" disabled={act.isPending} onClick={() => setDialog("reject")}>
          {t.reject}
        </Button>
      )}
      {status === "approved" && (
        <Button variant="danger" disabled={act.isPending} onClick={() => setDialog("suspend")}>
          {t.suspend}
        </Button>
      )}
      {status === "suspended" && (
        <Button variant="ok" disabled={act.isPending} onClick={() => run("reactivate")}>
          {t.reactivate}
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
  const t = useMessages(M)
  const me = useMe().data
  const confirm = useConfirm()
  const act = useAdminAction(
    (action: "suspend" | "reactivate") => api.post(`/api/admin/users/${user.id}/${action}`),
    t.userUpdated
  )
  if (user.id === me?.user.id || user.status === "removed") return null
  return user.status === "active" ? (
    <Button
      size="sm"
      variant="danger"
      disabled={act.isPending}
      onClick={async () => {
        const ok = await confirm({
          title: t.suspendUserTitle(user.name),
          body: t.suspendUserBody,
          confirmLabel: t.suspend,
          danger: true,
        })
        if (ok) act.mutate("suspend")
      }}
    >
      {t.suspend}
    </Button>
  ) : (
    <Button size="sm" disabled={act.isPending} onClick={() => act.mutate("reactivate")}>
      {t.reactivate}
    </Button>
  )
}

export function AdminCompany({ id }: { id: string }) {
  const t = useMessages(M)
  const L = useLabels()
  const ct = useCatalogText()
  const { localDateTime } = useFormat()
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
  const province = (pid: string) =>
    ct.province(pid, meta?.provinces.find((p) => p.id === pid)?.name ?? pid)
  const plan = (pid: string | null) =>
    pid ? (meta?.settings.plans.find((p) => p.id === pid)?.name ?? pid) : "—"

  return (
    <QueryView query={detail}>
      {({ company: c, members }) => (
        <>
          <Crumbs items={[[t.title, "/admin/companies"], [c.name]]} />
          <PageHead
            title={c.name}
            eyebrow={L.COMPANY_TYPE[c.type]}
            actions={<CompanyActions id={c.id} status={c.status} />}
          >
            <span className="inline-flex flex-wrap items-center gap-2">
              <StatusBadge kind="company" status={c.status} />
              <span>{t.registeredOn(localDateTime(c.createdAt))}</span>
            </span>
          </PageHead>
          {c.status === "pending" && c.type === "partner" && (
            <Alert tone="warn" className="mb-4" title={t.waitingTitle}>
              {t.waitingBody}
            </Alert>
          )}
          {c.status === "rejected" && c.rejectionReason && (
            <Alert tone="bad" className="mb-4" title={t.rejected}>
              {c.rejectionReason}
            </Alert>
          )}
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <PanelTitle icon={Building2}>{t.details}</PanelTitle>
              <KV
                items={[
                  [t.vatNumber, c.vat],
                  [t.address, `${c.address}, ${c.city} (${c.province})`],
                  [
                    t.email,
                    <a key="email" href={`mailto:${c.email}`}>
                      {c.email}
                    </a>,
                  ],
                  [t.pec, c.pec || "—"],
                  [t.phone, c.phone || "—"],
                  ...(c.type === "client"
                    ? ([[t.sdi, c.sdi || "—"]] as [string, string][])
                    : ([
                        [t.provinces, c.zones.map(province).join(", ") || "—"],
                        [t.plan, plan(c.planId)],
                      ] as [string, string][])),
                ]}
              />
            </Card>
            <Card>
              <PanelTitle icon={History}>{t.review}</PanelTitle>
              {c.reviewedAt && (
                <Small className="mb-3">
                  {t.lastReviewed(localDateTime(c.reviewedAt), c.reviewedBy?.name ?? null)}
                </Small>
              )}
              <QueryView query={activity} rows={3}>
                {({ items }) => <AuditList entries={items} />}
              </QueryView>
            </Card>
          </div>
          <Card>
            <PanelTitle icon={Users}>{t.usersCount(members.length)}</PanelTitle>
            {members.length ? (
              <TableWrap className="shadow-none">
                <thead>
                  <tr>
                    <th>{t.name}</th>
                    <th>{t.teamRole}</th>
                    <th>{t.status}</th>
                    <th>{t.lastSignIn}</th>
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
                      <td>{u.companyRole ? L.COMPANY_ROLE[u.companyRole] : "—"}</td>
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
            ) : (
              <Small>{t.noUsers}</Small>
            )}
          </Card>
        </>
      )}
    </QueryView>
  )
}
