"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm"
import { Crumbs, KV, Small } from "@/components/app/bits"
import { SiteBlock, Timeline, VersionsList } from "@/components/app/details"
import { LinesTable, TotalsBox } from "@/components/app/lines-table"
import { QueryView } from "@/components/app/query-view"
import { StatusBadge } from "@/components/app/status-badge"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal, ModalActions } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api, ApiError } from "@/lib/machina/api"
import { useFormat, useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages } from "@/i18n/messages"
import { addDays, daysBetween, today } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import { useLabels } from "@/lib/machina/labels"
import type { LineType, Quote } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

/** Editable line: numbers are kept as strings while typing; "" price = still to price. */
type EditLine = {
  id?: string
  type: LineType
  description: string
  qty: string
  unit: string
  unitPrice: string
  note?: string
  itemId?: string | null
}

const EDITABLE = ["awaiting_partner", "sent", "expired"]

const M = defineMessages({
  en: {
    requests: "Requests",
    quoteTitle: (code: string) => `Quote ${code}`,
    requestRef: (client: string, req: string, v: number) => `${client} · request ${req} · v${v}`,
    checkTitle: "Check availability and conditions",
    checkBody:
      "Machina prepared draft v1 with your catalogue rates. Adjust the lines if needed, price the ones still to price and approve, or decline the request.",
    awaitingTitle: "Awaiting the customer",
    awaitingBody: "Every change creates a new version that the customer has to accept.",
    expiredTitle: "Quote expired",
    expiredBody: "You can renew it by sending a new version with a new expiry date.",
    acceptedTitle: "Accepted by the customer",
    priceLocked: "Price locked.",
    goToOrder: "Go to the order →",
    declinedTitle: "Declined by you",
    rejectedTitle: "Rejected by the customer",
    customerRequest: "Customer's request",
    period: "Period",
    periodValue: (from: string, to: string, days: number) => `${from} → ${to} (${days} days)`,
    machinesRequested: "Machines requested",
    delivery: " · delivery",
    collect: " · collect from depot",
    withOperator: " · with operator",
    linesV: (n: number) => `Lines (v${n})`,
    versions: "Versions",
    history: "History",
    approveSend: "Approve and send quote",
    renewSend: "Renew and send new version",
    sendNew: "Send new version",
    sent: "Quote sent to the customer",
    toPriceField: "To price",
    priceEvery: "Price every line that is still to price before approving",
    confirmBody: (net: React.ReactNode, until: React.ReactNode) => (
      <>
        Net {net} + VAT, valid until {until}.
      </>
    ),
    confirmNote:
      "The customer receives the final quote and can accept or reject it. Your approval is recorded with your name and the date.",
    quoteLines: "Quote lines",
    type: "Type",
    description: "Description",
    qty: "Qty",
    quantity: "Quantity",
    unit: "Unit",
    unitPriceEur: "Unit price €",
    unitPrice: "Unit price",
    amount: "Amount",
    toPrice: "to price",
    removeLine: "Remove line",
    flatRate: "flat rate",
    addLine: "+ Add line",
    highlighted: "Highlighted lines are still to price.",
    validUntil: "Quote valid until",
    note: "Note for the customer (conditions, availability)",
    decline: "Decline",
    declined: "Request declined",
    declineTitle: "Decline request",
    reason: "Reason (visible to the customer)",
    reasonPh: "E.g. machine not available in the period",
  },
  it: {
    requests: "Richieste",
    quoteTitle: (code: string) => `Preventivo ${code}`,
    requestRef: (client: string, req: string, v: number) => `${client} · richiesta ${req} · v${v}`,
    checkTitle: "Verifica disponibilità e condizioni",
    checkBody:
      "Machina ha preparato la bozza v1 con le tariffe del tuo catalogo. Adegua le righe se serve, quota quelle ancora da quotare e approva, oppure rifiuta la richiesta.",
    awaitingTitle: "In attesa del cliente",
    awaitingBody: "Ogni modifica crea una nuova versione che il cliente deve accettare.",
    expiredTitle: "Preventivo scaduto",
    expiredBody: "Puoi rinnovarlo inviando una nuova versione con una nuova scadenza.",
    acceptedTitle: "Accettato dal cliente",
    priceLocked: "Prezzo bloccato.",
    goToOrder: "Vai all'ordine →",
    declinedTitle: "Rifiutato da te",
    rejectedTitle: "Rifiutato dal cliente",
    customerRequest: "Richiesta del cliente",
    period: "Periodo",
    periodValue: (from: string, to: string, days: number) => `${from} → ${to} (${days} giorni)`,
    machinesRequested: "Macchine richieste",
    delivery: " · consegna",
    collect: " · ritiro al deposito",
    withOperator: " · con operatore",
    linesV: (n: number) => `Righe (v${n})`,
    versions: "Versioni",
    history: "Cronologia",
    approveSend: "Approva e invia il preventivo",
    renewSend: "Rinnova e invia una nuova versione",
    sendNew: "Invia una nuova versione",
    sent: "Preventivo inviato al cliente",
    toPriceField: "Da quotare",
    priceEvery: "Quota tutte le righe ancora da quotare prima di approvare",
    confirmBody: (net: React.ReactNode, until: React.ReactNode) => (
      <>
        Imponibile {net} + IVA, valido fino al {until}.
      </>
    ),
    confirmNote:
      "Il cliente riceve il preventivo finale e può accettarlo o rifiutarlo. La tua approvazione viene registrata con il tuo nome e la data.",
    quoteLines: "Righe del preventivo",
    type: "Tipo",
    description: "Descrizione",
    qty: "Q.tà",
    quantity: "Quantità",
    unit: "Unità",
    unitPriceEur: "Prezzo unitario €",
    unitPrice: "Prezzo unitario",
    amount: "Importo",
    toPrice: "da quotare",
    removeLine: "Rimuovi la riga",
    flatRate: "forfait",
    addLine: "+ Aggiungi una riga",
    highlighted: "Le righe evidenziate sono ancora da quotare.",
    validUntil: "Preventivo valido fino al",
    note: "Nota per il cliente (condizioni, disponibilità)",
    decline: "Rifiuta",
    declined: "Richiesta rifiutata",
    declineTitle: "Rifiuta la richiesta",
    reason: "Motivo (visibile al cliente)",
    reasonPh: "Es. macchina non disponibile nel periodo",
  },
})

export function SupplierQuoteDetail({ id }: { id: string }) {
  const t = useMessages(M)
  const { date } = useFormat()
  const meta = useMeta().data
  const q = useQuery({
    queryKey: ["supplier", "quote", id],
    queryFn: () => api.get<Quote>(`/api/partner/quotes/${id}`),
  })
  const accName = (a: string) => meta?.accessories.find((x) => x.id === a)?.name ?? a
  return (
    <QueryView query={q}>
      {(qt) => {
        const v = qt.versions[qt.versions.length - 1]
        const editable = EDITABLE.includes(qt.status)
        return (
          <>
            <Crumbs items={[[t.requests, "/supplier/quotes"], [qt.code]]} />
            <h1 className="mb-1.5">{t.quoteTitle(qt.code)}</h1>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge kind="quote" status={qt.status} forPartner />
              <span className="text-muted-foreground text-sm">
                {t.requestRef(qt.clientName, qt.requestCode, v.n)}
              </span>
            </div>
            {qt.status === "awaiting_partner" && (
              <Alert tone="warn" className="mb-3" title={t.checkTitle}>
                {t.checkBody}
              </Alert>
            )}
            {qt.status === "sent" && (
              <Alert tone="info" className="mb-3" title={t.awaitingTitle}>
                {t.awaitingBody}
              </Alert>
            )}
            {qt.status === "expired" && (
              <Alert tone="bad" className="mb-3" title={t.expiredTitle}>
                {t.expiredBody}
              </Alert>
            )}
            {qt.status === "accepted" && (
              <Alert tone="ok" className="mb-3" title={t.acceptedTitle}>
                {t.priceLocked} <Link href={`/supplier/orders/${qt.orderId}`}>{t.goToOrder}</Link>
              </Alert>
            )}
            {qt.declineReason && (
              <Alert tone="bad" className="mb-3" title={t.declinedTitle}>
                {qt.declineReason}
              </Alert>
            )}
            {qt.rejectReason && (
              <Alert className="mb-3" title={t.rejectedTitle}>
                {qt.rejectReason}
              </Alert>
            )}
            {/* Single column: the lines editor needs the full width. */}
            <div className="space-y-4">
              <Card>
                <h3>{t.customerRequest}</h3>
                <KV
                  className="mb-1.5"
                  items={[
                    [
                      t.period,
                      t.periodValue(
                        date(qt.period.from),
                        date(qt.period.to),
                        daysBetween(qt.period.from, qt.period.to)
                      ),
                    ],
                    [
                      t.machinesRequested,
                      <div key="m">
                        {qt.items.map((i) => (
                          <div key={i.id}>
                            {i.label} ×{i.qty}
                            {i.accessoryIds.length > 0 &&
                              ` + ${i.accessoryIds.map(accName).join(", ")}`}
                            {i.transport ? t.delivery : t.collect}
                            {i.operator && t.withOperator}
                          </div>
                        ))}
                      </div>,
                    ],
                  ]}
                />
                <SiteBlock site={qt.site} needs={qt.needs} job={qt.jobDescription} />
              </Card>
              {editable ? (
                <LinesEditor key={qt.currentVersion} quote={qt} />
              ) : (
                <Card>
                  <h3>{t.linesV(v.n)}</h3>
                  <LinesTable lines={v.lines} totals={v.totals} />
                </Card>
              )}
              <Card>
                <h3>{t.versions}</h3>
                <VersionsList quote={qt} />
              </Card>
              <Card>
                <h3>{t.history}</h3>
                <Timeline entries={qt.history} />
              </Card>
            </div>
          </>
        )
      }}
    </QueryView>
  )
}

function LinesEditor({ quote: q }: { quote: Quote }) {
  const t = useMessages(M)
  const L = useLabels()
  const { date, eur } = useFormat()
  const lineTypes = (Object.keys(L.LINE_TYPE) as LineType[]).map(
    (k) => [k, L.LINE_TYPE[k]] as const
  )
  const qc = useQueryClient()
  const confirm = useConfirm()
  const v = q.versions[q.versions.length - 1]
  const [lines, setLines] = useState<EditLine[]>(() =>
    v.lines.map((l) => ({
      id: l.id,
      type: l.type,
      description: l.description,
      qty: String(l.qty),
      unit: l.unit,
      unitPrice: l.unitPrice === null ? "" : String(l.unitPrice),
      note: l.note,
      itemId: l.itemId,
    }))
  )
  const [validUntil, setValidUntil] = useState(
    v.validUntil && v.validUntil >= today() ? v.validUntil : addDays(today(), 7)
  )
  const [note, setNote] = useState("")
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [declining, setDeclining] = useState(false)
  const submitLabel =
    q.status === "awaiting_partner"
      ? t.approveSend
      : q.status === "expired"
        ? t.renewSend
        : t.sendNew

  const revise = useMutation({
    mutationFn: () =>
      api.post<Quote>(`/api/partner/quotes/${q.id}/revise`, {
        lines: lines.map((l) => ({ ...l, qty: l.qty, unitPrice: l.unitPrice })),
        validUntil,
        note,
      }),
    onSuccess: () => {
      toast.success(t.sent)
      void qc.invalidateQueries({ queryKey: ["supplier"] })
    },
    onError: (err) => toast.error(err.message),
  })
  const errors = {
    ...(revise.error instanceof ApiError ? revise.error.fields : {}),
    ...localErrors,
  }

  const amount = (l: EditLine) => (Number(l.qty) || 0) * (Number(l.unitPrice) || 0)
  const net = lines.reduce((s, l) => s + amount(l), 0)
  const missing = lines.filter((l) => l.unitPrice === "").length
  const setLine = (i: number, patch: Partial<EditLine>) =>
    setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const unpriced = Object.fromEntries(
      lines.flatMap((l, i) =>
        l.unitPrice === "" ? [[`lines.${i}.unitPrice`, t.toPriceField]] : []
      )
    )
    setLocalErrors(unpriced)
    if (Object.keys(unpriced).length) return toast.error(t.priceEvery)
    const ok = await confirm({
      title: `${submitLabel}?`,
      body: (
        <>
          <p>{t.confirmBody(<b>{eur(net)}</b>, <b>{date(validUntil)}</b>)}</p>
          <p className="text-muted-foreground text-sm">{t.confirmNote}</p>
        </>
      ),
      confirmLabel: submitLabel,
    })
    if (ok) revise.mutate()
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <h3>{t.quoteLines}</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>{t.type}</th>
                <th>{t.description}</th>
                <th className="num">{t.qty}</th>
                <th>{t.unit}</th>
                <th className="num">{t.unitPriceEur}</th>
                <th className="num">{t.amount}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const priceError = errors[`lines.${i}.unitPrice`]
                return (
                  <tr key={i} className={cn(l.unitPrice === "" && "to-confirm")}>
                    <td className="w-[160px]">
                      <Select
                        aria-label={t.type}
                        value={l.type}
                        onChange={(e) => setLine(i, { type: e.target.value as LineType })}
                        options={lineTypes}
                      />
                    </td>
                    <td>
                      <Input
                        aria-label={t.description}
                        aria-invalid={!!errors[`lines.${i}.description`]}
                        value={l.description}
                        onChange={(e) => setLine(i, { description: e.target.value })}
                      />
                      {l.note && <Small>{l.note}</Small>}
                    </td>
                    <td className="w-[90px]">
                      <Input
                        aria-label={t.quantity}
                        type="number"
                        min={0}
                        step={0.01}
                        value={l.qty}
                        onChange={(e) => setLine(i, { qty: e.target.value })}
                      />
                    </td>
                    <td className="w-[110px]">
                      <Input
                        aria-label={t.unit}
                        value={l.unit}
                        onChange={(e) => setLine(i, { unit: e.target.value })}
                      />
                    </td>
                    <td className="w-[130px]">
                      <Input
                        aria-label={t.unitPrice}
                        aria-invalid={!!priceError}
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder={t.toPrice}
                        value={l.unitPrice}
                        onChange={(e) => setLine(i, { unitPrice: e.target.value })}
                      />
                    </td>
                    <td className="num">{l.unitPrice === "" ? "—" : eur(amount(l))}</td>
                    <td>
                      <Button
                        size="icon"
                        variant="danger"
                        aria-label={t.removeLine}
                        onClick={() => setLines(lines.filter((_, j) => j !== i))}
                      >
                        <X />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {errors.lines && <p className="text-bad mt-1 text-sm">{errors.lines}</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={() =>
              setLines([
                ...lines,
                { type: "service", description: "", qty: "1", unit: t.flatRate, unitPrice: "" },
              ])
            }
          >
            {t.addLine}
          </Button>
          <Small>{t.highlighted}</Small>
        </div>
        <TotalsBox
          className="mt-3"
          totals={{
            net,
            vat: Math.round(net * 22) / 100,
            gross: net * 1.22,
            vatRate: 22,
            complete: !missing,
            missing,
          }}
        />
        <div className="mt-3 grid gap-x-3.5 sm:grid-cols-2">
          <Field label={t.validUntil} htmlFor="rev-valid" error={errors.validUntil}>
            <Input
              id="rev-valid"
              type="date"
              min={today()}
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </Field>
        </div>
        <Field label={t.note} htmlFor="rev-note">
          <Textarea id="rev-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="ok" size="lg" disabled={revise.isPending}>
            {submitLabel}
          </Button>
          <Button variant="danger" size="lg" onClick={() => setDeclining(true)}>
            {t.decline}
          </Button>
        </div>
      </form>
      {declining && <DeclineDialog id={q.id} onClose={() => setDeclining(false)} />}
    </Card>
  )
}

function DeclineDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useMessages(M)
  const c = useCommon()
  const qc = useQueryClient()
  const [reason, setReason] = useState("")
  const decline = useMutation({
    mutationFn: () => api.post(`/api/partner/quotes/${id}/decline`, { reason }),
    onSuccess: () => {
      toast.success(t.declined)
      void qc.invalidateQueries({ queryKey: ["supplier"] })
      onClose()
    },
  })
  const error =
    decline.error instanceof ApiError
      ? (decline.error.fields.reason ?? decline.error.message)
      : undefined
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={t.declineTitle}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          decline.mutate()
        }}
      >
        <Field label={t.reason} htmlFor="dec-reason" error={error}>
          <Textarea
            id="dec-reason"
            placeholder={t.reasonPh}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="danger" disabled={decline.isPending}>
            {t.declineTitle}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
