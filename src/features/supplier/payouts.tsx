"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { PageHead, Small, TableWrap } from "@/components/app/bits"
import { QueryView } from "@/components/app/query-view"
import { Alert } from "@/components/ui/alert"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ITEM_TONE, PAYMENT_TEXT } from "@/features/orders/payments"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { api } from "@/lib/machina/api"
import type { PayoutStatus, PayoutsResponse } from "@/lib/machina/types"

const STATUS_TONE: Record<PayoutStatus, BadgeTone> = {
  none: "warn",
  onboarding: "info",
  active: "ok",
  restricted: "bad",
}

const M = defineMessages({
  en: {
    title: "Payouts",
    intro:
      "Customers pay Machina; Machina passes each payment on to you, less its commission. Payments go through Stripe, which pays you out to your bank account.",
    status: {
      none: "Not set up",
      onboarding: "Details needed",
      active: "Ready to receive payments",
      restricted: "Paused by Stripe",
    } as Record<PayoutStatus, string>,
    explain: {
      none: "Set up payouts to bill your customers. Until then, their payment requests wait and are sent as soon as you're done.",
      onboarding:
        "Stripe still needs some details about your company and bank account. Continue where you left off.",
      active:
        "Customers receive a payment request when they sign the contract, and for each change or charge they accept. You are paid when they pay.",
      restricted:
        "Stripe needs more information before it can send you payments. Open the setup to see what's missing.",
    } as Record<PayoutStatus, string>,
    setUp: "Set up payouts with Stripe",
    continue: "Continue with Stripe",
    update: "Update details",
    dashboard: "Open Stripe dashboard",
    test: "Test mode: no Stripe keys are configured, so payouts are simulated and no money moves.",
    missing: (n: number) => `${n} detail${n === 1 ? "" : "s"} still requested by Stripe.`,
    waiting: "Waiting to be sent",
    open: "Sent, to be paid",
    paid: "Paid to you",
    payments: "Payment requests",
    none: "No payment requests yet. They start when a customer signs a contract.",
    order: "Order",
    description: "Description",
    due: "Due",
    amount: "Customer pays",
    fee: "Commission",
    payout: "You receive",
    state: "Status",
    ownerOnly: "Only an owner of your company can set up payouts.",
  },
  it: {
    title: "Incassi",
    intro:
      "I clienti pagano Machina; Machina ti versa ogni pagamento, al netto della commissione. I pagamenti passano da Stripe, che li accredita sul tuo conto bancario.",
    status: {
      none: "Non configurati",
      onboarding: "Dati mancanti",
      active: "Pronto a ricevere pagamenti",
      restricted: "Sospesi da Stripe",
    } as Record<PayoutStatus, string>,
    explain: {
      none: "Configura gli incassi per fatturare i tuoi clienti. Fino ad allora le loro richieste di pagamento restano in attesa e partono appena hai finito.",
      onboarding:
        "Stripe ha ancora bisogno di alcuni dati sulla tua azienda e sul conto bancario. Riprendi da dove avevi lasciato.",
      active:
        "I clienti ricevono una richiesta di pagamento quando firmano il contratto, e per ogni variazione o addebito che accettano. Vieni pagato quando pagano.",
      restricted:
        "Stripe ha bisogno di altre informazioni prima di inviarti pagamenti. Apri la configurazione per vedere cosa manca.",
    } as Record<PayoutStatus, string>,
    setUp: "Configura gli incassi con Stripe",
    continue: "Continua con Stripe",
    update: "Aggiorna i dati",
    dashboard: "Apri la dashboard Stripe",
    test: "Modalità di prova: non ci sono chiavi Stripe configurate, quindi gli incassi sono simulati e non si muove denaro.",
    missing: (n: number) =>
      n === 1 ? "1 dato ancora richiesto da Stripe." : `${n} dati ancora richiesti da Stripe.`,
    waiting: "In attesa di invio",
    open: "Inviate, da pagare",
    paid: "Versati a te",
    payments: "Richieste di pagamento",
    none: "Ancora nessuna richiesta di pagamento. Partono quando un cliente firma un contratto.",
    order: "Ordine",
    description: "Descrizione",
    due: "Scadenza",
    amount: "Il cliente paga",
    fee: "Commissione",
    payout: "Ricevi",
    state: "Stato",
    ownerOnly: "Solo un titolare della tua azienda può configurare gli incassi.",
  },
})

export function SupplierPayouts() {
  const t = useMessages(M)
  const P = useMessages(PAYMENT_TEXT)
  const { date, eur } = useFormat()
  const params = useSearchParams()
  // Back from Stripe: ask it for the account's status.
  const refresh = params.get("from") === "stripe" || params.has("retry")
  const q = useQuery({
    queryKey: ["supplier", "payouts", refresh],
    queryFn: () => api.get<PayoutsResponse>(`/api/partner/payouts${refresh ? "?refresh=1" : ""}`),
  })
  const [busy, setBusy] = useState(false)
  const go = async (path: string) => {
    setBusy(true)
    try {
      const { url } = await api.post<{ url: string }>(path)
      window.location.assign(url)
    } catch (err) {
      toast.error(
        (err as { status?: number }).status === 403 ? t.ownerOnly : (err as Error).message
      )
      setBusy(false)
    }
  }
  return (
    <>
      <PageHead title={t.title}>{t.intro}</PageHead>
      <QueryView query={q}>
        {(r) => (
          <>
            {r.provider === "stub" && (
              <Alert tone="warn" className="mb-4">
                {t.test}
              </Alert>
            )}
            <Card className="mb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-[640px]">
                  <Badge tone={STATUS_TONE[r.status]}>{t.status[r.status]}</Badge>
                  <p className="mt-2 mb-0 text-sm">{t.explain[r.status]}</p>
                  {r.due.length > 0 && <Small className="mt-1">{t.missing(r.due.length)}</Small>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status !== "active" && (
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => go("/api/partner/payouts/onboard")}
                    >
                      {r.status === "none"
                        ? t.setUp
                        : r.status === "onboarding"
                          ? t.continue
                          : t.update}
                    </Button>
                  )}
                  {r.status === "active" && r.provider === "stripe" && (
                    <Button disabled={busy} onClick={() => go("/api/partner/payouts/dashboard")}>
                      {t.dashboard}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              {(
                [
                  [t.waiting, r.totals.waiting],
                  [t.open, r.totals.open],
                  [t.paid, r.totals.paid],
                ] as const
              ).map(([label, n]) => (
                <Card key={label}>
                  <Small>{label}</Small>
                  <div className="text-2xl font-bold tabular-nums">{eur(n)}</div>
                </Card>
              ))}
            </div>
            <h2 className="mb-3 text-lg">{t.payments}</h2>
            {r.payments.length === 0 ? (
              <Small>{t.none}</Small>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th>{t.order}</th>
                    <th>{t.description}</th>
                    <th>{t.due}</th>
                    <th className="text-right">{t.amount}</th>
                    <th className="text-right">{t.fee}</th>
                    <th className="text-right">{t.payout}</th>
                    <th>{t.state}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">
                        <Link href={`/supplier/orders/${p.orderId}#payment`}>{p.orderCode}</Link>
                      </td>
                      <td>
                        {P.kind[p.kind]}
                        <Small>{p.description}</Small>
                      </td>
                      <td className="whitespace-nowrap">{date(p.dueDate)}</td>
                      <td className="text-right tabular-nums">{eur(p.gross)}</td>
                      <td className="text-right tabular-nums">{eur(p.fee)}</td>
                      <td className="text-right font-semibold tabular-nums">{eur(p.payout)}</td>
                      <td>
                        <Badge tone={ITEM_TONE[p.status]}>{P.item[p.status]}</Badge>
                        {p.test && <Small>{P.test}</Small>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </>
        )}
      </QueryView>
    </>
  )
}
