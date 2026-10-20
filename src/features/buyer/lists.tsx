"use client"

import { useQuery } from "@tanstack/react-query"
import {
  ClipboardCheck,
  Hourglass,
  ListChecks,
  MessageSquareQuote,
  Package,
  Receipt,
  TriangleAlert,
  Truck,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { PageHead, Small, TableWrap } from "@/components/app/bits"
import { ActionList, PanelTitle, Stat, StatGrid, WelcomeBanner } from "@/components/app/dashboard"
import { QueryView } from "@/components/app/query-view"
import { StatusBadge } from "@/components/app/status-badge"
import { useBuyerSummary } from "@/components/layout/dash-shell"
import { EmptyState } from "@/components/states/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api, downloadFile } from "@/lib/machina/api"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages, plural } from "@/i18n/messages"
import { stripDemo } from "@/lib/machina/format"
import { useMe } from "@/lib/machina/hooks"
import { useLabels } from "@/lib/machina/labels"
import type { ClientDocument, Order, OrderSummary, RequestListItem } from "@/lib/machina/types"

type OrderWithSummary = Order & { summary: OrderSummary }

const M = defineMessages({
  en: {
    thingsToDo: (n: number) =>
      `You have ${n} ${plural(n, "thing", "things")} to do. Everything else is on track.`,
    nothingNeeded: "Nothing needs your attention right now.",
    searchMachine: "Search for a machine",
    describeJob: "Describe a job",
    quotesToReview: "Quotes to review",
    partsAwaiting: "Parts awaiting partners",
    activeOrders: "Active orders",
    changesToApprove: "Changes to approve",
    chargesToReview: "Charges to review",
    unpaidOrders: "Unpaid orders",
    toDo: "To do",
    allOrders: "All orders",
    latestOrders: "Latest orders",
    noOrders: "No orders.",
    requestsTitle: "Requests and quotes",
    newRequest: "New request",
    requestsIntro:
      "A request can involve several partners: each part has its own quote and status.",
    request: "Request",
    site: "Site",
    period: "Period",
    parts: "Parts",
    overallStatus: "Overall status",
    viaAssistant: " · assistant",
    quoteToReview: "Quote to review",
    noRequests: "You haven't sent any requests yet.",
    ordersTitle: "Orders",
    ordersIntro: "Order status and payment status are independent.",
    order: "Order",
    rentalCompany: "Rental company",
    machines: "Machines",
    status: "Status",
    payment: "Payment",
    agreedTotal: "Agreed total",
    changeToApprove: "change to approve",
    noOrdersYet: "No orders yet.",
    ordersCreated: "Orders are created when you accept a quote.",
    changesTitle: "Changes to approve",
    changesIntro:
      "Extensions, accessories and services proposed by rental companies, and extra charges to review. Only what you accept changes the agreed total.",
    plusVat: "+ VAT",
    nothingToApprove: "Nothing to approve",
    nothingToApproveHint:
      "Extensions, added services and extra charges from rental companies will appear here.",
    waitingYou: "Waiting for you",
    waitingYouHint: "Accept or reject: only what you accept changes the agreed total.",
    waitingPartner: "Waiting for the rental company",
    waitingPartnerHint: "Your requests to price and your disputed charges.",
    reviewInOrder: "Review in order",
    openOrder: "Open order",
    documentsTitle: "Documents and invoices",
    documentsIntro:
      "Invoices are issued by the rental companies with their own software and uploaded to the order. Machina drafts have no tax value.",
    draft: "Draft",
    uploadedInvoices: "Uploaded invoices",
    notUploaded: "Not uploaded yet",
    noDocuments: "No documents.",
  },
  it: {
    thingsToDo: (n: number) =>
      `Hai ${n} ${plural(n, "cosa", "cose")} da fare. Il resto procede regolarmente.`,
    nothingNeeded: "Al momento non c'è niente che richieda la tua attenzione.",
    searchMachine: "Cerca una macchina",
    describeJob: "Descrivi un lavoro",
    quotesToReview: "Preventivi da valutare",
    partsAwaiting: "Parti in attesa dei noleggiatori",
    activeOrders: "Ordini attivi",
    changesToApprove: "Modifiche da approvare",
    chargesToReview: "Addebiti da verificare",
    unpaidOrders: "Ordini da pagare",
    toDo: "Da fare",
    allOrders: "Tutti gli ordini",
    latestOrders: "Ultimi ordini",
    noOrders: "Nessun ordine.",
    requestsTitle: "Richieste e preventivi",
    newRequest: "Nuova richiesta",
    requestsIntro:
      "Una richiesta può coinvolgere più noleggiatori: ogni parte ha il proprio preventivo e il proprio stato.",
    request: "Richiesta",
    site: "Cantiere",
    period: "Periodo",
    parts: "Parti",
    overallStatus: "Stato complessivo",
    viaAssistant: " · assistente",
    quoteToReview: "Preventivo da valutare",
    noRequests: "Non hai ancora inviato richieste.",
    ordersTitle: "Ordini",
    ordersIntro: "Lo stato dell'ordine e lo stato del pagamento sono indipendenti.",
    order: "Ordine",
    rentalCompany: "Noleggiatore",
    machines: "Macchine",
    status: "Stato",
    payment: "Pagamento",
    agreedTotal: "Totale concordato",
    changeToApprove: "modifica da approvare",
    noOrdersYet: "Ancora nessun ordine.",
    ordersCreated: "Gli ordini vengono creati quando accetti un preventivo.",
    changesTitle: "Modifiche da approvare",
    changesIntro:
      "Proroghe, accessori e servizi proposti dai noleggiatori, e addebiti extra da verificare. Solo ciò che accetti cambia il totale concordato.",
    plusVat: "+ IVA",
    nothingToApprove: "Niente da approvare",
    nothingToApproveHint:
      "Qui compariranno proroghe, servizi aggiunti e addebiti extra dei noleggiatori.",
    waitingYou: "In attesa di te",
    waitingYouHint: "Accetta o rifiuta: solo ciò che accetti cambia il totale concordato.",
    waitingPartner: "In attesa del noleggiatore",
    waitingPartnerHint: "Le tue richieste da quotare e gli addebiti che hai contestato.",
    reviewInOrder: "Valuta nell'ordine",
    openOrder: "Apri l'ordine",
    documentsTitle: "Documenti e fatture",
    documentsIntro:
      "Le fatture sono emesse dai noleggiatori con il proprio gestionale e caricate sull'ordine. Le bozze Machina non hanno valore fiscale.",
    draft: "Bozza",
    uploadedInvoices: "Fatture caricate",
    notUploaded: "Non ancora caricata",
    noDocuments: "Nessun documento.",
  },
})

export function useBuyerOrders() {
  return useQuery({
    queryKey: ["buyer", "orders"],
    queryFn: () => api.get<{ orders: OrderWithSummary[] }>("/api/client/orders"),
  })
}

export function BuyerOverview() {
  const t = useMessages(M)
  const { date, eur } = useFormat()
  const me = useMe().data
  const summary = useBuyerSummary()
  return (
    <QueryView query={summary}>
      {(s) => (
        <>
          <WelcomeBanner
            name={me?.user.name}
            org={me?.org?.name}
            subtitle={s.actions.length ? t.thingsToDo(s.actions.length) : t.nothingNeeded}
            actions={
              <>
                <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
                  {t.searchMachine}
                </Link>
                <Link href="/assistant" className={buttonVariants()}>
                  {t.describeJob}
                </Link>
              </>
            }
          />
          <StatGrid>
            <Stat
              n={s.counts.quotesToEvaluate}
              label={t.quotesToReview}
              href="/buyer/requests"
              icon={MessageSquareQuote}
              hot
            />
            <Stat
              n={s.counts.waitingPartner}
              label={t.partsAwaiting}
              href="/buyer/requests"
              icon={Hourglass}
            />
            <Stat
              n={s.counts.activeOrders}
              label={t.activeOrders}
              href="/buyer/orders"
              icon={Truck}
            />
            <Stat
              n={s.counts.changesToApprove}
              label={t.changesToApprove}
              href="/buyer/changes"
              icon={ClipboardCheck}
              hot
            />
            <Stat
              n={s.counts.chargesToVerify}
              label={t.chargesToReview}
              href="/buyer/changes"
              icon={TriangleAlert}
              hot
            />
            <Stat
              n={s.counts.paymentsOpen}
              label={t.unpaidOrders}
              href="/buyer/documents"
              icon={Receipt}
            />
          </StatGrid>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <PanelTitle icon={ListChecks}>{t.toDo}</PanelTitle>
              <ActionList actions={s.actions} />
            </Card>
            <Card>
              <PanelTitle
                icon={Package}
                aside={
                  <Link href="/buyer/orders" className="text-sm font-medium">
                    {t.allOrders}
                  </Link>
                }
              >
                {t.latestOrders}
              </PanelTitle>
              {s.recentOrders.length ? (
                <div className="space-y-2">
                  {s.recentOrders.map((o) => (
                    <Link
                      key={o.id}
                      href={`/buyer/orders/${o.id}`}
                      className="text-foreground border-border hover:border-primary/40 hover:bg-primary-soft/40 flex justify-between gap-3 rounded-xl border px-3.5 py-3 no-underline transition-colors hover:no-underline"
                    >
                      <span>
                        <b>{o.code}</b> · {o.partnerName}
                        <Small>
                          {date(o.period.from)} → {date(o.period.to)}
                        </Small>
                      </span>
                      <span className="text-right">
                        <StatusBadge kind="order" status={o.status} />
                        <div className="text-sm">{eur(o.summary.agreedGross)}</div>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <Small>{t.noOrders}</Small>
              )}
            </Card>
          </div>
        </>
      )}
    </QueryView>
  )
}

export function BuyerRequests() {
  const t = useMessages(M)
  const { date } = useFormat()
  const router = useRouter()
  const q = useQuery({
    queryKey: ["buyer", "requests"],
    queryFn: () => api.get<{ requests: RequestListItem[] }>("/api/client/requests"),
  })
  return (
    <>
      <PageHead
        title={t.requestsTitle}
        actions={
          <Link href="/request" className={buttonVariants({ variant: "primary" })}>
            {t.newRequest}
          </Link>
        }
      >
        {t.requestsIntro}
      </PageHead>
      <QueryView query={q}>
        {({ requests }) =>
          requests.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t.request}</th>
                  <th>{t.site}</th>
                  <th>{t.period}</th>
                  <th>{t.parts}</th>
                  <th>{t.overallStatus}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    className="clickable"
                    onClick={() => router.push(`/buyer/requests/${r.id}`)}
                  >
                    <td className="whitespace-nowrap">
                      <Link
                        href={`/buyer/requests/${r.id}`}
                        className="text-foreground font-semibold"
                      >
                        {r.code}
                      </Link>
                      <Small>
                        {date(r.createdAt)}
                        {r.source === "assistant" && t.viaAssistant}
                      </Small>
                      {r.parts.some((p) => p.status === "sent") && (
                        <Badge tone="accent" className="mt-1.5">
                          {t.quoteToReview}
                        </Badge>
                      )}
                    </td>
                    <td>{r.site.name}</td>
                    <td className="whitespace-nowrap">
                      {date(r.period.from)} → {date(r.period.to)}
                    </td>
                    <td>
                      {r.parts.map((p) => (
                        <div key={p.id} className="text-sm">
                          {stripDemo(p.partnerName)} <StatusBadge kind="quote" status={p.status} />
                        </div>
                      ))}
                    </td>
                    <td>
                      <StatusBadge kind="request" status={r.overview.status} />
                      <Small>{r.overview.label}</Small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          ) : (
            <EmptyState
              image="/img/empty-request.svg"
              title={t.noRequests}
              action={
                <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
                  {t.searchMachine}
                </Link>
              }
            />
          )
        }
      </QueryView>
    </>
  )
}

export function BuyerOrders() {
  const t = useMessages(M)
  const { date, eur } = useFormat()
  const router = useRouter()
  const q = useBuyerOrders()
  return (
    <>
      <PageHead title={t.ordersTitle}>{t.ordersIntro}</PageHead>
      <QueryView query={q}>
        {({ orders }) =>
          orders.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t.order}</th>
                  <th>{t.rentalCompany}</th>
                  <th>{t.machines}</th>
                  <th>{t.period}</th>
                  <th>{t.status}</th>
                  <th>{t.payment}</th>
                  <th className="num">{t.agreedTotal}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="clickable"
                    onClick={() => router.push(`/buyer/orders/${o.id}`)}
                  >
                    <td className="whitespace-nowrap">
                      <Link
                        href={`/buyer/orders/${o.id}`}
                        className="text-foreground font-semibold"
                      >
                        {o.code}
                      </Link>
                    </td>
                    <td>{o.partnerName}</td>
                    <td className="text-sm">{o.items.map((i) => i.label).join(", ")}</td>
                    <td className="whitespace-nowrap">
                      {date(o.period.from)} → {date(o.period.to)}
                    </td>
                    <td>
                      <StatusBadge kind="order" status={o.status} />
                      {o.changes.some((c) => c.status === "pending_approval") && (
                        <div className="mt-1">
                          <Badge tone="accent">{t.changeToApprove}</Badge>
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge kind="payment" status={o.payment.status} />
                    </td>
                    <td className="num">{eur(o.summary.agreedGross)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          ) : (
            <EmptyState title={t.noOrdersYet} description={t.ordersCreated} />
          )
        }
      </QueryView>
    </>
  )
}

export function BuyerChanges() {
  const t = useMessages(M)
  const L = useLabels()
  const { eur } = useFormat()
  const q = useBuyerOrders()
  return (
    <>
      <PageHead title={t.changesTitle}>{t.changesIntro}</PageHead>
      <QueryView query={q}>
        {({ orders }) => {
          const items = orders.flatMap((o) => [
            ...o.changes
              .filter((c) => c.status === "pending_approval" || c.status === "requested_by_client")
              .map((c) => ({
                o,
                key: c.id,
                open: c.status === "pending_approval",
                code: c.code,
                badge: <StatusBadge kind="change" status={c.status} />,
                text: (
                  <>
                    {L.CHANGE_KIND[c.kind]}: {c.reason}
                    {c.line && (
                      <>
                        {" "}
                        —{" "}
                        <b>
                          {eur(c.line.amount)} {t.plusVat}
                        </b>
                      </>
                    )}
                  </>
                ),
              })),
            ...o.charges
              .filter((c) => c.status === "pending_review" || c.status === "disputed")
              .map((c) => ({
                o,
                key: c.id,
                open: c.status === "pending_review",
                code: c.code,
                badge: <StatusBadge kind="charge" status={c.status} />,
                text: (
                  <>
                    {L.CHARGE_KIND[c.kind]}: {c.description} —{" "}
                    <b>
                      {eur(c.amount)} {t.plusVat}
                    </b>
                  </>
                ),
              })),
          ])
          if (!items.length) {
            return <EmptyState title={t.nothingToApprove} description={t.nothingToApproveHint} />
          }
          // Split what needs the customer's decision from what is back with the rental company.
          const groups = [
            {
              title: t.waitingYou,
              hint: t.waitingYouHint,
              items: items.filter((i) => i.open),
            },
            {
              title: t.waitingPartner,
              hint: t.waitingPartnerHint,
              items: items.filter((i) => !i.open),
            },
          ].filter((g) => g.items.length)
          return (
            <div className="space-y-8">
              {groups.map((g) => (
                <section key={g.title}>
                  <h2 className="mb-1 text-[1.35rem]">
                    {g.title} <span className="text-muted-foreground">({g.items.length})</span>
                  </h2>
                  <Small className="mb-3">{g.hint}</Small>
                  <div className="space-y-3">
                    {g.items.map(({ o, key, open, code, badge, text }) => (
                      <Card
                        key={key}
                        flat={!open}
                        className="flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <b>{code}</b>
                            {badge}
                            <span className="text-muted-foreground text-sm">
                              {o.code} · {stripDemo(o.partnerName)}
                            </span>
                          </div>
                          <div className="mt-1 text-[0.95rem]">{text}</div>
                        </div>
                        <Link
                          href={`/buyer/orders/${o.id}`}
                          className={buttonVariants({
                            size: "sm",
                            variant: open ? "primary" : "default",
                          })}
                        >
                          {open ? t.reviewInOrder : t.openOrder}
                        </Link>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        }}
      </QueryView>
    </>
  )
}

export function BuyerDocuments() {
  const t = useMessages(M)
  const L = useLabels()
  const { date, eur } = useFormat()
  const q = useQuery({
    queryKey: ["buyer", "documents"],
    queryFn: () => api.get<{ documents: ClientDocument[] }>("/api/client/documents"),
  })
  return (
    <>
      <PageHead title={t.documentsTitle}>{t.documentsIntro}</PageHead>
      <QueryView query={q}>
        {({ documents }) =>
          documents.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t.order}</th>
                  <th>{t.rentalCompany}</th>
                  <th>{t.draft}</th>
                  <th>{t.uploadedInvoices}</th>
                  <th>{t.payment}</th>
                  <th className="num">{t.agreedTotal}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.orderId}>
                    <td>
                      <Link href={`/buyer/orders/${d.orderId}`} className="font-semibold">
                        {d.code}
                      </Link>
                    </td>
                    <td>{d.partnerName}</td>
                    <td>
                      <Link
                        href={`/buyer/orders/${d.orderId}/draft-invoice`}
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
                            {L.DOC_TYPE[i.docType]} {i.number} ({date(i.date)})
                          </Button>
                        ))
                      ) : (
                        <Small>{t.notUploaded}</Small>
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
            <EmptyState title={t.noDocuments} />
          )
        }
      </QueryView>
    </>
  )
}
