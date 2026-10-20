"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Small } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { qs } from "@/lib/machina/api"
import { useFormat, useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages } from "@/i18n/messages"
import { useLabels, type Labels } from "@/lib/machina/labels"
import type { AuditEntry, CompanyRole } from "@/lib/machina/types"

const M = defineMessages({
  en: {
    range: (from: number, to: number, total: number) => `${from}–${to} of ${total}`,
    previous: "Previous",
    next: "Next",
    pageOf: (page: number, pages: number) => `Page ${page} of ${pages}`,
    reason: (r: string) => `Reason: ${r}`,
    newRole: (role: string) => `New role: ${role}`,
    gone: "(no longer exists)",
    by: (name: string) => ` · by ${name}`,
    noActivity: "No activity yet.",
  },
  it: {
    range: (from: number, to: number, total: number) => `${from}–${to} di ${total}`,
    previous: "Precedente",
    next: "Successiva",
    pageOf: (page: number, pages: number) => `Pagina ${page} di ${pages}`,
    reason: (r: string) => `Motivo: ${r}`,
    newRole: (role: string) => `Nuovo ruolo: ${role}`,
    gone: "(non esiste più)",
    by: (name: string) => ` · da ${name}`,
    noActivity: "Ancora nessuna attività.",
  },
})

/** Filters kept in the URL, so a filtered list can be bookmarked and survives a reload. */
export function useUrlFilters(base: string, query: Record<string, string>) {
  const router = useRouter()
  return (patch: Record<string, string>) => {
    // Any filter change goes back to the first page, unless the patch sets the page itself.
    const next = { ...query, page: "", ...patch }
    router.replace(`${base}${qs(next)}`, { scroll: false })
  }
}

export const pageOf = (query: Record<string, string>) => Math.max(1, Number(query.page) || 1)

/** Search box that applies on submit, not on every keystroke. */
export function SearchBox({
  value,
  placeholder,
  onSearch,
}: {
  value: string
  placeholder: string
  onSearch: (q: string) => void
}) {
  const c = useCommon()
  const [text, setText] = useState(value)
  return (
    <form
      role="search"
      className="flex min-w-[240px] flex-1 gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(text.trim())
      }}
    >
      <Input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button type="submit" aria-label={c.search}>
        <Search aria-hidden />
      </Button>
    </form>
  )
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
}) {
  const t = useMessages(M)
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total ? (page - 1) * pageSize + 1 : 0
  const to = Math.min(total, page * pageSize)
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <Small>{t.range(from, to, total)}</Small>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft aria-hidden /> {t.previous}
          </Button>
          <Small>{t.pageOf(page, pages)}</Small>
          <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            {t.next} <ChevronRight aria-hidden />
          </Button>
        </div>
      )}
    </div>
  )
}

/** A write to the admin API: toasts the outcome and refreshes every admin query. */
export function useAdminAction<TArgs>(fn: (args: TArgs) => Promise<unknown>, success: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(success)
      void qc.invalidateQueries({ queryKey: ["admin"] })
    },
    onError: (err) => toast.error(err.message),
  })
}

function targetHref(e: AuditEntry): string | null {
  if (e.targetType === "company") return `/admin/companies/${e.targetId}`
  if (e.targetType === "user" && e.targetLabel) return `/admin/users${qs({ q: e.targetLabel })}`
  return null
}

function auditDetails(e: AuditEntry, t: (typeof M)["en"], L: Labels): string | null {
  const d = e.data ?? {}
  if (typeof d.reason === "string" && d.reason) return t.reason(d.reason)
  if (typeof d.companyRole === "string")
    return t.newRole(L.COMPANY_ROLE[d.companyRole as CompanyRole] ?? d.companyRole)
  return null
}

/** One audit entry as a sentence: "Approved Noleggi Dora · by Anna Rossi". */
export function AuditLine({ entry: e }: { entry: AuditEntry }) {
  const t = useMessages(M)
  const L = useLabels()
  const { localDateTime } = useFormat()
  const href = targetHref(e)
  const target = e.targetLabel ?? t.gone
  const details = auditDetails(e, t, L)
  return (
    <div className="min-w-0">
      <div className="text-[0.93rem] leading-snug">
        {L.AUDIT_ACTION[e.action] ?? e.action}{" "}
        {href ? (
          <Link href={href} className="font-semibold">
            {target}
          </Link>
        ) : (
          <b>{target}</b>
        )}
      </div>
      <Small>
        {localDateTime(e.createdAt)}
        {e.actor ? t.by(e.actor.name) : ""}
        {details ? ` · ${details}` : ""}
      </Small>
    </div>
  )
}

export function AuditList({ entries }: { entries: AuditEntry[] }) {
  const t = useMessages(M)
  if (!entries.length) return <Small>{t.noActivity}</Small>
  return (
    <ul className="divide-border/70 m-0 list-none divide-y p-0">
      {entries.map((e) => (
        <li key={e.id} className="py-2.5 first:pt-0 last:pb-0">
          <AuditLine entry={e} />
        </li>
      ))}
    </ul>
  )
}
