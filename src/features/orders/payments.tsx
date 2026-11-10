"use client"

import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { Small } from "@/components/app/bits"
import { StatusBadge } from "@/components/app/status-badge"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { api } from "@/lib/machina/api"
import type { OrderView, PaymentItem, PaymentItemStatus, Viewer } from "@/lib/machina/types"

import { ReasonDialog } from "./order-dialogs"

export const ITEM_TONE: Record<PaymentItemStatus, BadgeTone> = {
  pending: "info",
  open: "warn",
  overdue: "bad",
  paid: "ok",
  void: "neutral",
  uncollectible: "bad",
  refunded: "neutral",
}

export const PAYMENT_TEXT = defineMessages({
  en: {
    item: {
      pending: "Not issued yet",
      open: "To pay",
      overdue: "Overdue",
      paid: "Paid",
      void: "Cancelled",
      uncollectible: "Uncollectible",
      refunded: "Refunded",
    } as Record<PaymentItemStatus, string>,
    kind: { rental: "Rental", change: "Change", charge: "Extra charge" } as Record<
      PaymentItem["kind"],
      string
    >,
    test: "Test payment",
  },
  it: {
    item: {
      pending: "Non ancora emessa",
      open: "Da pagare",
      overdue: "Scaduta",
      paid: "Pagata",
      void: "Annullata",
      uncollectible: "Non riscuotibile",
      refunded: "Rimborsata",
    } as Record<PaymentItemStatus, string>,
    kind: { rental: "Noleggio", change: "Variazione", charge: "Addebito extra" } as Record<
      PaymentItem["kind"],
      string
    >,
    test: "Pagamento di prova",
  },
})

const M = defineMessages({
  en: {
    payment: "Payment",
    introClient:
      "You pay Machina, which passes the money on to the rental company. Each request is due 30 days after you sign the contract, or accept a change or charge.",
    introPartner:
      "The customer pays Machina. The amount, less Machina's commission, is transferred to your payout account once paid.",
    none: "No payment request for this order.",
    due: (on: string) => `due ${on}`,
    paidOn: (on: string) => `paid ${on}`,
    refundedOn: (on: string) => `refunded ${on}`,
    keepIt: "Keep it",
    number: (n: string) => `no. ${n}`,
    pay: "Pay",
    payTest: "Pay (test)",
    paid: "Payment recorded",
    receipt: "Receipt PDF",
    fee: "Commission",
    payout: "You receive",
    payoutAdmin: "To the rental company",
    pendingClient: "Being prepared: you'll be able to pay it here shortly.",
    pendingPartner: "Waiting for your payout account:",
    setUp: "set up payouts",
    introAdmin:
      "The customer pays Machina; Machina keeps the commission and passes the rest to the rental company.",
    pendingAdmin: "Not issued: waiting for the rental company to set up payouts, or for a retry.",
    issueError: (e: string) => `Last attempt to issue it failed: ${e}`,
    closedWhy: (r: string) => `Reason: ${r}`,
    voidAction: "Cancel request",
    refundAction: "Refund",
    voidTitle: "Cancel this payment request?",
    voidBody:
      "The customer will no longer be able to pay it. It is noted in the order's history and the activity log.",
    refundTitle: "Refund this payment in full?",
    refundBody:
      "The whole amount goes back to the customer. The rental company's share and Machina's commission are taken back. It is noted in the order's history and the activity log.",
    reasonLabel: "Reason (visible to the customer and the rental company)",
    voided: "Payment request cancelled",
    refunded: "Payment refunded",
    toPay: "Still to pay",
    paidTotal: "Paid",
    testNote:
      "No payment provider is configured: these requests are test payments, no money moves.",
  },
  it: {
    payment: "Pagamento",
    introClient:
      "Paghi Machina, che versa il denaro al noleggiatore. Ogni richiesta scade 30 giorni dopo la firma del contratto, o l'accettazione di una variazione o di un addebito.",
    introPartner:
      "Il cliente paga Machina. L'importo, al netto della commissione di Machina, viene trasferito sul tuo conto di incasso una volta pagato.",
    none: "Nessuna richiesta di pagamento per questo ordine.",
    due: (on: string) => `scade il ${on}`,
    paidOn: (on: string) => `pagata il ${on}`,
    refundedOn: (on: string) => `rimborsata il ${on}`,
    keepIt: "Lascia com'è",
    number: (n: string) => `n. ${n}`,
    pay: "Paga",
    payTest: "Paga (prova)",
    paid: "Pagamento registrato",
    receipt: "Ricevuta PDF",
    fee: "Commissione",
    payout: "Ricevi",
    payoutAdmin: "Al noleggiatore",
    pendingClient: "In preparazione: a breve potrai pagarla qui.",
    pendingPartner: "In attesa del tuo conto di incasso:",
    setUp: "configura gli incassi",
    introAdmin:
      "Il cliente paga Machina; Machina trattiene la commissione e versa il resto al noleggiatore.",
    pendingAdmin:
      "Non emessa: in attesa che il noleggiatore configuri gli incassi, o di un nuovo tentativo.",
    issueError: (e: string) => `L'ultimo tentativo di emissione è fallito: ${e}`,
    closedWhy: (r: string) => `Motivo: ${r}`,
    voidAction: "Annulla la richiesta",
    refundAction: "Rimborsa",
    voidTitle: "Annullare questa richiesta di pagamento?",
    voidBody:
      "Il cliente non potrà più pagarla. Resta annotata nella cronologia dell'ordine e nel registro attività.",
    refundTitle: "Rimborsare per intero questo pagamento?",
    refundBody:
      "L'intero importo torna al cliente. La quota del noleggiatore e la commissione di Machina vengono riprese. Resta annotato nella cronologia dell'ordine e nel registro attività.",
    reasonLabel: "Motivo (visibile al cliente e al noleggiatore)",
    voided: "Richiesta di pagamento annullata",
    refunded: "Pagamento rimborsato",
    toPay: "Ancora da pagare",
    paidTotal: "Pagato",
    testNote:
      "Nessun fornitore di pagamenti configurato: queste richieste sono pagamenti di prova, non si muove denaro.",
  },
})

export function PaymentCard({
  order: o,
  role,
  queryKey,
}: {
  order: OrderView
  role: Viewer
  queryKey: readonly unknown[]
}) {
  const t = useMessages(M)
  const P = useMessages(PAYMENT_TEXT)
  const { date, eur } = useFormat()
  const qc = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [closing, setClosing] = useState<{ item: PaymentItem; action: "void" | "refund" } | null>(
    null
  )
  const p = o.payment

  const pay = async (item: PaymentItem) => {
    setBusy(item.id)
    try {
      const r = await api.post<{ paid: boolean; url: string | null }>(
        `/api/client/payments/${item.id}/pay`
      )
      if (r.url) {
        window.location.assign(r.url)
        return
      }
      toast.success(t.paid)
      await qc.invalidateQueries({ queryKey })
      void qc.invalidateQueries({ queryKey: ["buyer"] })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card id="payment" className="scroll-mt-24">
      <h3>{t.payment}</h3>
      <Small className="mb-2">
        {role === "client" ? t.introClient : role === "partner" ? t.introPartner : t.introAdmin}
      </Small>
      <div className="mb-2">
        <StatusBadge kind="payment" status={p.status} />
      </div>
      {p.items.length === 0 && <Small>{t.none}</Small>}
      <ul className="m-0 list-none space-y-2.5 p-0">
        {p.items.map((i) => (
          <li key={i.id} className="border-t pt-2.5 first:border-t-0 first:pt-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{P.kind[i.kind]}</div>
                <Small className="break-words">{i.description}</Small>
              </div>
              <b className="tabular-nums">{eur(i.gross)}</b>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
              <Badge tone={ITEM_TONE[i.status]}>{P.item[i.status]}</Badge>
              {i.test && <Badge>{P.test}</Badge>}
              <span className="text-muted-foreground">
                {i.status === "refunded" && i.refundedAt
                  ? t.refundedOn(date(i.refundedAt))
                  : i.status === "paid" && i.paidAt
                    ? t.paidOn(date(i.paidAt))
                    : i.status === "void"
                      ? ""
                      : t.due(date(i.dueDate))}
                {i.number && `${i.status === "void" ? "" : " · "}${t.number(i.number)}`}
              </span>
            </div>
            {role !== "client" && i.fee !== undefined && (
              <Small className="mt-1">
                {t.fee} {eur(i.fee)} · {role === "admin" ? t.payoutAdmin : t.payout}{" "}
                <b>{eur(i.payout)}</b>
              </Small>
            )}
            {i.status === "pending" &&
              (role === "client" ? (
                <Small className="mt-1">{t.pendingClient}</Small>
              ) : role === "admin" ? (
                <Small className="mt-1">{t.pendingAdmin}</Small>
              ) : (
                <Small className="mt-1">
                  {t.pendingPartner} <Link href="/supplier/payouts">{t.setUp}</Link>
                </Small>
              ))}
            {role === "client" && (i.status === "open" || i.status === "overdue") && (
              <Button
                block
                className="mt-2"
                variant={i.status === "overdue" ? "danger" : "ok"}
                disabled={busy === i.id}
                onClick={() => pay(i)}
              >
                {i.test ? t.payTest : t.pay} {eur(i.gross)}
              </Button>
            )}
            {i.closedReason && (
              <Small className="mt-1 break-words">{t.closedWhy(i.closedReason)}</Small>
            )}
            {role === "admin" &&
              (i.status === "pending" ||
                i.status === "open" ||
                i.status === "overdue" ||
                i.status === "paid") && (
                <Button
                  size="sm"
                  variant="danger"
                  className="mt-2"
                  onClick={() =>
                    setClosing({ item: i, action: i.status === "paid" ? "refund" : "void" })
                  }
                >
                  {i.status === "paid" ? t.refundAction : t.voidAction}
                </Button>
              )}
            {i.issueError && (
              <Small className="text-bad mt-1 break-words">{t.issueError(i.issueError)}</Small>
            )}
            {role !== "partner" && i.pdfUrl && (
              <a
                href={i.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm"
              >
                {t.receipt}
              </a>
            )}
          </li>
        ))}
      </ul>
      {p.items.length > 0 && (
        <table className="mt-3 w-full border-t text-sm">
          <tbody>
            <tr>
              <td className="pt-2">{t.toPay}</td>
              <td className="pt-2 text-right font-semibold tabular-nums">{eur(p.dueGross)}</td>
            </tr>
            <tr>
              <td>{t.paidTotal}</td>
              <td className="text-right tabular-nums">{eur(p.paidGross)}</td>
            </tr>
          </tbody>
        </table>
      )}
      {p.items.some((i) => i.test) && <Small className="text-faint mt-2">{t.testNote}</Small>}
      {closing && (
        <ReasonDialog
          title={closing.action === "refund" ? t.refundTitle : t.voidTitle}
          description={closing.action === "refund" ? t.refundBody : t.voidBody}
          label={t.reasonLabel}
          confirmLabel={closing.action === "refund" ? t.refundAction : t.voidAction}
          dismissLabel={t.keepIt}
          onClose={() => setClosing(null)}
          submit={async (body) => {
            const updated = await api.post<OrderView>(
              `/api/admin/payments/${closing.item.id}/${closing.action}`,
              body
            )
            qc.setQueryData(queryKey, updated)
            void qc.invalidateQueries({ queryKey: ["admin"] })
            toast.success(closing.action === "refund" ? t.refunded : t.voided)
          }}
        />
      )}
    </Card>
  )
}
