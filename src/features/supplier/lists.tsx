"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  FileWarning,
  GitPullRequestArrow,
  Inbox,
  ListChecks,
  Send,
  TriangleAlert,
  Truck,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm"
import { PageHead, Small, TableWrap } from "@/components/app/bits"
import { ActionList, PanelTitle, Stat, StatGrid, WelcomeBanner } from "@/components/app/dashboard"
import { QueryView } from "@/components/app/query-view"
import { StatusBadge } from "@/components/app/status-badge"
import { useSupplierSummary } from "@/components/layout/dash-shell"
import { EmptyState } from "@/components/states/empty-state"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api, downloadFile } from "@/lib/machina/api"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages, plural } from "@/i18n/messages"
import { useMe } from "@/lib/machina/hooks"
import { useLabels } from "@/lib/machina/labels"
import type {
  CommissionReport,
  Order,
  OrderSummary,
  PartnerDocument,
  Quote,
  QuoteStatus,
} from "@/lib/machina/types"
import { cn } from "@/lib/utils"

type OrderWithSummary = Order & { summary: OrderSummary }

const M = defineMessages({
  en: {
    newRequests: (n: number) =>
      `${n} new ${plural(n, "request is", "requests are")} waiting for your quote.`,
    noNewRequests: "No new requests right now. Keep your prices up to date to win the next one.",
    reviewRequests: "Review requests",
    addMachine: "Add a machine",
    requestsToReview: "Requests to review",
    awaitingCustomer: "Quotes awaiting the customer",
    activeOrders: "Active orders",
    openChanges: "Open changes",
    disputedCharges: "Disputed charges",
    noInvoice: "Orders without an uploaded invoice",
    toDo: "To do",
    machinesInCatalog: (n: number) =>
      `Machines in your catalogue: ${n}. Integration with rental management software is not available yet.`,
    tabs: {
      review: "To review",
      sent: "Sent to customer",
      accepted: "Accepted",
      closed: "Declined / expired",
    } as Record<string, string>,
    quotesTitle: "Requests and quotes",
    quotesIntro: "You only see the lines of a request that concern your machines.",
    quote: "Quote",
    customer: "Customer",
    site: "Site",
    period: "Period",
    machines: "Machines",
    status: "Status",
    net: "Net",
    expires: (d: string) => `expires ${d}`,
    partial: "partial",
    noQuotes: "No quotes in this section.",
    ordersTitle: "Orders",
    order: "Order",
    payment: "Payment",
    invoice: "Invoice",
    agreedTotal: "Agreed total",
    uploaded: "uploaded",
    toUpload: "to upload",
    noOrdersYet: "No orders yet.",
    changesTitle: "Rental changes",
    changesIntro:
      "Extensions, added accessories and services, extra charges. To propose a change, open the order.",
    toPrice: "to price",
    chargeType: (kind: string) => `Charge: ${kind}`,
    noChanges: "No changes.",
    code: "Code",
    type: "Type",
    description: "Description",
    amount: "Amount",
    documentsTitle: "Documents and draft invoices",
    documentsIntro:
      "Machina generates a non-tax draft for every confirmed order. Issue the invoice with your own software and upload it to the order: uploading is not a submission to the SdI.",
    taxToHandle: (code: string) => `${code} — tax document to handle`,
    draft: "Draft",
    uploadedDocs: "Uploaded documents",
    uploadInvoice: "Upload invoice →",
    planUpdated: "Plan updated",
    commissionsTitle: "Machina commissions and plan",
    hypothetical: "Hypothetical values",
    hypotheticalNote: null as string | null,
    machinaInvoicing:
      "Machina will invoice the rental company for commissions and the subscription: Machina invoicing is not implemented yet.",
    planName: (name: string) => `${name} plan`,
    planDescriptions: {} as Record<string, string>,
    active: "active",
    changePlanTitle: "Change plan?",
    changePlanBody: "The new plan applies immediately.",
    changePlan: "Change plan",
    switchPlan: "Switch to this plan",
    monthlyFee: "Monthly fee",
    commission: "Commission",
    ofConfirmed: (rate: string) => `${rate} of confirmed orders`,
    perOrder: "Estimated commission per order",
    base: "Base: net of the accepted quote plus accepted changes (charges for damage, fuel and cleaning excluded).",
    date: "Date",
    baseCol: "Base",
    rate: "Rate",
    totalCommission: "Total estimated commission (excl. VAT)",
    noConfirmed: "No confirmed orders.",
  },
  it: {
    newRequests: (n: number) =>
      `${n} ${plural(n, "nuova richiesta attende", "nuove richieste attendono")} il tuo preventivo.`,
    noNewRequests:
      "Nessuna nuova richiesta al momento. Tieni aggiornati i prezzi per aggiudicarti la prossima.",
    reviewRequests: "Valuta le richieste",
    addMachine: "Aggiungi una macchina",
    requestsToReview: "Richieste da valutare",
    awaitingCustomer: "Preventivi in attesa del cliente",
    activeOrders: "Ordini attivi",
    openChanges: "Modifiche aperte",
    disputedCharges: "Addebiti contestati",
    noInvoice: "Ordini senza fattura caricata",
    toDo: "Da fare",
    machinesInCatalog: (n: number) =>
      `Macchine nel tuo catalogo: ${n}. L'integrazione con i gestionali di noleggio non è ancora disponibile.`,
    tabs: {
      review: "Da valutare",
      sent: "Inviati al cliente",
      accepted: "Accettati",
      closed: "Rifiutati / scaduti",
    } as Record<string, string>,
    quotesTitle: "Richieste e preventivi",
    quotesIntro: "Vedi solo le righe di una richiesta che riguardano le tue macchine.",
    quote: "Preventivo",
    customer: "Cliente",
    site: "Cantiere",
    period: "Periodo",
    machines: "Macchine",
    status: "Stato",
    net: "Imponibile",
    expires: (d: string) => `scade il ${d}`,
    partial: "parziale",
    noQuotes: "Nessun preventivo in questa sezione.",
    ordersTitle: "Ordini",
    order: "Ordine",
    payment: "Pagamento",
    invoice: "Fattura",
    agreedTotal: "Totale concordato",
    uploaded: "caricata",
    toUpload: "da caricare",
    noOrdersYet: "Ancora nessun ordine.",
    changesTitle: "Modifiche ai noleggi",
    changesIntro:
      "Proroghe, accessori e servizi aggiunti, addebiti extra. Per proporre una modifica, apri l'ordine.",
    toPrice: "da quotare",
    chargeType: (kind: string) => `Addebito: ${kind}`,
    noChanges: "Nessuna modifica.",
    code: "Codice",
    type: "Tipo",
    description: "Descrizione",
    amount: "Importo",
    documentsTitle: "Documenti e bozze di fattura",
    documentsIntro:
      "Machina genera una bozza senza valore fiscale per ogni ordine confermato. Emetti la fattura con il tuo gestionale e caricala sull'ordine: il caricamento non è un invio allo SdI.",
    taxToHandle: (code: string) => `${code} — documento fiscale da gestire`,
    draft: "Bozza",
    uploadedDocs: "Documenti caricati",
    uploadInvoice: "Carica la fattura →",
    planUpdated: "Piano aggiornato",
    commissionsTitle: "Commissioni Machina e piano",
    hypothetical: "Valori ipotetici",
    hypotheticalNote:
      "Ipotesi dimostrative: percentuali e canoni non sono decisioni commerciali definitive.",
    machinaInvoicing:
      "Machina fatturerà al noleggiatore commissioni e abbonamento: la fatturazione Machina non è ancora implementata.",
    planName: (name: string) => `Piano ${name}`,
    planDescriptions: {
      base: "Nessun canone mensile, commissione sugli ordini confermati.",
      pro: "Canone mensile, commissione ridotta.",
    } as Record<string, string>,
    active: "attivo",
    changePlanTitle: "Cambiare piano?",
    changePlanBody: "Il nuovo piano si applica subito.",
    changePlan: "Cambia piano",
    switchPlan: "Passa a questo piano",
    monthlyFee: "Canone mensile",
    commission: "Commissione",
    ofConfirmed: (rate: string) => `${rate} degli ordini confermati`,
    perOrder: "Commissione stimata per ordine",
    base: "Base: imponibile del preventivo accettato più le modifiche accettate (esclusi gli addebiti per danni, carburante e pulizia).",
    date: "Data",
    baseCol: "Base",
    rate: "Aliquota",
    totalCommission: "Totale commissioni stimate (IVA esclusa)",
    noConfirmed: "Nessun ordine confermato.",
  },
})

function useSupplierOrders() {
  return useQuery({
    queryKey: ["supplier", "orders"],
    queryFn: () => api.get<{ orders: OrderWithSummary[] }>("/api/partner/orders"),
  })
}

export function SupplierOverview() {
  const t = useMessages(M)
  const me = useMe().data
  const summary = useSupplierSummary()
  return (
    <QueryView query={summary}>
      {(s) => (
        <>
          <WelcomeBanner
            name={me?.user.name}
            org={me?.org?.name}
            subtitle={s.counts.newRequests ? t.newRequests(s.counts.newRequests) : t.noNewRequests}
            actions={
              <>
                <Link href="/supplier/quotes" className={buttonVariants({ variant: "primary" })}>
                  {t.reviewRequests}
                </Link>
                <Link href="/supplier/equipment/new" className={buttonVariants()}>
                  {t.addMachine}
                </Link>
              </>
            }
          />
          <StatGrid>
            <Stat
              n={s.counts.newRequests}
              label={t.requestsToReview}
              href="/supplier/quotes"
              icon={Inbox}
              hot
            />
            <Stat
              n={s.counts.awaitingClient}
              label={t.awaitingCustomer}
              href="/supplier/quotes?tab=sent"
              icon={Send}
            />
            <Stat
              n={s.counts.activeOrders}
              label={t.activeOrders}
              href="/supplier/orders"
              icon={Truck}
            />
            <Stat
              n={s.counts.changesOpen}
              label={t.openChanges}
              href="/supplier/changes"
              icon={GitPullRequestArrow}
              hot
            />
            <Stat
              n={s.counts.chargesContested}
              label={t.disputedCharges}
              href="/supplier/changes"
              icon={TriangleAlert}
              hot
            />
            <Stat
              n={s.counts.invoicesMissing}
              label={t.noInvoice}
              href="/supplier/documents"
              icon={FileWarning}
            />
          </StatGrid>
          <Card>
            <PanelTitle icon={ListChecks}>{t.toDo}</PanelTitle>
            <ActionList actions={s.actions} />
          </Card>
          <Small className="mt-3">{t.machinesInCatalog(s.counts.offers)}</Small>
        </>
      )}
    </QueryView>
  )
}

const TABS: { id: string; statuses: QuoteStatus[] }[] = [
  { id: "review", statuses: ["awaiting_partner"] },
  { id: "sent", statuses: ["sent"] },
  { id: "accepted", statuses: ["accepted"] },
  {
    id: "closed",
    statuses: ["declined_by_partner", "rejected_by_client", "expired", "withdrawn"],
  },
]

export function SupplierQuotes({ tab }: { tab?: string }) {
  const t = useMessages(M)
  const { date, eur } = useFormat()
  const router = useRouter()
  const active = TABS.find((x) => x.id === tab) ?? TABS[0]
  const q = useQuery({
    queryKey: ["supplier", "quotes"],
    queryFn: () => api.get<{ quotes: Quote[] }>("/api/partner/quotes"),
  })
  return (
    <>
      <PageHead title={t.quotesTitle}>{t.quotesIntro}</PageHead>
      <QueryView query={q}>
        {({ quotes }) => {
          const list = quotes.filter((x) => active.statuses.includes(x.status))
          return (
            <>
              <div
                className="bg-muted mb-5 inline-flex flex-wrap gap-1 rounded-xl p-1"
                role="tablist"
              >
                {TABS.map((tb) => (
                  <Link
                    key={tb.id}
                    href={`/supplier/quotes?tab=${tb.id}`}
                    role="tab"
                    aria-selected={tb === active}
                    className={cn(
                      "text-muted-foreground hover:text-foreground rounded-lg px-3.5 py-2 text-[0.92rem] no-underline hover:no-underline",
                      tb === active &&
                        "text-foreground bg-white font-semibold shadow-[0_1px_3px_rgb(20_18_14/0.12)]"
                    )}
                  >
                    {t.tabs[tb.id]} ({quotes.filter((x) => tb.statuses.includes(x.status)).length})
                  </Link>
                ))}
              </div>
              {list.length ? (
                <TableWrap>
                  <thead>
                    <tr>
                      <th>{t.quote}</th>
                      <th>{t.customer}</th>
                      <th>{t.site}</th>
                      <th>{t.period}</th>
                      <th>{t.machines}</th>
                      <th>{t.status}</th>
                      <th className="num">{t.net}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((x) => {
                      const v = x.versions[x.versions.length - 1]
                      return (
                        <tr
                          key={x.id}
                          className="clickable"
                          onClick={() => router.push(`/supplier/quotes/${x.id}`)}
                        >
                          <td>
                            <Link
                              href={`/supplier/quotes/${x.id}`}
                              className="text-foreground font-semibold"
                            >
                              {x.code}
                            </Link>
                            <Small>{date(x.createdAt)}</Small>
                          </td>
                          <td>{x.clientName}</td>
                          <td>
                            {x.site.city} ({x.site.province})
                          </td>
                          <td className="whitespace-nowrap">
                            {date(x.period.from)} → {date(x.period.to)}
                          </td>
                          <td className="text-sm">{x.items.map((i) => i.label).join(", ")}</td>
                          <td>
                            <StatusBadge kind="quote" status={x.status} forPartner />
                            {x.status === "sent" && v.validUntil && (
                              <Small>{t.expires(date(v.validUntil))}</Small>
                            )}
                          </td>
                          <td className="num">
                            {eur(v.totals.net)}{" "}
                            {!v.totals.complete && <Badge tone="warn">{t.partial}</Badge>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </TableWrap>
              ) : (
                <EmptyState title={t.noQuotes} />
              )}
            </>
          )
        }}
      </QueryView>
    </>
  )
}

export function SupplierOrders() {
  const t = useMessages(M)
  const { date, eur } = useFormat()
  const router = useRouter()
  const q = useSupplierOrders()
  return (
    <>
      <PageHead title={t.ordersTitle} />
      <QueryView query={q}>
        {({ orders }) =>
          orders.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t.order}</th>
                  <th>{t.customer}</th>
                  <th>{t.machines}</th>
                  <th>{t.period}</th>
                  <th>{t.status}</th>
                  <th>{t.payment}</th>
                  <th>{t.invoice}</th>
                  <th className="num">{t.agreedTotal}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="clickable"
                    onClick={() => router.push(`/supplier/orders/${o.id}`)}
                  >
                    <td>
                      <Link
                        href={`/supplier/orders/${o.id}`}
                        className="text-foreground font-semibold"
                      >
                        {o.code}
                      </Link>
                    </td>
                    <td>{o.clientName}</td>
                    <td className="text-sm">{o.items.map((i) => i.label).join(", ")}</td>
                    <td className="whitespace-nowrap">
                      {date(o.period.from)} → {date(o.period.to)}
                    </td>
                    <td>
                      <StatusBadge kind="order" status={o.status} />
                    </td>
                    <td>
                      <StatusBadge kind="payment" status={o.payment.status} />
                    </td>
                    <td>
                      {o.invoices.length ? (
                        <Badge tone="ok">{t.uploaded}</Badge>
                      ) : (
                        <Badge>{t.toUpload}</Badge>
                      )}
                    </td>
                    <td className="num">{eur(o.summary.agreedGross)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          ) : (
            <EmptyState title={t.noOrdersYet} />
          )
        }
      </QueryView>
    </>
  )
}

export function SupplierChanges() {
  const t = useMessages(M)
  const L = useLabels()
  const { eur } = useFormat()
  const router = useRouter()
  const q = useSupplierOrders()
  return (
    <>
      <PageHead title={t.changesTitle}>{t.changesIntro}</PageHead>
      <QueryView query={q}>
        {({ orders }) => {
          const rows = orders
            .flatMap((o) => [
              ...o.changes.map((x) => ({
                o,
                id: x.id,
                code: x.code,
                createdAt: x.createdAt,
                open: x.status === "requested_by_client" || x.status === "pending_approval",
                type: L.CHANGE_KIND[x.kind],
                description: x.reason,
                amount: x.line ? eur(x.line.amount) : <Badge tone="warn">{t.toPrice}</Badge>,
                badge: <StatusBadge kind="change" status={x.status} />,
              })),
              ...o.charges.map((x) => ({
                o,
                id: x.id,
                code: x.code,
                createdAt: x.createdAt,
                open: x.status === "disputed" || x.status === "pending_review",
                type: t.chargeType(L.CHARGE_KIND[x.kind]),
                description: x.description,
                amount: eur(x.amount),
                badge: <StatusBadge kind="charge" status={x.status} />,
              })),
            ])
            .sort(
              (a, b) => Number(b.open) - Number(a.open) || b.createdAt.localeCompare(a.createdAt)
            )
          if (!rows.length) return <EmptyState title={t.noChanges} />
          return (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t.code}</th>
                  <th>{t.order}</th>
                  <th>{t.type}</th>
                  <th>{t.description}</th>
                  <th className="num">{t.amount}</th>
                  <th>{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="clickable"
                    onClick={() => router.push(`/supplier/orders/${r.o.id}`)}
                  >
                    <td>
                      <b>{r.code}</b>
                    </td>
                    <td>
                      <Link href={`/supplier/orders/${r.o.id}`} className="text-foreground">
                        {r.o.code}
                      </Link>
                      <Small>{r.o.clientName}</Small>
                    </td>
                    <td>{r.type}</td>
                    <td className="text-sm">{r.description}</td>
                    <td className="num">{r.amount}</td>
                    <td>{r.badge}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )
        }}
      </QueryView>
    </>
  )
}

export function SupplierDocuments() {
  const t = useMessages(M)
  const L = useLabels()
  const { eur } = useFormat()
  const q = useQuery({
    queryKey: ["supplier", "documents"],
    queryFn: () => api.get<{ documents: PartnerDocument[] }>("/api/partner/documents"),
  })
  return (
    <>
      <PageHead title={t.documentsTitle}>{t.documentsIntro}</PageHead>
      <QueryView query={q}>
        {({ documents }) => (
          <>
            {documents.flatMap((d) =>
              d.notices.map((n, i) => (
                <Alert
                  key={`${d.orderId}-${i}`}
                  tone="warn"
                  size="sm"
                  className="mb-2"
                  title={t.taxToHandle(d.code)}
                >
                  {n.text}
                </Alert>
              ))
            )}
            {documents.length ? (
              <TableWrap>
                <thead>
                  <tr>
                    <th>{t.order}</th>
                    <th>{t.customer}</th>
                    <th>{t.draft}</th>
                    <th>{t.uploadedDocs}</th>
                    <th>{t.payment}</th>
                    <th className="num">{t.agreedTotal}</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.orderId}>
                      <td>
                        <Link href={`/supplier/orders/${d.orderId}`} className="font-semibold">
                          {d.code}
                        </Link>
                      </td>
                      <td>{d.clientName}</td>
                      <td>
                        <Link
                          href={`/supplier/orders/${d.orderId}/draft-invoice`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          {t.draft}
                        </Link>
                      </td>
                      <td>
                        {d.invoices.length ? (
                          d.invoices.map((i) => (
                            <Button
                              key={i.id}
                              variant="link"
                              className="block text-sm"
                              onClick={() =>
                                downloadFile(i.fileId, i.fileName).catch((err) =>
                                  toast.error(err.message)
                                )
                              }
                            >
                              {L.DOC_TYPE[i.docType]} {i.number}
                            </Button>
                          ))
                        ) : (
                          <Link href={`/supplier/orders/${d.orderId}`} className="text-sm">
                            {t.uploadInvoice}
                          </Link>
                        )}
                      </td>
                      <td>
                        <StatusBadge kind="payment" status={d.payment.status} />
                      </td>
                      <td className="num">{eur(d.summary.agreedGross)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ) : (
              <EmptyState title={t.noOrdersYet} />
            )}
          </>
        )}
      </QueryView>
    </>
  )
}

export function SupplierCommissions() {
  const t = useMessages(M)
  const { date, eur, pct } = useFormat()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const q = useQuery({
    queryKey: ["supplier", "commissions"],
    queryFn: () => api.get<CommissionReport>("/api/partner/commissions"),
  })
  const change = useMutation({
    mutationFn: (planId: string) => api.put("/api/partner/plan", { planId }),
    onSuccess: () => {
      toast.success(t.planUpdated)
      void qc.invalidateQueries({ queryKey: ["supplier", "commissions"] })
    },
  })
  return (
    <>
      <PageHead title={t.commissionsTitle} />
      <QueryView query={q}>
        {(r) => (
          <>
            <Alert tone="warn" className="mb-4" title={t.hypothetical}>
              {t.hypotheticalNote ?? r.note} {t.machinaInvoicing}
            </Alert>
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              {r.plans.map((p) => (
                <Card key={p.id} flat={p.id !== r.plan.id}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="m-0">{t.planName(p.name)}</h3>
                    {p.id === r.plan.id ? (
                      <Badge tone="ok">{t.active}</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (
                            await confirm({
                              title: t.changePlanTitle,
                              body: t.changePlanBody,
                              confirmLabel: t.changePlan,
                            })
                          ) {
                            change.mutate(p.id)
                          }
                        }}
                      >
                        {t.switchPlan}
                      </Button>
                    )}
                  </div>
                  <Small className="my-2">{t.planDescriptions[p.id] ?? p.description}</Small>
                  <dl className="grid grid-cols-[140px_1fr] gap-1 text-sm">
                    <dt className="text-muted-foreground">{t.monthlyFee}</dt>
                    <dd className="m-0 font-medium">{eur(p.monthly)}</dd>
                    <dt className="text-muted-foreground">{t.commission}</dt>
                    <dd className="m-0 font-medium">{t.ofConfirmed(pct(p.commissionRate))}</dd>
                  </dl>
                </Card>
              ))}
            </div>
            <Card>
              <h3>{t.perOrder}</h3>
              <Small className="mb-3">{t.base}</Small>
              {r.rows.length ? (
                <TableWrap>
                  <thead>
                    <tr>
                      <th>{t.order}</th>
                      <th>{t.customer}</th>
                      <th>{t.date}</th>
                      <th>{t.status}</th>
                      <th className="num">{t.baseCol}</th>
                      <th className="num">{t.rate}</th>
                      <th className="num">{t.commission}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.rows.map((x) => (
                      <tr key={x.orderId}>
                        <td>
                          <Link href={`/supplier/orders/${x.orderId}`}>{x.code}</Link>
                        </td>
                        <td>{x.client}</td>
                        <td>{date(x.createdAt)}</td>
                        <td>
                          <StatusBadge kind="order" status={x.status} />
                        </td>
                        <td className="num">{eur(x.base)}</td>
                        <td className="num">{pct(x.rate)}</td>
                        <td className="num">{eur(x.commission)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td colSpan={6}>{t.totalCommission}</td>
                      <td className="num">{eur(r.totalCommission)}</td>
                    </tr>
                  </tbody>
                </TableWrap>
              ) : (
                <Small>{t.noConfirmed}</Small>
              )}
            </Card>
          </>
        )}
      </QueryView>
    </>
  )
}
