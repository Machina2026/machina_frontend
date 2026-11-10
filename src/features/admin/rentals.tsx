"use client"

import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ClipboardList, Package, Timer, Wallet } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Crumbs, KV, PageHead, Small, TableWrap } from "@/components/app/bits"
import { Stat, StatGrid } from "@/components/app/dashboard"
import { SiteBlock, Timeline, VersionsList } from "@/components/app/details"
import { LinesTable } from "@/components/app/lines-table"
import { QueryView } from "@/components/app/query-view"
import { StatusBadge } from "@/components/app/status-badge"
import { Alert } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { api, qs } from "@/lib/machina/api"
import { useLabels } from "@/lib/machina/labels"
import type {
  AdminRentalsSummary,
  AdminRequestDetail,
  AdminRequestRow,
  RequestStatus,
} from "@/lib/machina/types"
import { cn } from "@/lib/utils"

import { SearchBox, useUrlFilters } from "./shared"

const STATUS_TABS: (RequestStatus | "")[] = [
  "in_progress",
  "partial",
  "confirmed",
  "partially_closed",
  "closed",
  "",
]

const M = defineMessages({
  en: {
    title: "Requests and orders",
    intro:
      "Every customer request, the quote each rental company sent for it, and the orders they became. Read-only.",
    all: "All",
    searchPh: "Search by code (REQ, QUO, ORD) or company",
    request: "Request",
    customer: "Customer",
    period: "Period",
    site: "Site",
    parts: "Rental companies and orders",
    status: "Status",
    none: "No requests match.",
    awaitingPartner: "Quotes awaiting a rental company",
    awaitingClient: "Quotes awaiting the customer",
    active: "Active orders",
    overdue: "Overdue payments",
    waiting: "Payments waiting for payouts setup",
    requests: "Requests",
    createdBy: (by: string, at: string) => `Created by ${by} on ${at}`,
    viaAssistant: "prepared with the assistant",
    quotes: "Quotes",
    current: (n: number) => `Current version v${n}`,
    openOrder: (code: string) => `Open order ${code}`,
    history: "History",
    declined: (r: string) => `Declined by the rental company: ${r}`,
    rejected: (r: string) => `Rejected by the customer: ${r}`,
    orders: "Orders",
    noOrders: "No order yet.",
    agreed: "Agreed total",
    payment: "Payment",
    orderStatus: "Order",
    paymentFilter: "Payments",
    payments: {
      "": "All payments",
      due: "Payment due",
      overdue: "Payment overdue",
      waiting: "Waiting for payouts setup",
    },
  },
  it: {
    title: "Richieste e ordini",
    intro:
      "Ogni richiesta dei clienti, il preventivo che ogni noleggiatore ha inviato e gli ordini che ne sono nati. Sola lettura.",
    all: "Tutte",
    searchPh: "Cerca per codice (REQ, QUO, ORD) o azienda",
    request: "Richiesta",
    customer: "Cliente",
    period: "Periodo",
    site: "Cantiere",
    parts: "Noleggiatori e ordini",
    status: "Stato",
    none: "Nessuna richiesta corrisponde.",
    awaitingPartner: "Preventivi in attesa del noleggiatore",
    awaitingClient: "Preventivi in attesa del cliente",
    active: "Ordini attivi",
    overdue: "Pagamenti scaduti",
    waiting: "Pagamenti in attesa della configurazione incassi",
    requests: "Richieste",
    createdBy: (by: string, at: string) => `Creata da ${by} il ${at}`,
    viaAssistant: "preparata con l'assistente",
    quotes: "Preventivi",
    current: (n: number) => `Versione attuale v${n}`,
    openOrder: (code: string) => `Apri l'ordine ${code}`,
    history: "Cronologia",
    declined: (r: string) => `Rifiutata dal noleggiatore: ${r}`,
    rejected: (r: string) => `Rifiutato dal cliente: ${r}`,
    orders: "Ordini",
    noOrders: "Ancora nessun ordine.",
    agreed: "Totale concordato",
    payment: "Pagamento",
    orderStatus: "Ordine",
    paymentFilter: "Pagamenti",
    payments: {
      "": "Tutti i pagamenti",
      due: "Da pagare",
      overdue: "Pagamento scaduto",
      waiting: "In attesa della configurazione incassi",
    },
  },
})

const ORDERS = "/admin/rentals/orders"
const PAYMENT_FILTERS = ["", "due", "overdue", "waiting"] as const

/** Counts for the admin overview and the top of the list. */
export function useRentalsSummary() {
  return useQuery({
    queryKey: ["admin", "rentals", "summary"],
    queryFn: () => api.get<AdminRentalsSummary>("/api/admin/rentals/summary"),
  })
}

export function RentalStats({ s }: { s: AdminRentalsSummary }) {
  const t = useMessages(M)
  return (
    <StatGrid>
      <Stat
        n={s.quotes.awaitingPartner}
        label={t.awaitingPartner}
        href="/admin/rentals?status=in_progress"
        icon={ClipboardList}
      />
      <Stat
        n={s.quotes.awaitingClient}
        label={t.awaitingClient}
        href="/admin/rentals?status=in_progress"
        icon={Timer}
      />
      <Stat
        n={s.orders.confirmed + s.orders.inProgress}
        label={t.active}
        href="/admin/rentals?status=confirmed"
        icon={Package}
      />
      <Stat
        n={s.payments.overdue}
        label={t.overdue}
        href="/admin/rentals?payment=overdue"
        icon={AlertTriangle}
        hot
      />
      <Stat
        n={s.payments.waiting}
        label={t.waiting}
        href="/admin/rentals?payment=waiting"
        icon={Wallet}
        hot
      />
    </StatGrid>
  )
}

export function AdminRentals({ query }: { query: Record<string, string> }) {
  const t = useMessages(M)
  const L = useLabels()
  const { date, dateTime, eur } = useFormat()
  const router = useRouter()
  const setFilters = useUrlFilters("/admin/rentals", query)
  const params = { status: query.status ?? "", payment: query.payment ?? "", q: query.q ?? "" }
  const summary = useRentalsSummary()
  const list = useQuery({
    queryKey: ["admin", "requests", params],
    queryFn: () => api.get<{ requests: AdminRequestRow[] }>(`/api/admin/requests${qs(params)}`),
  })
  return (
    <>
      <PageHead title={t.title}>{t.intro}</PageHead>
      {summary.data && <RentalStats s={summary.data} />}
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
            {id ? L.REQUEST_STATUS[id].label : t.all}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          aria-label={t.paymentFilter}
          className="w-auto"
          options={PAYMENT_FILTERS.map((x) => [x, t.payments[x]] as const)}
          value={params.payment}
          onChange={(e) => setFilters({ payment: e.target.value })}
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
          r.requests.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t.request}</th>
                  <th>{t.customer}</th>
                  <th>{t.period}</th>
                  <th>{t.site}</th>
                  <th>{t.parts}</th>
                  <th>{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {r.requests.map((x) => (
                  <tr
                    key={x.id}
                    className="clickable"
                    onClick={() => router.push(`/admin/rentals/requests/${x.id}`)}
                  >
                    <td className="whitespace-nowrap">
                      <Link
                        href={`/admin/rentals/requests/${x.id}`}
                        className="text-foreground font-semibold"
                      >
                        {x.code}
                      </Link>
                      <Small>{dateTime(x.createdAt)}</Small>
                    </td>
                    <td className="min-w-[170px]">{x.clientName}</td>
                    <td className="whitespace-nowrap">
                      {date(x.period.from)} → {date(x.period.to)}
                    </td>
                    <td>
                      {x.site.city} ({x.site.province})
                    </td>
                    <td>
                      <ul className="m-0 list-none space-y-1 p-0">
                        {x.parts.map((p) => (
                          <li key={p.quoteId} className="flex flex-wrap items-center gap-1.5">
                            <span>{p.partnerName}</span>
                            <StatusBadge kind="quote" status={p.status} />
                            <span className="text-muted-foreground text-sm tabular-nums">
                              {eur(p.net)}
                            </span>
                            {p.order && (
                              <>
                                <Link
                                  href={`${ORDERS}/${p.order.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-sm font-semibold"
                                >
                                  {p.order.code}
                                </Link>
                                {p.order.status === "cancelled" && (
                                  <StatusBadge kind="order" status="cancelled" />
                                )}
                                {p.order.payment !== "none" && (
                                  <StatusBadge kind="payment" status={p.order.payment} />
                                )}
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <StatusBadge kind="request" status={x.overview.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          ) : (
            <Small>{t.none}</Small>
          )
        }
      </QueryView>
    </>
  )
}

export function AdminRequest({ id }: { id: string }) {
  const t = useMessages(M)
  const { date, dateTime, eur } = useFormat()
  const q = useQuery({
    queryKey: ["admin", "request", id],
    queryFn: () => api.get<AdminRequestDetail>(`/api/admin/requests/${id}`),
  })
  return (
    <QueryView query={q}>
      {(r) => (
        <>
          <Crumbs items={[[t.title, "/admin/rentals"], [r.code]]} />
          <h1 className="mb-1.5">
            {t.request} {r.code}
          </h1>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusBadge kind="request" status={r.overview.status} />
            <span className="text-muted-foreground text-sm">
              {r.clientName} · {t.createdBy(r.createdBy, dateTime(r.createdAt))}
              {r.source === "assistant" && ` · ${t.viaAssistant}`}
            </span>
          </div>
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              <h2 className="m-0 text-lg">{t.quotes}</h2>
              {r.quotes.map((qt) => {
                const v = qt.versions[qt.versions.length - 1]
                const order = r.orders.find((o) => o.quoteId === qt.id)
                return (
                  <Card key={qt.id}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <b>
                          {qt.code} · {qt.partnerName}
                        </b>
                        <Small>{t.current(v.n)}</Small>
                      </div>
                      <StatusBadge kind="quote" status={qt.status} />
                    </div>
                    {qt.declineReason && (
                      <Alert tone="bad" size="sm" className="mb-2">
                        {t.declined(qt.declineReason)}
                      </Alert>
                    )}
                    {qt.rejectReason && (
                      <Alert tone="bad" size="sm" className="mb-2">
                        {t.rejected(qt.rejectReason)}
                      </Alert>
                    )}
                    <LinesTable lines={v.lines} totals={v.totals} />
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer">{t.history}</summary>
                      <div className="mt-2 space-y-3">
                        <VersionsList quote={qt} />
                        <Timeline entries={qt.history} />
                      </div>
                    </details>
                    {order && (
                      <Link
                        href={`${ORDERS}/${order.id}`}
                        className={buttonVariants({ variant: "primary", className: "mt-3" })}
                      >
                        {t.openOrder(order.code)}
                      </Link>
                    )}
                  </Card>
                )
              })}
              <Card>
                <h3>{t.history}</h3>
                <Timeline entries={r.history} />
              </Card>
            </div>
            <aside className="space-y-4 xl:sticky xl:top-[88px]">
              <Card>
                <h3>{t.orders}</h3>
                {r.orders.length === 0 && <Small>{t.noOrders}</Small>}
                <ul className="m-0 list-none space-y-3 p-0">
                  {r.orders.map((o) => (
                    <li key={o.id} className="border-t pt-3 first:border-t-0 first:pt-0">
                      <Link href={`${ORDERS}/${o.id}`} className="font-semibold">
                        {o.code}
                      </Link>{" "}
                      <span className="text-muted-foreground text-sm">{o.partnerName}</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <StatusBadge kind="order" status={o.status} />
                        <StatusBadge kind="payment" status={o.payment.status} />
                      </div>
                      <Small className="mt-1">
                        {t.agreed}: {eur(o.summary.agreedGross)}
                      </Small>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h3>{t.site}</h3>
                <KV
                  className="mb-1.5"
                  items={[[t.period, `${date(r.period.from)} → ${date(r.period.to)}`]]}
                />
                <SiteBlock site={r.site} needs={r.needs} job={r.jobDescription} />
              </Card>
            </aside>
          </div>
        </>
      )}
    </QueryView>
  )
}
