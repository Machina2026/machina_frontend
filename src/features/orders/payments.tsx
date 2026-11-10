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
import type { OrderView, PaymentItem, PaymentItemStatus, Role } from "@/lib/machina/types"

export const ITEM_TONE: Record<PaymentItemStatus, BadgeTone> = {
  pending: "info",
  open: "warn",
  overdue: "bad",
  paid: "ok",
  void: "neutral",
  uncollectible: "bad",
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
    number: (n: string) => `no. ${n}`,
    pay: "Pay",
    payTest: "Pay (test)",
    paid: "Payment recorded",
    receipt: "Receipt PDF",
    fee: "Commission",
    payout: "You receive",
    pendingClient: "Being prepared: you'll be able to pay it here shortly.",
    pendingPartner: "Waiting for your payout account:",
    setUp: "set up payouts",
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
    number: (n: string) => `n. ${n}`,
    pay: "Paga",
    payTest: "Paga (prova)",
    paid: "Pagamento registrato",
    receipt: "Ricevuta PDF",
    fee: "Commissione",
    payout: "Ricevi",
    pendingClient: "In preparazione: a breve potrai pagarla qui.",
    pendingPartner: "In attesa del tuo conto di incasso:",
    setUp: "configura gli incassi",
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
  role: Role
  queryKey: readonly unknown[]
}) {
  const t = useMessages(M)
  const P = useMessages(PAYMENT_TEXT)
  const { date, eur } = useFormat()
  const qc = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
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
      <Small className="mb-2">{role === "client" ? t.introClient : t.introPartner}</Small>
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
                {i.status === "paid" && i.paidAt
                  ? t.paidOn(date(i.paidAt))
                  : t.due(date(i.dueDate))}
                {i.number && ` · ${t.number(i.number)}`}
              </span>
            </div>
            {role === "partner" && i.fee !== undefined && (
              <Small className="mt-1">
                {t.fee} {eur(i.fee)} · {t.payout} <b>{eur(i.payout)}</b>
              </Small>
            )}
            {i.status === "pending" &&
              (role === "client" ? (
                <Small className="mt-1">{t.pendingClient}</Small>
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
            {role === "client" && i.pdfUrl && (
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
    </Card>
  )
}
