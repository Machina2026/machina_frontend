"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm"
import { Crumbs, KV, MarkList, Small } from "@/components/app/bits"
import { SiteBlock, Timeline, VersionsList } from "@/components/app/details"
import { LinesTable } from "@/components/app/lines-table"
import { QueryView } from "@/components/app/query-view"
import { StatusBadge } from "@/components/app/status-badge"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Field } from "@/components/ui/field"
import { Modal, ModalActions } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import { api, ApiError } from "@/lib/machina/api"
import { useFormat, useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages } from "@/i18n/messages"
import { useMeta } from "@/lib/machina/hooks"
import type { Quote, RequestDetail, RequestOverview } from "@/lib/machina/types"

const M = defineMessages({
  en: {
    requests: "Requests",
    requestTitle: (code: string) => `Request ${code}`,
    createdOn: (at: string) => `Created on ${at}`,
    viaAssistant: "prepared with the assistant",
    direct: "direct search",
    notConfirmedYet: "The project as a whole isn't confirmed until every part has been accepted.",
    eachPartner: "Each partner sees and manages only its own lines.",
    parts: "Parts of the request",
    draft: "Machina draft",
    quoteV: (n: number) => `Quote v${n}`,
    plusVat: "+ VAT",
    partial: "partial",
    validUntil: "valid until",
    reason: (r: string) => `Reason: ${r}`,
    goToOrder: "Go to order",
    findAlternative: "Find an alternative",
    reviewQuote: "Review quote",
    details: "Details",
    siteNeeds: "Site and needs",
    history: "History",
    awaitingTitle: "Awaiting the partner",
    awaitingBody:
      "This is the draft Machina prepared from the catalogue rates. The partner has to check availability and conditions: the total is not final yet.",
    sentTitle: (until: string) => `Final quote to accept by ${until}`,
    sentBody:
      "The partner has checked availability and conditions. Accepting locks the price and creates the confirmed order.",
    expiredTitle: (on: string) => `Quote expired on ${on}`,
    expiredBody:
      "It can no longer be accepted. The partner can send a new version, or you can look for an alternative.",
    declinedTitle: "Declined by the partner",
    rejectedTitle: "You rejected this quote",
    acceptedTitle: "Quote accepted",
    acceptedBody: (v: number, at: string) => `Version v${v} accepted on ${at}.`,
    goToTheOrder: "Go to the order",
    partCancelled: "Part cancelled",
    quoteTitle: (code: string) => `Quote ${code}`,
    currentVersion: (n: number) => `current version v${n}`,
    draftV: (n: number) => `Machina draft (v${n})`,
    linesV: (n: number) => `Quote lines (v${n})`,
    partnerNote: "Partner's note",
    conditionsNotes: "Conditions and notes",
    toCheck: "To check",
    versions: "Versions",
    yourDecision: "Your decision",
    partialPricing: " · partial, some lines still to price",
    validUntilLocks: (until: React.ReactNode) => (
      <>Valid until {until}. Accepting locks the price and creates the order.</>
    ),
    acceptQuote: "Accept quote",
    reject: "Reject",
    waitingFor: (partner: string) =>
      `Waiting for ${partner} to confirm availability and send the final price.`,
    cancelPartTitle: "Cancel this part?",
    cancelPartBody:
      "The partner no longer needs to check it. The other parts of the request don't change.",
    cancelPart: "Cancel part",
    cancelThisPart: "Cancel this part of the request",
    periodSite: "Period and site",
    period: "Period",
    acceptedToast: "Quote accepted: order confirmed",
    acceptTitle: (code: string, v: number) => `Accept quote ${code} v${v}`,
    net: "Net",
    vat: (rate: number) => `VAT ${rate}%`,
    total: "Total",
    acceptTerms:
      "I have checked the lines, conditions and period. I accept the quote: the price will be locked and the order created.",
    notPayment:
      "A confirmed order is not a payment: you pay the rental company under the agreed terms.",
    confirmAcceptance: "Confirm acceptance",
    rejectedToast: "Quote rejected",
    rejectTitle: "Reject quote",
    rejectReason: "Reason (optional, visible to the partner)",
  },
  it: {
    requests: "Richieste",
    requestTitle: (code: string) => `Richiesta ${code}`,
    createdOn: (at: string) => `Creata il ${at}`,
    viaAssistant: "preparata con l'assistente",
    direct: "ricerca diretta",
    notConfirmedYet:
      "Il progetto nel suo insieme non è confermato finché tutte le parti non sono state accettate.",
    eachPartner: "Ogni noleggiatore vede e gestisce solo le proprie righe.",
    parts: "Parti della richiesta",
    draft: "Bozza Machina",
    quoteV: (n: number) => `Preventivo v${n}`,
    plusVat: "+ IVA",
    partial: "parziale",
    validUntil: "valido fino al",
    reason: (r: string) => `Motivo: ${r}`,
    goToOrder: "Vai all'ordine",
    findAlternative: "Trova un'alternativa",
    reviewQuote: "Valuta il preventivo",
    details: "Dettagli",
    siteNeeds: "Cantiere ed esigenze",
    history: "Cronologia",
    awaitingTitle: "In attesa del noleggiatore",
    awaitingBody:
      "Questa è la bozza preparata da Machina con le tariffe del catalogo. Il noleggiatore deve verificare disponibilità e condizioni: il totale non è ancora definitivo.",
    sentTitle: (until: string) => `Preventivo finale da accettare entro il ${until}`,
    sentBody:
      "Il noleggiatore ha verificato disponibilità e condizioni. Accettando blocchi il prezzo e crei l'ordine confermato.",
    expiredTitle: (on: string) => `Preventivo scaduto il ${on}`,
    expiredBody:
      "Non può più essere accettato. Il noleggiatore può inviare una nuova versione, oppure puoi cercare un'alternativa.",
    declinedTitle: "Rifiutato dal noleggiatore",
    rejectedTitle: "Hai rifiutato questo preventivo",
    acceptedTitle: "Preventivo accettato",
    acceptedBody: (v: number, at: string) => `Versione v${v} accettata il ${at}.`,
    goToTheOrder: "Vai all'ordine",
    partCancelled: "Parte annullata",
    quoteTitle: (code: string) => `Preventivo ${code}`,
    currentVersion: (n: number) => `versione attuale v${n}`,
    draftV: (n: number) => `Bozza Machina (v${n})`,
    linesV: (n: number) => `Righe del preventivo (v${n})`,
    partnerNote: "Nota del noleggiatore",
    conditionsNotes: "Condizioni e note",
    toCheck: "Da verificare",
    versions: "Versioni",
    yourDecision: "La tua decisione",
    partialPricing: " · parziale, alcune righe sono ancora da quotare",
    validUntilLocks: (until: React.ReactNode) => (
      <>Valido fino al {until}. Accettando blocchi il prezzo e crei l&apos;ordine.</>
    ),
    acceptQuote: "Accetta il preventivo",
    reject: "Rifiuta",
    waitingFor: (partner: string) =>
      `In attesa che ${partner} confermi la disponibilità e invii il prezzo finale.`,
    cancelPartTitle: "Annullare questa parte?",
    cancelPartBody:
      "Il noleggiatore non dovrà più verificarla. Le altre parti della richiesta non cambiano.",
    cancelPart: "Annulla la parte",
    cancelThisPart: "Annulla questa parte della richiesta",
    periodSite: "Periodo e cantiere",
    period: "Periodo",
    acceptedToast: "Preventivo accettato: ordine confermato",
    acceptTitle: (code: string, v: number) => `Accetta il preventivo ${code} v${v}`,
    net: "Imponibile",
    vat: (rate: number) => `IVA ${rate}%`,
    total: "Totale",
    acceptTerms:
      "Ho verificato righe, condizioni e periodo. Accetto il preventivo: il prezzo sarà bloccato e l'ordine creato.",
    notPayment:
      "Un ordine confermato non è un pagamento: paghi il noleggiatore secondo le condizioni concordate.",
    confirmAcceptance: "Conferma l'accettazione",
    rejectedToast: "Preventivo rifiutato",
    rejectTitle: "Rifiuta il preventivo",
    rejectReason: "Motivo (facoltativo, visibile al noleggiatore)",
  },
})

function Progress({ ov }: { ov: RequestOverview }) {
  const c = ov.counts
  const segs: [number, string][] = [
    [c.accepted ?? 0, "bg-ok"],
    [c.sent ?? 0, "bg-primary"],
    [c.awaiting_partner ?? 0, "bg-ink/35"],
    [
      (c.declined_by_partner ?? 0) +
        (c.rejected_by_client ?? 0) +
        (c.expired ?? 0) +
        (c.withdrawn ?? 0),
      "bg-border-strong",
    ],
  ]
  return (
    <div
      className="bg-muted flex h-2 overflow-hidden rounded-full"
      role="img"
      aria-label={ov.label}
    >
      {segs.map(([n, cls], i) => n > 0 && <i key={i} className={cls} style={{ flex: n }} />)}
    </div>
  )
}

export function BuyerRequestDetail({ id }: { id: string }) {
  const t = useMessages(M)
  const { date, dateTime, eur } = useFormat()
  const meta = useMeta().data
  const q = useQuery({
    queryKey: ["buyer", "request", id],
    queryFn: () => api.get<RequestDetail>(`/api/client/requests/${id}`),
  })
  const accName = (a: string) => meta?.accessories.find((x) => x.id === a)?.name ?? a
  return (
    <QueryView query={q}>
      {(r) => {
        const ov = r.overview
        return (
          <>
            <Crumbs items={[[t.requests, "/buyer/requests"], [r.code]]} />
            <h1 className="mb-1">{t.requestTitle(r.code)}</h1>
            <Small className="mb-4">
              {t.createdOn(dateTime(r.createdAt))} ·{" "}
              {r.source === "assistant" ? t.viaAssistant : t.direct} · {date(r.period.from)} →{" "}
              {date(r.period.to)}
            </Small>
            <Alert
              tone={ov.status === "confirmed" ? "ok" : ov.status === "closed" ? "neutral" : "warn"}
              className="mb-3"
              title={ov.label}
            >
              {ov.status !== "confirmed" && ov.accepted ? t.notConfirmedYet : t.eachPartner}
            </Alert>
            <Progress ov={ov} />
            <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div>
                <h2>{t.parts}</h2>
                <div className="space-y-3">
                  {r.quotes.map((qt) => {
                    const v = qt.versions[qt.versions.length - 1]
                    const alt =
                      qt.status === "declined_by_partner" ||
                      qt.status === "expired" ||
                      qt.status === "rejected_by_client"
                    return (
                      <Card
                        key={qt.id}
                        flat
                        className="flex flex-wrap items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <b>{qt.partnerName}</b>
                            <StatusBadge kind="quote" status={qt.status} />
                          </div>
                          <Small>
                            {qt.code} ·{" "}
                            {qt.items
                              .map(
                                (i) =>
                                  `${i.label}${i.qty > 1 ? ` ×${i.qty}` : ""}${i.accessoryIds.length ? ` + ${i.accessoryIds.map(accName).join(", ")}` : ""}`
                              )
                              .join(" · ")}
                          </Small>
                          <div className="text-sm">
                            {v.kind === "draft" ? t.draft : t.quoteV(v.n)}:{" "}
                            <b>{eur(v.totals.net)}</b> {t.plusVat}{" "}
                            {!v.totals.complete && <Badge tone="warn">{t.partial}</Badge>}
                            {v.validUntil && qt.status === "sent" && (
                              <>
                                {" "}
                                · {t.validUntil} <b>{date(v.validUntil)}</b>
                              </>
                            )}
                          </div>
                          {qt.declineReason && (
                            <div className="text-bad text-sm">{t.reason(qt.declineReason)}</div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {qt.orderId && (
                            <Link
                              href={`/buyer/orders/${qt.orderId}`}
                              className={buttonVariants({ size: "sm", variant: "ok" })}
                            >
                              {t.goToOrder}
                            </Link>
                          )}
                          {alt && (
                            <Link
                              href={`/models/${qt.items[0].modelId}`}
                              className={buttonVariants({ size: "sm" })}
                            >
                              {t.findAlternative}
                            </Link>
                          )}
                          <Link
                            href={`/buyer/quotes/${qt.id}`}
                            className={buttonVariants({
                              size: "sm",
                              variant: qt.status === "sent" ? "primary" : "default",
                            })}
                          >
                            {qt.status === "sent" ? t.reviewQuote : t.details}
                          </Link>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
              <aside className="space-y-4">
                <Card>
                  <h3>{t.siteNeeds}</h3>
                  <SiteBlock site={r.site} needs={r.needs} job={r.jobDescription} />
                </Card>
                <Card>
                  <h3>{t.history}</h3>
                  <Timeline entries={r.history} />
                </Card>
              </aside>
            </div>
          </>
        )
      }}
    </QueryView>
  )
}

function QuoteBanner({ q }: { q: Quote }) {
  const t = useMessages(M)
  const { date, dateTime } = useFormat()
  const v = q.versions[q.versions.length - 1]
  switch (q.status) {
    case "awaiting_partner":
      return (
        <Alert tone="warn" title={t.awaitingTitle}>
          {t.awaitingBody}
        </Alert>
      )
    case "sent":
      return (
        <Alert tone="info" title={t.sentTitle(date(v.validUntil))}>
          {t.sentBody}
        </Alert>
      )
    case "expired":
      return (
        <Alert tone="bad" title={t.expiredTitle(date(v.validUntil))}>
          {t.expiredBody}
        </Alert>
      )
    case "declined_by_partner":
      return (
        <Alert tone="bad" title={t.declinedTitle}>
          {q.declineReason}
        </Alert>
      )
    case "rejected_by_client":
      return <Alert title={t.rejectedTitle}>{q.rejectReason}</Alert>
    case "accepted":
      return (
        <Alert tone="ok" title={t.acceptedTitle}>
          {t.acceptedBody(q.acceptedVersion ?? 0, dateTime(q.acceptance?.at))}{" "}
          <Link href={`/buyer/orders/${q.orderId}`}>{t.goToTheOrder} →</Link>
        </Alert>
      )
    default:
      return null
  }
}

export function BuyerQuoteDetail({ id }: { id: string }) {
  const t = useMessages(M)
  const { date, eur } = useFormat()
  const router = useRouter()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const key = ["buyer", "quote", id]
  const q = useQuery({ queryKey: key, queryFn: () => api.get<Quote>(`/api/client/quotes/${id}`) })
  const [dialog, setDialog] = useState<"accept" | "reject" | null>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: ["buyer"] })

  const withdraw = useMutation({
    mutationFn: () => api.post(`/api/client/quotes/${id}/withdraw`),
    onSuccess: () => {
      toast.success(t.partCancelled)
      void refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <QueryView query={q}>
      {(qt) => {
        const v = qt.versions[qt.versions.length - 1]
        return (
          <>
            <Crumbs
              items={[
                [t.requests, "/buyer/requests"],
                [qt.requestCode, `/buyer/requests/${qt.requestId}`],
                [qt.code],
              ]}
            />
            <h1 className="mb-1.5">{t.quoteTitle(qt.code)}</h1>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge kind="quote" status={qt.status} />
              <span className="text-muted-foreground text-sm">
                {qt.partnerName} · {t.currentVersion(v.n)}
              </span>
            </div>
            <QuoteBanner q={qt} />
            <div className="mt-3 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                <Card>
                  <h3>{v.kind === "draft" ? t.draftV(v.n) : t.linesV(v.n)}</h3>
                  <LinesTable lines={v.lines} totals={v.totals} />
                  {v.note && (
                    <Alert size="sm" className="mt-3" title={t.partnerNote}>
                      {v.note}
                    </Alert>
                  )}
                  {v.info.length > 0 && (
                    <details open className="mt-2.5 text-sm">
                      <summary className="cursor-pointer">{t.conditionsNotes}</summary>
                      <MarkList className="mt-1" items={v.info} />
                    </details>
                  )}
                  {v.warnings.length > 0 && (
                    <Alert tone="warn" size="sm" className="mt-2.5" title={t.toCheck}>
                      <MarkList items={v.warnings} />
                    </Alert>
                  )}
                </Card>
                <Card>
                  <h3>{t.versions}</h3>
                  <VersionsList quote={qt} />
                </Card>
                <Card>
                  <h3>{t.history}</h3>
                  <Timeline entries={qt.history} />
                </Card>
              </div>
              <aside className="space-y-4 lg:sticky lg:top-[88px]">
                <Card className={qt.status === "sent" ? "ring-primary/25 ring-2" : undefined}>
                  <div className="eyebrow mb-1">
                    {qt.status === "sent"
                      ? t.yourDecision
                      : v.kind === "draft"
                        ? t.draft
                        : t.quoteV(v.n)}
                  </div>
                  <div className="text-[2rem] leading-none font-bold">{eur(v.totals.gross)}</div>
                  <Small className="mt-1.5">
                    {eur(v.totals.net)} {t.plusVat} {v.totals.vatRate}%
                    {!v.totals.complete && t.partialPricing}
                  </Small>
                  {qt.status === "sent" && v.validUntil && (
                    <p className="mt-3 mb-0 text-sm">
                      {t.validUntilLocks(<b>{date(v.validUntil)}</b>)}
                    </p>
                  )}
                  {qt.status === "sent" && (
                    <div className="mt-4 grid gap-2">
                      <Button variant="ok" size="lg" block onClick={() => setDialog("accept")}>
                        {t.acceptQuote}
                      </Button>
                      <Button variant="danger" block onClick={() => setDialog("reject")}>
                        {t.reject}
                      </Button>
                    </div>
                  )}
                  {qt.status === "awaiting_partner" && (
                    <>
                      <p className="text-muted-foreground mt-3 mb-3 text-sm">
                        {t.waitingFor(qt.partnerName)}
                      </p>
                      <Button
                        variant="danger"
                        block
                        disabled={withdraw.isPending}
                        onClick={async () => {
                          const ok = await confirm({
                            title: t.cancelPartTitle,
                            body: t.cancelPartBody,
                            confirmLabel: t.cancelPart,
                            danger: true,
                          })
                          if (ok) withdraw.mutate()
                        }}
                      >
                        {t.cancelThisPart}
                      </Button>
                    </>
                  )}
                  {qt.orderId && (
                    <Link
                      href={`/buyer/orders/${qt.orderId}`}
                      className={buttonVariants({
                        variant: "primary",
                        block: true,
                        className: "mt-4",
                      })}
                    >
                      {t.goToTheOrder}
                    </Link>
                  )}
                </Card>
                <Card>
                  <h3>{t.periodSite}</h3>
                  <KV
                    className="mb-1.5"
                    items={[[t.period, `${date(qt.period.from)} → ${date(qt.period.to)}`]]}
                  />
                  <SiteBlock site={qt.site} needs={qt.needs} />
                </Card>
              </aside>
            </div>
            {dialog === "accept" && (
              <AcceptDialog
                quote={qt}
                onClose={() => setDialog(null)}
                onAccepted={(orderId) => {
                  void refresh()
                  router.push(`/buyer/orders/${orderId}`)
                }}
                onConflict={() => {
                  setDialog(null)
                  void refresh()
                }}
              />
            )}
            {dialog === "reject" && (
              <RejectDialog id={id} onClose={() => setDialog(null)} onDone={() => void refresh()} />
            )}
          </>
        )
      }}
    </QueryView>
  )
}

function AcceptDialog({
  quote: q,
  onClose,
  onAccepted,
  onConflict,
}: {
  quote: Quote
  onClose: () => void
  onAccepted: (orderId: string) => void
  onConflict: () => void
}) {
  const t = useMessages(M)
  const c = useCommon()
  const { eur } = useFormat()
  const v = q.versions[q.versions.length - 1]
  const [terms, setTerms] = useState(false)
  const accept = useMutation({
    mutationFn: () =>
      api.post<{ orderId: string }>(`/api/client/quotes/${q.id}/accept`, {
        version: v.n,
        acceptTerms: terms,
      }),
    onSuccess: (r) => {
      toast.success(t.acceptedToast)
      onAccepted(r.orderId)
    },
    onError: (err) => {
      // 409: the quote changed meanwhile (new version, expired): reload it.
      if (err instanceof ApiError && err.status === 409) {
        toast.error(err.message)
        onConflict()
      }
    },
  })
  const fieldError = accept.error instanceof ApiError ? accept.error.fields.acceptTerms : undefined
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={t.acceptTitle(q.code, v.n)}>
      <table className="w-full text-[0.95rem]">
        <tbody>
          <tr>
            <td className="py-1">{t.net}</td>
            <td className="py-1 text-right tabular-nums">{eur(v.totals.net)}</td>
          </tr>
          <tr>
            <td className="py-1">{t.vat(v.totals.vatRate)}</td>
            <td className="py-1 text-right tabular-nums">{eur(v.totals.vat)}</td>
          </tr>
          <tr className="border-foreground border-t-2 font-bold">
            <td className="pt-2">{t.total}</td>
            <td className="pt-2 text-right tabular-nums">{eur(v.totals.gross)}</td>
          </tr>
        </tbody>
      </table>
      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault()
          accept.mutate()
        }}
      >
        <Field label="" error={fieldError}>
          <Check
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            label={t.acceptTerms}
          />
        </Field>
        <Small>{t.notPayment}</Small>
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="ok" disabled={accept.isPending}>
            {t.confirmAcceptance}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

function RejectDialog({
  id,
  onClose,
  onDone,
}: {
  id: string
  onClose: () => void
  onDone: () => void
}) {
  const t = useMessages(M)
  const c = useCommon()
  const [reason, setReason] = useState("")
  const reject = useMutation({
    mutationFn: () => api.post(`/api/client/quotes/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success(t.rejectedToast)
      onDone()
      onClose()
    },
    onError: (err) => toast.error(err.message),
  })
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={t.rejectTitle}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          reject.mutate()
        }}
      >
        <Field label={t.rejectReason} htmlFor="rej-reason">
          <Textarea id="rej-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="danger" disabled={reject.isPending}>
            {t.rejectTitle}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
