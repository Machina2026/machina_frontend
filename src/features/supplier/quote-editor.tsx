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
import { addDays, date, daysBetween, eur, today } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import { LINE_TYPE } from "@/lib/machina/labels"
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

const LINE_TYPES = (Object.keys(LINE_TYPE) as LineType[]).map((t) => [t, LINE_TYPE[t]] as const)
const EDITABLE = ["awaiting_partner", "sent", "expired"]

export function SupplierQuoteDetail({ id }: { id: string }) {
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
            <Crumbs items={[["Requests", "/supplier/quotes"], [qt.code]]} />
            <h1 className="mb-1.5">Quote {qt.code}</h1>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge kind="quote" status={qt.status} forPartner />
              <span className="text-muted-foreground text-sm">
                {qt.clientName} · request {qt.requestCode} · v{v.n}
              </span>
            </div>
            {qt.status === "awaiting_partner" && (
              <Alert tone="warn" className="mb-3" title="Check availability and conditions">
                Machina prepared draft v1 with your catalogue rates. Adjust the lines if needed,
                price the ones still to price and approve, or decline the request.
              </Alert>
            )}
            {qt.status === "sent" && (
              <Alert tone="info" className="mb-3" title="Awaiting the customer">
                Every change creates a new version that the customer has to accept.
              </Alert>
            )}
            {qt.status === "expired" && (
              <Alert tone="bad" className="mb-3" title="Quote expired">
                You can renew it by sending a new version with a new expiry date.
              </Alert>
            )}
            {qt.status === "accepted" && (
              <Alert tone="ok" className="mb-3" title="Accepted by the customer">
                Price locked. <Link href={`/supplier/orders/${qt.orderId}`}>Go to the order →</Link>
              </Alert>
            )}
            {qt.declineReason && (
              <Alert tone="bad" className="mb-3" title="Declined by you">
                {qt.declineReason}
              </Alert>
            )}
            {qt.rejectReason && (
              <Alert className="mb-3" title="Rejected by the customer">
                {qt.rejectReason}
              </Alert>
            )}
            {/* Single column: the lines editor needs the full width. */}
            <div className="space-y-4">
              <Card>
                <h3>Customer&apos;s request</h3>
                <KV
                  className="mb-1.5"
                  items={[
                    [
                      "Period",
                      `${date(qt.period.from)} → ${date(qt.period.to)} (${daysBetween(qt.period.from, qt.period.to)} days)`,
                    ],
                    [
                      "Machines requested",
                      <div key="m">
                        {qt.items.map((i) => (
                          <div key={i.id}>
                            {i.label} ×{i.qty}
                            {i.accessoryIds.length > 0 &&
                              ` + ${i.accessoryIds.map(accName).join(", ")}`}
                            {i.transport ? " · delivery" : " · collect from depot"}
                            {i.operator && " · with operator"}
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
                  <h3>Lines (v{v.n})</h3>
                  <LinesTable lines={v.lines} totals={v.totals} />
                </Card>
              )}
              <Card>
                <h3>Versions</h3>
                <VersionsList quote={qt} />
              </Card>
              <Card>
                <h3>History</h3>
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
      ? "Approve and send quote"
      : q.status === "expired"
        ? "Renew and send new version"
        : "Send new version"

  const revise = useMutation({
    mutationFn: () =>
      api.post<Quote>(`/api/partner/quotes/${q.id}/revise`, {
        lines: lines.map((l) => ({ ...l, qty: l.qty, unitPrice: l.unitPrice })),
        validUntil,
        note,
      }),
    onSuccess: () => {
      toast.success("Quote sent to the customer")
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
      lines.flatMap((l, i) => (l.unitPrice === "" ? [[`lines.${i}.unitPrice`, "To price"]] : []))
    )
    setLocalErrors(unpriced)
    if (Object.keys(unpriced).length)
      return toast.error("Price every line that is still to price before approving")
    const ok = await confirm({
      title: `${submitLabel}?`,
      body: (
        <>
          <p>
            Net <b>{eur(net)}</b> + VAT, valid until <b>{date(validUntil)}</b>.
          </p>
          <p className="text-muted-foreground text-sm">
            The customer receives the final quote and can accept or reject it. Your approval is
            recorded with your name and the date.
          </p>
        </>
      ),
      confirmLabel: submitLabel,
    })
    if (ok) revise.mutate()
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <h3>Quote lines</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th className="num">Qty</th>
                <th>Unit</th>
                <th className="num">Unit price €</th>
                <th className="num">Amount</th>
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
                        aria-label="Type"
                        value={l.type}
                        onChange={(e) => setLine(i, { type: e.target.value as LineType })}
                        options={LINE_TYPES}
                      />
                    </td>
                    <td>
                      <Input
                        aria-label="Description"
                        aria-invalid={!!errors[`lines.${i}.description`]}
                        value={l.description}
                        onChange={(e) => setLine(i, { description: e.target.value })}
                      />
                      {l.note && <Small>{l.note}</Small>}
                    </td>
                    <td className="w-[90px]">
                      <Input
                        aria-label="Quantity"
                        type="number"
                        min={0}
                        step={0.01}
                        value={l.qty}
                        onChange={(e) => setLine(i, { qty: e.target.value })}
                      />
                    </td>
                    <td className="w-[110px]">
                      <Input
                        aria-label="Unit"
                        value={l.unit}
                        onChange={(e) => setLine(i, { unit: e.target.value })}
                      />
                    </td>
                    <td className="w-[130px]">
                      <Input
                        aria-label="Unit price"
                        aria-invalid={!!priceError}
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="to price"
                        value={l.unitPrice}
                        onChange={(e) => setLine(i, { unitPrice: e.target.value })}
                      />
                    </td>
                    <td className="num">{l.unitPrice === "" ? "—" : eur(amount(l))}</td>
                    <td>
                      <Button
                        size="icon"
                        variant="danger"
                        aria-label="Remove line"
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
                { type: "service", description: "", qty: "1", unit: "flat rate", unitPrice: "" },
              ])
            }
          >
            + Add line
          </Button>
          <Small>Highlighted lines are still to price.</Small>
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
          <Field label="Quote valid until" htmlFor="rev-valid" error={errors.validUntil}>
            <Input
              id="rev-valid"
              type="date"
              min={today()}
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Note for the customer (conditions, availability)" htmlFor="rev-note">
          <Textarea id="rev-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="ok" size="lg" disabled={revise.isPending}>
            {submitLabel}
          </Button>
          <Button variant="danger" size="lg" onClick={() => setDeclining(true)}>
            Decline
          </Button>
        </div>
      </form>
      {declining && <DeclineDialog id={q.id} onClose={() => setDeclining(false)} />}
    </Card>
  )
}

function DeclineDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState("")
  const decline = useMutation({
    mutationFn: () => api.post(`/api/partner/quotes/${id}/decline`, { reason }),
    onSuccess: () => {
      toast.success("Request declined")
      void qc.invalidateQueries({ queryKey: ["supplier"] })
      onClose()
    },
  })
  const error =
    decline.error instanceof ApiError
      ? (decline.error.fields.reason ?? decline.error.message)
      : undefined
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Decline request">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          decline.mutate()
        }}
      >
        <Field label="Reason (visible to the customer)" htmlFor="dec-reason" error={error}>
          <Textarea
            id="dec-reason"
            placeholder="E.g. machine not available in the period"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" disabled={decline.isPending}>
            Decline request
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
