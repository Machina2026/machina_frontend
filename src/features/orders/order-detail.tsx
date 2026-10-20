"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm"
import { Crumbs, KV, MarkList, Small } from "@/components/app/bits"
import { SiteBlock, Timeline } from "@/components/app/details"
import { LinesTable } from "@/components/app/lines-table"
import { QueryView } from "@/components/app/query-view"
import { StatusBadge } from "@/components/app/status-badge"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardHead } from "@/components/ui/card"
import { api, downloadFile } from "@/lib/machina/api"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { useLabels } from "@/lib/machina/labels"
import type { OrderChange, OrderCharge, OrderView, Role } from "@/lib/machina/types"

import {
  ChargeDialog,
  ChargeReviseDialog,
  ClientChangeDialog,
  ConfirmPaymentDialog,
  DeclarePaymentDialog,
  InvoiceDialog,
  PartnerChangeDialog,
  ReasonDialog,
  type Submit,
  usePaymentMethodLabel,
} from "./order-dialogs"

type Dialog =
  | { kind: "change" }
  | { kind: "price-change"; change: OrderChange }
  | { kind: "decline-change"; change: OrderChange }
  | { kind: "reject-change"; change: OrderChange }
  | { kind: "dispute-charge"; charge: OrderCharge }
  | { kind: "charge" }
  | { kind: "revise-charge"; charge: OrderCharge }
  | { kind: "invoice" }
  | { kind: "declare-payment" }
  | { kind: "confirm-payment" }

const M = defineMessages({
  en: {
    markDelivered: "Mark machines delivered",
    markCompleted: "Mark rental completed",
    updateStatus: "Update the status?",
    statusUpdated: "Status updated",
    orders: "Orders",
    orderTitle: (code: string) => `Order ${code}`,
    invoiceUploaded: "Invoice uploaded",
    invoiceNotUploaded: "Invoice not uploaded",
    rentalCompany: "Rental company",
    customer: "Customer",
    request: "Request",
    quote: "Quote",
    periodSite: "Period and site",
    period: "Period",
    extended: (was: string) => `extended (was ${was})`,
    acceptedLines: "Accepted quote lines",
    conditionsNotes: "Conditions and notes",
    rentalChanges: "Rental changes",
    proposeChange: "Propose a change",
    requestChange: "Request a change",
    changesIntro:
      "Extensions, accessories or services added. Only the customer's acceptance updates the agreed total; the original quote and the history stay available.",
    noChanges: "No changes.",
    proposedBy: (who: "client" | "partner") =>
      `proposed by the ${who === "client" ? "customer" : "partner"}`,
    newEnd: "New rental end:",
    previousTotal: "Previous total",
    difference: "Difference",
    plusVat: "+ VAT",
    newTotal: "New total",
    decision: (by: string, at: string) => `Decision: ${by} · ${at}`,
    reason: (r: string) => `Reason: ${r}`,
    afterInvoice:
      "Accepted after the invoice was issued: handle the related tax document separately.",
    acceptChangeTitle: (code: string) => `Accept change ${code}?`,
    acceptChangeBody: (from: React.ReactNode, to: React.ReactNode) => (
      <>
        The agreed total will go from {from} to {to} (VAT included).
      </>
    ),
    newEndDate: "New end date:",
    recorded: "Your acceptance is recorded with your name and the date.",
    acceptChange: "Accept change",
    changeAccepted: "Change accepted: total updated",
    reject: "Reject",
    priceChange: "Price the change",
    dontAccept: "Don't accept",
    extraCharges: "Extra charges",
    recordCharge: "Record a charge",
    chargesIntro:
      "Damage, fuel, extra cleaning. A disputed charge, or one still to review, is not part of the agreed total.",
    noCharges: "No charges.",
    attachments: "Attachments:",
    noAttachments: "No attachments",
    customerNote: "Customer's note",
    chargeHistory: "Charge history",
    acceptChargeTitle: (code: string) => `Accept charge ${code}?`,
    willBeAdded: (amount: React.ReactNode) => <>{amount} will be added to the agreed total.</>,
    acceptCharge: "Accept charge",
    chargeAccepted: "Charge accepted",
    dispute: "Dispute",
    reviseAmount: "Revise amount",
    withdrawTitle: "Withdraw the charge?",
    withdrawBody: "The customer will no longer be asked to pay it.",
    withdraw: "Withdraw",
    chargeWithdrawn: "Charge withdrawn",
    withdrawCharge: "Withdraw charge",
    documents: "Documents",
    uploadInvoice: "Upload final invoice",
    taxAttention: "Attention — tax document",
    draftInvoice: "Draft invoice",
    draftNote: "Not valid for tax purposes · includes accepted lines and approved changes",
    openDraft: "Open draft",
    docTitle: (type: string, number: string, on: string) => `${type} no. ${number} of ${on}`,
    uploadedOn: (at: string, by: string) => `uploaded on ${at} by ${by}`,
    issuedBy:
      "Issued by the rental company with its own software. Uploading to Machina is not a submission to the SdI.",
    download: "Download",
    noInvoicePartner:
      "No invoice uploaded. Issue the invoice with your software and upload it here: the customer will see it.",
    noInvoiceClient: "The rental company has not uploaded the invoice yet.",
    history: "History",
    agreedTotal: "Agreed total",
    acceptedQuote: (v: number) => `Accepted quote (v${v})`,
    acceptedChanges: "Accepted changes",
    acceptedCharges: "Accepted charges",
    agreedNet: "Agreed net",
    vat: (rate: number) => `VAT ${rate}%`,
    notIncluded: "Not included in the total",
    changesToApprove: (amount: string) => `Changes to approve: ${amount} + VAT`,
    chargesToReview: (amount: string) => `Charges to review: ${amount} + VAT`,
    disputedCharges: (amount: string) => `Disputed charges: ${amount} + VAT`,
    priceLocked: (quote: string, v: number, at: string, by: string) =>
      `🔒 Price locked: ${quote} v${v} accepted on ${at} by ${by}.`,
    payment: "Payment",
    paymentIntro:
      "In this MVP the customer pays the rental company directly under the agreed terms. A confirmed order is not a paid order.",
    declaredBy: (amount: React.ReactNode, on: string, method: string) => (
      <>
        Declared by the customer: {amount} on {on} ({method})
      </>
    ),
    confirmedBy: (amount: React.ReactNode, on: string) => (
      <>
        Receipt confirmed by the partner: {amount} on {on}
      </>
    ),
    declarePayment: "Declare payment made",
    confirmReceipt: "Confirm receipt",
    changeSent: "Change sent to the customer for approval",
    requestSent: "Request sent to the partner",
    declineTitle: "Don't accept the change request",
    declineLabel: "Reason (visible to the customer)",
    notAccepted: "Request not accepted",
    rejectTitle: "Reject the change?",
    reasonOptional: "Reason (optional)",
    rejectChange: "Reject change",
    changeRejected: "Change rejected",
    disputeTitle: "Dispute the charge",
    disputeLabel: "Reason for the dispute",
    disputeCharge: "Dispute charge",
    chargeDisputed: "Charge disputed",
    chargeRecorded: "Charge recorded",
    chargeRevised: "Charge revised",
    docUploaded: "Document uploaded and visible to the customer",
    paymentDeclared: "Payment declared",
    receiptConfirmed: "Receipt confirmed",
    attnApprove: (code: string, kind: string, amount: string) =>
      `Approve or reject ${code} (${kind}, ${amount} + VAT)`,
    attnReviewCharge: (code: string, amount: string) => `Review charge ${code} (${amount} + VAT)`,
    attnDeclare: "The invoice is uploaded: declare your payment once made",
    attnPrice: (code: string) => `Price the customer's request ${code}`,
    attnDisputed: (code: string) => `${code} was disputed: revise or withdraw it`,
    attnConfirm: "The customer declared a payment: confirm receipt",
    attnInvoice: "Rental completed: upload the final invoice",
    needsAttention: "Needs your attention",
  },
  it: {
    markDelivered: "Segna le macchine come consegnate",
    markCompleted: "Segna il noleggio come concluso",
    updateStatus: "Aggiornare lo stato?",
    statusUpdated: "Stato aggiornato",
    orders: "Ordini",
    orderTitle: (code: string) => `Ordine ${code}`,
    invoiceUploaded: "Fattura caricata",
    invoiceNotUploaded: "Fattura non caricata",
    rentalCompany: "Noleggiatore",
    customer: "Cliente",
    request: "Richiesta",
    quote: "Preventivo",
    periodSite: "Periodo e cantiere",
    period: "Periodo",
    extended: (was: string) => `prorogato (era ${was})`,
    acceptedLines: "Righe del preventivo accettato",
    conditionsNotes: "Condizioni e note",
    rentalChanges: "Modifiche al noleggio",
    proposeChange: "Proponi una modifica",
    requestChange: "Richiedi una modifica",
    changesIntro:
      "Proroghe, accessori o servizi aggiunti. Solo l'accettazione del cliente aggiorna il totale concordato; il preventivo originale e la cronologia restano disponibili.",
    noChanges: "Nessuna modifica.",
    proposedBy: (who: "client" | "partner") =>
      `proposta dal ${who === "client" ? "cliente" : "noleggiatore"}`,
    newEnd: "Nuova fine del noleggio:",
    previousTotal: "Totale precedente",
    difference: "Differenza",
    plusVat: "+ IVA",
    newTotal: "Nuovo totale",
    decision: (by: string, at: string) => `Decisione: ${by} · ${at}`,
    reason: (r: string) => `Motivo: ${r}`,
    afterInvoice:
      "Accettata dopo l'emissione della fattura: gestisci separatamente il relativo documento fiscale.",
    acceptChangeTitle: (code: string) => `Accettare la modifica ${code}?`,
    acceptChangeBody: (from: React.ReactNode, to: React.ReactNode) => (
      <>
        Il totale concordato passerà da {from} a {to} (IVA inclusa).
      </>
    ),
    newEndDate: "Nuova data di fine:",
    recorded: "La tua accettazione viene registrata con il tuo nome e la data.",
    acceptChange: "Accetta la modifica",
    changeAccepted: "Modifica accettata: totale aggiornato",
    reject: "Rifiuta",
    priceChange: "Quota la modifica",
    dontAccept: "Non accettare",
    extraCharges: "Addebiti extra",
    recordCharge: "Registra un addebito",
    chargesIntro:
      "Danni, carburante, pulizia straordinaria. Un addebito contestato, o ancora da verificare, non fa parte del totale concordato.",
    noCharges: "Nessun addebito.",
    attachments: "Allegati:",
    noAttachments: "Nessun allegato",
    customerNote: "Nota del cliente",
    chargeHistory: "Cronologia dell'addebito",
    acceptChargeTitle: (code: string) => `Accettare l'addebito ${code}?`,
    willBeAdded: (amount: React.ReactNode) => <>{amount} sarà aggiunto al totale concordato.</>,
    acceptCharge: "Accetta l'addebito",
    chargeAccepted: "Addebito accettato",
    dispute: "Contesta",
    reviseAmount: "Rivedi l'importo",
    withdrawTitle: "Ritirare l'addebito?",
    withdrawBody: "Al cliente non sarà più chiesto di pagarlo.",
    withdraw: "Ritira",
    chargeWithdrawn: "Addebito ritirato",
    withdrawCharge: "Ritira l'addebito",
    documents: "Documenti",
    uploadInvoice: "Carica la fattura finale",
    taxAttention: "Attenzione — documento fiscale",
    draftInvoice: "Bozza di fattura",
    draftNote: "Senza valore fiscale · include le righe accettate e le modifiche approvate",
    openDraft: "Apri la bozza",
    docTitle: (type: string, number: string, on: string) => `${type} n. ${number} del ${on}`,
    uploadedOn: (at: string, by: string) => `caricata il ${at} da ${by}`,
    issuedBy:
      "Emessa dal noleggiatore con il proprio gestionale. Il caricamento su Machina non è un invio allo SdI.",
    download: "Scarica",
    noInvoicePartner:
      "Nessuna fattura caricata. Emetti la fattura con il tuo gestionale e caricala qui: il cliente la vedrà.",
    noInvoiceClient: "Il noleggiatore non ha ancora caricato la fattura.",
    history: "Cronologia",
    agreedTotal: "Totale concordato",
    acceptedQuote: (v: number) => `Preventivo accettato (v${v})`,
    acceptedChanges: "Modifiche accettate",
    acceptedCharges: "Addebiti accettati",
    agreedNet: "Imponibile concordato",
    vat: (rate: number) => `IVA ${rate}%`,
    notIncluded: "Non inclusi nel totale",
    changesToApprove: (amount: string) => `Modifiche da approvare: ${amount} + IVA`,
    chargesToReview: (amount: string) => `Addebiti da verificare: ${amount} + IVA`,
    disputedCharges: (amount: string) => `Addebiti contestati: ${amount} + IVA`,
    priceLocked: (quote: string, v: number, at: string, by: string) =>
      `🔒 Prezzo bloccato: ${quote} v${v} accettato il ${at} da ${by}.`,
    payment: "Pagamento",
    paymentIntro:
      "In questo MVP il cliente paga direttamente il noleggiatore secondo le condizioni concordate. Un ordine confermato non è un ordine pagato.",
    declaredBy: (amount: React.ReactNode, on: string, method: string) => (
      <>
        Dichiarato dal cliente: {amount} il {on} ({method})
      </>
    ),
    confirmedBy: (amount: React.ReactNode, on: string) => (
      <>
        Incasso confermato dal noleggiatore: {amount} il {on}
      </>
    ),
    declarePayment: "Dichiara il pagamento effettuato",
    confirmReceipt: "Conferma l'incasso",
    changeSent: "Modifica inviata al cliente per l'approvazione",
    requestSent: "Richiesta inviata al noleggiatore",
    declineTitle: "Non accettare la richiesta di modifica",
    declineLabel: "Motivo (visibile al cliente)",
    notAccepted: "Richiesta non accettata",
    rejectTitle: "Rifiutare la modifica?",
    reasonOptional: "Motivo (facoltativo)",
    rejectChange: "Rifiuta la modifica",
    changeRejected: "Modifica rifiutata",
    disputeTitle: "Contesta l'addebito",
    disputeLabel: "Motivo della contestazione",
    disputeCharge: "Contesta l'addebito",
    chargeDisputed: "Addebito contestato",
    chargeRecorded: "Addebito registrato",
    chargeRevised: "Addebito rivisto",
    docUploaded: "Documento caricato e visibile al cliente",
    paymentDeclared: "Pagamento dichiarato",
    receiptConfirmed: "Incasso confermato",
    attnApprove: (code: string, kind: string, amount: string) =>
      `Approva o rifiuta ${code} (${kind}, ${amount} + IVA)`,
    attnReviewCharge: (code: string, amount: string) =>
      `Verifica l'addebito ${code} (${amount} + IVA)`,
    attnDeclare: "La fattura è caricata: dichiara il pagamento quando l'hai effettuato",
    attnPrice: (code: string) => `Quota la richiesta del cliente ${code}`,
    attnDisputed: (code: string) => `${code} è stato contestato: rivedilo o ritiralo`,
    attnConfirm: "Il cliente ha dichiarato un pagamento: conferma l'incasso",
    attnInvoice: "Noleggio concluso: carica la fattura finale",
    needsAttention: "Richiede la tua attenzione",
  },
})

export const orderKey = (role: Role, id: string) => ["order", role, id] as const

export function OrderDetail({ id, role }: { id: string; role: Role }) {
  const base = role === "client" ? "/api/client/orders/" : "/api/partner/orders/"
  const area = role === "client" ? "/buyer" : "/supplier"
  const t = useMessages(M)
  const L = useLabels()
  const { date, dateTime, eur, num } = useFormat()
  const methodLabel = usePaymentMethodLabel()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const order = useQuery({
    queryKey: orderKey(role, id),
    queryFn: () => api.get<OrderView>(base + id),
  })

  /** POST an order action, then refresh the order and the dashboard counts. */
  const post = async (path: string, body: Record<string, unknown>, success?: string) => {
    const updated = await api.post<OrderView>(base + id + path, body)
    qc.setQueryData(orderKey(role, id), updated)
    void qc.invalidateQueries({ queryKey: orderKey(role, id) })
    void qc.invalidateQueries({ queryKey: [role === "client" ? "buyer" : "supplier"] })
    if (success) toast.success(success)
  }
  const submitTo =
    (path: string, success: string): Submit =>
    (body) =>
      post(path, body, success)
  const quick = async (path: string, body: Record<string, unknown>, success: string) => {
    try {
      await post(path, body, success)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }
  const open = (file: { id: string; name: string }) =>
    downloadFile(file.id, file.name).catch((err) => toast.error(err.message))

  return (
    <QueryView query={order}>
      {(o) => {
        const s = o.summary
        const vatFactor = 1 + s.vatRate / 100
        const prolonged = o.period.to !== o.originalPeriod.to
        const active = o.status === "confirmed" || o.status === "in_progress"

        const statusAction =
          role === "partner" && (o.status === "confirmed" || o.status === "in_progress") ? (
            <Button
              onClick={async () => {
                const next = o.status === "confirmed" ? "in_progress" : "completed"
                const label = next === "in_progress" ? t.markDelivered : t.markCompleted
                if (await confirm({ title: t.updateStatus, body: `${label}.` })) {
                  await quick("/status", { status: next }, t.statusUpdated)
                }
              }}
            >
              {o.status === "confirmed" ? t.markDelivered : t.markCompleted}
            </Button>
          ) : null

        return (
          <>
            <Crumbs items={[[t.orders, `${area}/orders`], [o.code]]} />
            <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="mb-1.5">{t.orderTitle(o.code)}</h1>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge kind="order" status={o.status} />
                  <StatusBadge kind="payment" status={o.payment.status} />
                  {o.invoices.length ? (
                    <Badge tone="ok">{t.invoiceUploaded}</Badge>
                  ) : (
                    <Badge>{t.invoiceNotUploaded}</Badge>
                  )}
                </div>
                <Small className="mt-1.5">
                  {role === "client" ? t.rentalCompany : t.customer}:{" "}
                  <b>{role === "client" ? o.partnerName : o.clientName}</b> · {t.request}{" "}
                  {o.requestCode} · {t.quote} {o.quoteCode}
                </Small>
              </div>
              {statusAction}
            </div>

            <AttentionBanner order={o} role={role} />

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                <Card>
                  <h3>{t.periodSite}</h3>
                  <KV
                    className="mb-1.5"
                    items={[
                      [
                        t.period,
                        <>
                          {date(o.period.from)} → {date(o.period.to)}{" "}
                          {prolonged && (
                            <Badge tone="info">{t.extended(date(o.originalPeriod.to))}</Badge>
                          )}
                        </>,
                      ],
                    ]}
                  />
                  <SiteBlock site={o.site} needs={o.needs} />
                </Card>

                <Card>
                  <h3>{t.acceptedLines}</h3>
                  <LinesTable lines={o.lines} totals={o.baseTotals} />
                  {o.info.length > 0 && (
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer">{t.conditionsNotes}</summary>
                      <MarkList className="mt-1" items={o.info} />
                    </details>
                  )}
                </Card>

                <Card id="changes" className="scroll-mt-24">
                  <CardHead
                    title={t.rentalChanges}
                    actions={
                      active && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setDialog({ kind: "change" })}
                        >
                          {role === "partner" ? t.proposeChange : t.requestChange}
                        </Button>
                      )
                    }
                  />
                  <Small className="mb-3">{t.changesIntro}</Small>
                  {o.changes.length === 0 && <Small>{t.noChanges}</Small>}
                  {[...o.changes].reverse().map((c) => {
                    const diffGross = c.line ? (c.line.amount ?? 0) * vatFactor : 0
                    const prev = c.status === "pending_approval" ? s.agreedGross : c.prevGross
                    const next =
                      c.status === "pending_approval" ? s.agreedGross + diffGross : c.newGross
                    return (
                      <Card key={c.id} flat className="mb-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <b>
                              {c.code} · {L.CHANGE_KIND[c.kind]}
                            </b>{" "}
                            <span className="text-muted-foreground text-sm">
                              {t.proposedBy(c.origin)} · {dateTime(c.createdAt)}
                            </span>
                          </div>
                          <StatusBadge kind="change" status={c.status} />
                        </div>
                        <p className="mt-1.5 mb-0 text-sm">
                          {c.reason}
                          {c.newTo && (
                            <>
                              <br />
                              <b>{t.newEnd}</b> {date(c.newTo)}
                            </>
                          )}
                        </p>
                        {c.line && (
                          <>
                            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                              <div>
                                <span className="text-muted-foreground">{t.previousTotal}</span>
                                <br />
                                <b>{eur(prev)}</b>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t.difference}</span>
                                <br />
                                <b>+ {eur(diffGross)}</b>{" "}
                                <span className="text-faint">
                                  ({eur(c.line.amount)} {t.plusVat})
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t.newTotal}</span>
                                <br />
                                <b>{eur(next)}</b>
                              </div>
                            </div>
                            <Small className="mt-1">
                              {c.line.description} · {num(c.line.qty)} {c.line.unit} ×{" "}
                              {eur(c.line.unitPrice)}
                            </Small>
                          </>
                        )}
                        {c.decidedAt && (
                          <Small className="text-faint mt-1">
                            {t.decision(c.decidedBy ?? "", dateTime(c.decidedAt))}
                            {c.rejectReason && ` — ${c.rejectReason}`}
                          </Small>
                        )}
                        {c.declineReason && (
                          <Small className="text-faint">{t.reason(c.declineReason)}</Small>
                        )}
                        {role === "partner" && c.invoiceNotice && (
                          <Alert tone="warn" size="sm" className="mt-2">
                            {t.afterInvoice}
                          </Alert>
                        )}
                        {role === "client" && c.status === "pending_approval" && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <Button
                              variant="ok"
                              onClick={async () => {
                                const ok = await confirm({
                                  title: t.acceptChangeTitle(c.code),
                                  body: (
                                    <p>
                                      {t.acceptChangeBody(
                                        <b>{eur(s.agreedGross)}</b>,
                                        <b>{eur(s.agreedGross + diffGross)}</b>
                                      )}
                                      {c.newTo && (
                                        <>
                                          <br />
                                          {t.newEndDate} <b>{date(c.newTo)}</b>.
                                        </>
                                      )}
                                      <br />
                                      <span className="text-muted-foreground text-sm">
                                        {t.recorded}
                                      </span>
                                    </p>
                                  ),
                                  confirmLabel: t.acceptChange,
                                })
                                if (ok) await quick(`/changes/${c.id}/accept`, {}, t.changeAccepted)
                              }}
                            >
                              {t.acceptChange}
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => setDialog({ kind: "reject-change", change: c })}
                            >
                              {t.reject}
                            </Button>
                          </div>
                        )}
                        {role === "partner" && c.status === "requested_by_client" && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <Button
                              variant="primary"
                              onClick={() => setDialog({ kind: "price-change", change: c })}
                            >
                              {t.priceChange}
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => setDialog({ kind: "decline-change", change: c })}
                            >
                              {t.dontAccept}
                            </Button>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </Card>

                <Card id="charges" className="scroll-mt-24">
                  <CardHead
                    title={t.extraCharges}
                    actions={
                      role === "partner" &&
                      o.status !== "cancelled" && (
                        <Button size="sm" onClick={() => setDialog({ kind: "charge" })}>
                          {t.recordCharge}
                        </Button>
                      )
                    }
                  />
                  <Small className="mb-3">{t.chargesIntro}</Small>
                  {o.charges.length === 0 && <Small>{t.noCharges}</Small>}
                  {[...o.charges].reverse().map((c) => (
                    <Card key={c.id} flat className="mb-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <b>
                            {c.code} · {L.CHARGE_KIND[c.kind]}
                          </b>{" "}
                          <span className="text-muted-foreground text-sm">
                            {dateTime(c.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <b>
                            {eur(c.amount)} {t.plusVat}
                          </b>
                          <StatusBadge kind="charge" status={c.status} />
                        </div>
                      </div>
                      <p className="my-1.5 text-sm">{c.description}</p>
                      {c.files?.length ? (
                        <div className="flex flex-wrap gap-2 text-sm">
                          {t.attachments}
                          {c.files.map((f) => (
                            <Button key={f.id} variant="link" onClick={() => open(f)}>
                              {f.name}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <Small className="text-faint">{t.noAttachments}</Small>
                      )}
                      {c.clientNote && (
                        <Alert
                          tone={c.status === "disputed" ? "bad" : "neutral"}
                          size="sm"
                          className="mt-2"
                          title={t.customerNote}
                        >
                          {c.clientNote}
                        </Alert>
                      )}
                      <details className="mt-1.5 text-sm">
                        <summary className="cursor-pointer">{t.chargeHistory}</summary>
                        <div className="mt-2">
                          <Timeline entries={c.log} />
                        </div>
                      </details>
                      {role === "client" && c.status === "pending_review" && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <Button
                            variant="ok"
                            onClick={async () => {
                              const ok = await confirm({
                                title: t.acceptChargeTitle(c.code),
                                body: t.willBeAdded(
                                  <b>
                                    {eur(c.amount)} {t.plusVat}
                                  </b>
                                ),
                                confirmLabel: t.acceptCharge,
                              })
                              if (ok) await quick(`/charges/${c.id}/accept`, {}, t.chargeAccepted)
                            }}
                          >
                            {t.acceptCharge}
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => setDialog({ kind: "dispute-charge", charge: c })}
                          >
                            {t.dispute}
                          </Button>
                        </div>
                      )}
                      {role === "partner" &&
                        (c.status === "disputed" || c.status === "pending_review") && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => setDialog({ kind: "revise-charge", charge: c })}
                            >
                              {t.reviseAmount}
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={async () => {
                                const ok = await confirm({
                                  title: t.withdrawTitle,
                                  body: t.withdrawBody,
                                  confirmLabel: t.withdraw,
                                  danger: true,
                                })
                                if (ok)
                                  await quick(
                                    `/charges/${c.id}`,
                                    { action: "withdraw" },
                                    t.chargeWithdrawn
                                  )
                              }}
                            >
                              {t.withdrawCharge}
                            </Button>
                          </div>
                        )}
                    </Card>
                  ))}
                </Card>

                <Card id="documents" className="scroll-mt-24">
                  <CardHead
                    title={t.documents}
                    actions={
                      role === "partner" &&
                      o.status !== "cancelled" && (
                        <Button size="sm" onClick={() => setDialog({ kind: "invoice" })}>
                          {t.uploadInvoice}
                        </Button>
                      )
                    }
                  />
                  {role === "partner" &&
                    o.notices.map((n, i) => (
                      <Alert key={i} tone="warn" size="sm" className="mb-2" title={t.taxAttention}>
                        {n.text}
                      </Alert>
                    ))}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
                    <div>
                      <b>{t.draftInvoice}</b>
                      <Small>{t.draftNote}</Small>
                    </div>
                    <Link
                      href={`${area}/orders/${o.id}/draft-invoice`}
                      className={buttonVariants({ size: "sm" })}
                    >
                      {t.openDraft}
                    </Link>
                  </div>
                  {o.invoices.length ? (
                    o.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-b-0"
                      >
                        <div>
                          <b>{t.docTitle(L.DOC_TYPE[inv.docType], inv.number, date(inv.date))}</b>
                          <Small>
                            {eur(inv.amount)} ·{" "}
                            {t.uploadedOn(dateTime(inv.uploadedAt), inv.uploadedBy)}
                            {inv.note && ` · ${inv.note}`}
                          </Small>
                          <Small className="text-faint">{t.issuedBy}</Small>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => open({ id: inv.fileId, name: inv.fileName })}
                        >
                          {t.download}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <Small className="mt-2">
                      {role === "partner" ? t.noInvoicePartner : t.noInvoiceClient}
                    </Small>
                  )}
                </Card>

                <Card>
                  <h3>{t.history}</h3>
                  <Timeline entries={o.history} />
                </Card>
              </div>

              <aside className="space-y-4 xl:sticky xl:top-[88px]">
                <Card>
                  <h3>{t.agreedTotal}</h3>
                  <table className="w-full text-[0.92rem]">
                    <tbody>
                      <tr>
                        <td className="py-1">{t.acceptedQuote(o.acceptedVersion)}</td>
                        <td className="py-1 text-right tabular-nums">{eur(s.baseNet)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">{t.acceptedChanges}</td>
                        <td className="py-1 text-right tabular-nums">
                          {s.changesNet ? "+ " : ""}
                          {eur(s.changesNet)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1">{t.acceptedCharges}</td>
                        <td className="py-1 text-right tabular-nums">
                          {s.chargesNet ? "+ " : ""}
                          {eur(s.chargesNet)}
                        </td>
                      </tr>
                      <tr className="font-semibold">
                        <td className="py-1">{t.agreedNet}</td>
                        <td className="py-1 text-right tabular-nums">{eur(s.agreedNet)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">{t.vat(s.vatRate)}</td>
                        <td className="py-1 text-right tabular-nums">{eur(s.vat)}</td>
                      </tr>
                      <tr className="border-foreground border-t-2 text-[1.05rem] font-bold">
                        <td className="pt-2">{t.agreedTotal}</td>
                        <td className="pt-2 text-right tabular-nums">{eur(s.agreedGross)}</td>
                      </tr>
                    </tbody>
                  </table>
                  {(s.pendingChangesNet > 0 ||
                    s.pendingChargesNet > 0 ||
                    s.contestedChargesNet > 0) && (
                    <Alert size="sm" className="mt-2.5" title={t.notIncluded}>
                      {s.pendingChangesNet > 0 && (
                        <div>{t.changesToApprove(eur(s.pendingChangesNet))}</div>
                      )}
                      {s.pendingChargesNet > 0 && (
                        <div>{t.chargesToReview(eur(s.pendingChargesNet))}</div>
                      )}
                      {s.contestedChargesNet > 0 && (
                        <div>{t.disputedCharges(eur(s.contestedChargesNet))}</div>
                      )}
                    </Alert>
                  )}
                  <Small className="mt-2.5">
                    {t.priceLocked(
                      o.quoteCode,
                      o.acceptedVersion,
                      dateTime(o.acceptance.at),
                      o.acceptance.by
                    )}
                  </Small>
                </Card>

                <Card id="payment" className="scroll-mt-24">
                  <h3>{t.payment}</h3>
                  <Small className="mb-2">{t.paymentIntro}</Small>
                  <div className="mb-2">
                    <StatusBadge kind="payment" status={o.payment.status} />
                  </div>
                  {o.payment.declared && (
                    <p className="text-sm">
                      {t.declaredBy(
                        <b>{eur(o.payment.declared.amount)}</b>,
                        date(o.payment.declared.date),
                        methodLabel(o.payment.declared.method)
                      )}
                      {o.payment.declared.note && (
                        <>
                          <br />
                          {o.payment.declared.note}
                        </>
                      )}
                    </p>
                  )}
                  {o.payment.confirmed && (
                    <p className="text-sm">
                      {t.confirmedBy(
                        <b>{eur(o.payment.confirmed.amount)}</b>,
                        date(o.payment.confirmed.date)
                      )}
                    </p>
                  )}
                  {role === "client" &&
                    o.payment.status === "unpaid" &&
                    o.status !== "cancelled" && (
                      <Button block onClick={() => setDialog({ kind: "declare-payment" })}>
                        {t.declarePayment}
                      </Button>
                    )}
                  {role === "partner" &&
                    o.payment.status !== "received" &&
                    o.status !== "cancelled" && (
                      <Button
                        block
                        variant={o.payment.status === "declared" ? "ok" : "default"}
                        onClick={() => setDialog({ kind: "confirm-payment" })}
                      >
                        {t.confirmReceipt}
                      </Button>
                    )}
                </Card>
              </aside>
            </div>

            {dialog?.kind === "change" &&
              (role === "partner" ? (
                <PartnerChangeDialog
                  order={o}
                  onClose={() => setDialog(null)}
                  submit={submitTo("/changes", t.changeSent)}
                />
              ) : (
                <ClientChangeDialog
                  order={o}
                  onClose={() => setDialog(null)}
                  submit={submitTo("/changes", t.requestSent)}
                />
              ))}
            {dialog?.kind === "price-change" && (
              <PartnerChangeDialog
                order={o}
                existing={dialog.change}
                onClose={() => setDialog(null)}
                submit={submitTo("/changes", t.changeSent)}
              />
            )}
            {dialog?.kind === "decline-change" && (
              <ReasonDialog
                title={t.declineTitle}
                label={t.declineLabel}
                onClose={() => setDialog(null)}
                submit={submitTo(`/changes/${dialog.change.id}/decline`, t.notAccepted)}
              />
            )}
            {dialog?.kind === "reject-change" && (
              <ReasonDialog
                title={t.rejectTitle}
                label={t.reasonOptional}
                optional
                confirmLabel={t.rejectChange}
                onClose={() => setDialog(null)}
                submit={submitTo(`/changes/${dialog.change.id}/reject`, t.changeRejected)}
              />
            )}
            {dialog?.kind === "dispute-charge" && (
              <ReasonDialog
                title={t.disputeTitle}
                label={t.disputeLabel}
                field="note"
                confirmLabel={t.disputeCharge}
                onClose={() => setDialog(null)}
                submit={submitTo(`/charges/${dialog.charge.id}/dispute`, t.chargeDisputed)}
              />
            )}
            {dialog?.kind === "charge" && (
              <ChargeDialog
                onClose={() => setDialog(null)}
                submit={submitTo("/charges", t.chargeRecorded)}
              />
            )}
            {dialog?.kind === "revise-charge" && (
              <ChargeReviseDialog
                charge={dialog.charge}
                onClose={() => setDialog(null)}
                submit={submitTo(`/charges/${dialog.charge.id}`, t.chargeRevised)}
              />
            )}
            {dialog?.kind === "invoice" && (
              <InvoiceDialog
                order={o}
                onClose={() => setDialog(null)}
                submit={submitTo("/invoices", t.docUploaded)}
              />
            )}
            {dialog?.kind === "declare-payment" && (
              <DeclarePaymentDialog
                order={o}
                onClose={() => setDialog(null)}
                submit={submitTo("/payment", t.paymentDeclared)}
              />
            )}
            {dialog?.kind === "confirm-payment" && (
              <ConfirmPaymentDialog
                order={o}
                onClose={() => setDialog(null)}
                submit={submitTo("/payment", t.receiptConfirmed)}
              />
            )}
          </>
        )
      }}
    </QueryView>
  )
}

/** What this user has to do on the order, each linking to its section. */
function AttentionBanner({ order: o, role }: { order: OrderView; role: Role }) {
  const t = useMessages(M)
  const L = useLabels()
  const { eur } = useFormat()
  const items: { text: string; href: string }[] = []
  if (role === "client") {
    for (const ch of o.changes) {
      if (ch.status === "pending_approval")
        items.push({
          text: t.attnApprove(
            ch.code,
            L.CHANGE_KIND[ch.kind].toLowerCase(),
            eur(ch.line?.amount ?? 0)
          ),
          href: "#changes",
        })
    }
    for (const ch of o.charges) {
      if (ch.status === "pending_review")
        items.push({ text: t.attnReviewCharge(ch.code, eur(ch.amount)), href: "#charges" })
    }
    if (o.payment.status === "unpaid" && o.invoices.length)
      items.push({
        text: t.attnDeclare,
        href: "#payment",
      })
  } else {
    for (const ch of o.changes) {
      if (ch.status === "requested_by_client")
        items.push({ text: t.attnPrice(ch.code), href: "#changes" })
    }
    for (const ch of o.charges) {
      if (ch.status === "disputed") items.push({ text: t.attnDisputed(ch.code), href: "#charges" })
    }
    if (o.payment.status === "declared") items.push({ text: t.attnConfirm, href: "#payment" })
    if (o.status === "completed" && !o.invoices.length)
      items.push({ text: t.attnInvoice, href: "#documents" })
  }
  if (!items.length) return null
  return (
    <div className="bg-primary-soft mb-5 rounded-xl border border-[#f6e2a4] p-4">
      <div className="eyebrow mb-2">{t.needsAttention}</div>
      <ul className="m-0 list-none space-y-1.5 p-0">
        {items.map((i) => (
          <li key={i.text}>
            <a
              href={i.href}
              className="text-foreground hover:text-brand inline-flex items-center gap-2 font-medium no-underline"
            >
              <span aria-hidden className="bg-primary size-1.5 rounded-full" />
              {i.text} →
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
