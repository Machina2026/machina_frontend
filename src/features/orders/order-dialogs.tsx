"use client"

import { useState } from "react"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal, ModalActions } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, readUpload, type Upload } from "@/lib/machina/api"
import { addDays, date, daysBetween, eur, today } from "@/lib/machina/format"
import { CHANGE_KIND, CHARGE_KIND, DOC_TYPE } from "@/lib/machina/labels"
import type { ChangeKind, OrderChange, OrderCharge, OrderView } from "@/lib/machina/types"

/** Submit handler: resolves on success, throws ApiError (with field errors) on failure. */
export type Submit = (body: Record<string, unknown>) => Promise<unknown>

type DialogProps = { order: OrderView; onClose: () => void; submit: Submit }

/** Shared submit state: busy flag, field errors and the general error message. */
function useSubmit(submit: Submit, onClose: () => void) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const run = async (body: Record<string, unknown> | (() => Promise<Record<string, unknown>>)) => {
    setBusy(true)
    setError(null)
    try {
      await submit(typeof body === "function" ? await body() : body)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, (err as Error).message))
    } finally {
      setBusy(false)
    }
  }
  return { busy, run, fields: error?.fields ?? {}, message: error?.message }
}

function ErrorLine({ message, fields }: { message?: string; fields: Record<string, string> }) {
  if (!message) return null
  const extra = Object.values(fields)
  return (
    <Alert tone="bad" size="sm" className="mb-3">
      {message}
      {extra.length > 0 && `: ${extra.join("; ")}`}
    </Alert>
  )
}

const KIND_OPTIONS = (Object.keys(CHANGE_KIND) as ChangeKind[]).map(
  (k) => [k, CHANGE_KIND[k]] as const
)

export function ClientChangeDialog({ order: o, onClose, submit }: DialogProps) {
  const s = useSubmit(submit, onClose)
  const [f, setF] = useState({
    kind: "extension" as ChangeKind,
    newTo: addDays(o.period.to, 7),
    reason: "",
  })
  return (
    <Modal
      open
      onOpenChange={(v) => !v && onClose()}
      title="Request a change"
      description="The partner will check availability and propose a price, which you can accept or reject."
    >
      <form onSubmit={(e) => (e.preventDefault(), s.run(f))}>
        <ErrorLine message={s.message} fields={{}} />
        <Field label="Type" htmlFor="cc-kind" error={s.fields.kind}>
          <Select
            id="cc-kind"
            value={f.kind}
            onChange={(e) => setF({ ...f, kind: e.target.value as ChangeKind })}
            options={KIND_OPTIONS}
          />
        </Field>
        {f.kind === "extension" && (
          <Field
            label="New end date"
            htmlFor="cc-to"
            hint={`Current end: ${date(o.period.to)}`}
            error={s.fields.newTo}
          >
            <Input
              id="cc-to"
              type="date"
              min={addDays(o.period.to, 1)}
              value={f.newTo}
              onChange={(e) => setF({ ...f, newTo: e.target.value })}
            />
          </Field>
        )}
        <Field label="Description" htmlFor="cc-reason" error={s.fields.reason}>
          <Textarea
            id="cc-reason"
            placeholder="E.g. the concrete pour has slipped by a week"
            value={f.reason}
            onChange={(e) => setF({ ...f, reason: e.target.value })}
          />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            Send request
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

/** Partner proposes a change, or prices a change requested by the customer. */
export function PartnerChangeDialog({
  order: o,
  onClose,
  submit,
  existing,
}: DialogProps & { existing?: OrderChange }) {
  const s = useSubmit(submit, onClose)
  const first = o.items[0]
  const rates = o.offerRates?.[first.offerId] ?? { day: null, week: null, month: null }
  const prefill = (kind: ChangeKind, newTo: string) => {
    const extra = daysBetween(o.period.to, newTo) - 1
    if (kind !== "extension" || extra <= 0) return {}
    const description = `Extension of the ${first.label} rental until ${date(newTo)} (${extra} days)`
    if (extra >= 7 && rates.week && extra % 7 === 0)
      return { description, qty: String(extra / 7), unit: "weeks", unitPrice: String(rates.week) }
    return {
      description,
      qty: String(extra),
      unit: "days",
      unitPrice: rates.day ? String(rates.day) : "",
    }
  }
  const initialKind = existing?.kind ?? "extension"
  const initialTo = existing?.newTo ?? addDays(o.period.to, 7)
  const [f, setF] = useState({
    kind: initialKind,
    newTo: initialTo,
    reason: existing?.reason ?? "",
    description: "",
    qty: "",
    unit: "days",
    unitPrice: "",
    ...prefill(initialKind, initialTo),
  })
  const amount = (Number(f.qty) || 0) * (Number(f.unitPrice) || 0)
  const vatFactor = 1 + o.summary.vatRate / 100

  return (
    <Modal
      open
      wide
      onOpenChange={(v) => !v && onClose()}
      title={existing ? `Price request ${existing.code}` : "Propose a change"}
      description="The customer will see the previous amount, the difference and the new total, and can accept or reject."
    >
      <form onSubmit={(e) => (e.preventDefault(), s.run({ ...f, changeId: existing?.id }))}>
        <ErrorLine message={s.message} fields={{}} />
        {existing && (
          <Alert size="sm" className="mb-3" title="Customer's request">
            {existing.reason}
          </Alert>
        )}
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <Field label="Type" htmlFor="pc-kind" error={s.fields.kind}>
            <Select
              id="pc-kind"
              value={f.kind}
              onChange={(e) => {
                const kind = e.target.value as ChangeKind
                setF({ ...f, kind, ...prefill(kind, f.newTo) })
              }}
              options={KIND_OPTIONS}
            />
          </Field>
          {f.kind === "extension" && (
            <Field
              label="New end date"
              htmlFor="pc-to"
              hint={`Current end: ${date(o.period.to)}`}
              error={s.fields.newTo}
            >
              <Input
                id="pc-to"
                type="date"
                min={addDays(o.period.to, 1)}
                value={f.newTo}
                onChange={(e) =>
                  setF({ ...f, newTo: e.target.value, ...prefill(f.kind, e.target.value) })
                }
              />
            </Field>
          )}
        </div>
        <Field label="Reason" htmlFor="pc-reason" error={s.fields.reason}>
          <Textarea
            id="pc-reason"
            rows={2}
            value={f.reason}
            onChange={(e) => setF({ ...f, reason: e.target.value })}
          />
        </Field>
        <Field label="Line description" htmlFor="pc-desc" error={s.fields.description}>
          <Input
            id="pc-desc"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
        </Field>
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <Field label="Quantity" htmlFor="pc-qty" error={s.fields.qty}>
            <Input
              id="pc-qty"
              type="number"
              min={0.01}
              step={0.01}
              value={f.qty}
              onChange={(e) => setF({ ...f, qty: e.target.value })}
            />
          </Field>
          <Field label="Unit" htmlFor="pc-unit">
            <Input
              id="pc-unit"
              value={f.unit}
              onChange={(e) => setF({ ...f, unit: e.target.value })}
            />
          </Field>
          <Field label="Unit price (€, excl. VAT)" htmlFor="pc-price" error={s.fields.unitPrice}>
            <Input
              id="pc-price"
              type="number"
              min={0}
              step={0.01}
              value={f.unitPrice}
              onChange={(e) => setF({ ...f, unitPrice: e.target.value })}
            />
          </Field>
          <div className="mb-3.5 text-sm">
            <span className="mb-1 block text-[0.85rem] font-semibold">Preview</span>
            Amount: <b>{eur(amount)}</b> + VAT
            <br />
            Agreed total: {eur(o.summary.agreedGross)} →{" "}
            <b>{eur(o.summary.agreedGross + amount * vatFactor)}</b>
          </div>
        </div>
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            Send to customer
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

/** A single free-text reason (decline, reject, dispute). */
export function ReasonDialog({
  title,
  label,
  optional,
  confirmLabel = "Confirm",
  field = "reason",
  onClose,
  submit,
}: {
  title: string
  label: string
  optional?: boolean
  confirmLabel?: string
  field?: string
  onClose: () => void
  submit: Submit
}) {
  const s = useSubmit(submit, onClose)
  const [text, setText] = useState("")
  const [local, setLocal] = useState("")
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!optional && !text.trim()) return setLocal("Required")
          void s.run({ [field]: text.trim() })
        }}
      >
        <ErrorLine message={s.message} fields={{}} />
        <Field label={label} htmlFor="reason" error={local || s.fields[field]}>
          <Textarea id="reason" value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" disabled={s.busy}>
            {confirmLabel}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

const CHARGE_OPTIONS = (Object.keys(CHARGE_KIND) as (keyof typeof CHARGE_KIND)[]).map(
  (k) => [k, CHARGE_KIND[k]] as const
)

export function ChargeDialog({ onClose, submit }: Omit<DialogProps, "order">) {
  const s = useSubmit(submit, onClose)
  const [f, setF] = useState({ kind: "damage", amount: "", description: "" })
  const [files, setFiles] = useState<File[]>([])
  return (
    <Modal
      open
      onOpenChange={(v) => !v && onClose()}
      title="Record a charge"
      description="The customer can accept or dispute it. Until accepted, it is not part of the agreed total."
    >
      <form
        onSubmit={(e) => (
          e.preventDefault(),
          s.run(async () => ({ ...f, files: await Promise.all(files.map(readUpload)) }))
        )}
      >
        <ErrorLine message={s.message} fields={{}} />
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <Field label="Type" htmlFor="ch-kind" error={s.fields.kind}>
            <Select
              id="ch-kind"
              value={f.kind}
              onChange={(e) => setF({ ...f, kind: e.target.value })}
              options={CHARGE_OPTIONS}
            />
          </Field>
          <Field
            label="Amount requested (€, excl. VAT)"
            htmlFor="ch-amount"
            error={s.fields.amount}
          >
            <Input
              id="ch-amount"
              type="number"
              min={0.01}
              step={0.01}
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Description" htmlFor="ch-desc" error={s.fields.description}>
          <Textarea
            id="ch-desc"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
        </Field>
        <Field
          label="Photos and documents (JPG, PNG, PDF · max 5 MB each)"
          htmlFor="ch-files"
          error={s.fields.file}
        >
          <input
            id="ch-files"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="text-sm"
          />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            Send to customer
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

export function ChargeReviseDialog({
  charge,
  onClose,
  submit,
}: {
  charge: OrderCharge
  onClose: () => void
  submit: Submit
}) {
  const s = useSubmit(submit, onClose)
  const [f, setF] = useState({ amount: String(charge.amount), note: "" })
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={`Revise amount ${charge.code}`}>
      <form onSubmit={(e) => (e.preventDefault(), s.run(f))}>
        <ErrorLine message={s.message} fields={{}} />
        <Field label="New amount (€, excl. VAT)" htmlFor="cr-amount" error={s.fields.amount}>
          <Input
            id="cr-amount"
            type="number"
            min={0.01}
            step={0.01}
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
        <Field label="Reason" htmlFor="cr-note">
          <Textarea
            id="cr-note"
            rows={2}
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
          />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            Send to customer
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

export function InvoiceDialog({ order: o, onClose, submit }: DialogProps) {
  const s = useSubmit(submit, onClose)
  const hasInvoice = o.invoices.length > 0
  const [f, setF] = useState({
    docType: hasInvoice ? "supplementary_invoice" : "invoice",
    number: "",
    date: today(),
    amount: hasInvoice ? "" : o.summary.agreedGross.toFixed(2),
    note: "",
  })
  const [file, setFile] = useState<File | null>(null)
  return (
    <Modal open wide onOpenChange={(v) => !v && onClose()} title="Upload the final invoice">
      <Alert tone="info" size="sm" className="mb-3">
        Issue the invoice with your own management software. Uploading it to Machina makes it
        visible to the customer but{" "}
        <b>is not a submission to the SdI (Italian e-invoicing exchange)</b>.
      </Alert>
      {hasInvoice && (
        <Alert tone="warn" size="sm" className="mb-3">
          This order already has an invoice. Upload any supplementary invoices or credit notes here:
          documents already issued are not changed.
        </Alert>
      )}
      <form
        onSubmit={(e) => (
          e.preventDefault(),
          s.run(async () => ({
            ...f,
            file: file ? await readUpload(file) : (undefined as Upload | undefined),
          }))
        )}
      >
        <ErrorLine message={s.message} fields={{}} />
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <Field label="Document type" htmlFor="inv-type">
            <Select
              id="inv-type"
              value={f.docType}
              onChange={(e) => setF({ ...f, docType: e.target.value })}
              options={(Object.keys(DOC_TYPE) as (keyof typeof DOC_TYPE)[]).map(
                (k) => [k, DOC_TYPE[k]] as const
              )}
            />
          </Field>
          <Field label="Number" htmlFor="inv-number" error={s.fields.number}>
            <Input
              id="inv-number"
              value={f.number}
              onChange={(e) => setF({ ...f, number: e.target.value })}
            />
          </Field>
          <Field label="Date" htmlFor="inv-date" error={s.fields.date}>
            <Input
              id="inv-date"
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
          <Field label="Document total (€)" htmlFor="inv-amount" error={s.fields.amount}>
            <Input
              id="inv-amount"
              type="number"
              min={0}
              step={0.01}
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
            />
          </Field>
        </div>
        <Field label="File (PDF or XML, max 5 MB)" htmlFor="inv-file" error={s.fields.file}>
          <input
            id="inv-file"
            type="file"
            accept="application/pdf,.xml,application/xml,text/xml"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </Field>
        <Field label="Notes" htmlFor="inv-note">
          <Input
            id="inv-note"
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
          />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            Upload document
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

export function DeclarePaymentDialog({ order: o, onClose, submit }: DialogProps) {
  const s = useSubmit(submit, onClose)
  const [f, setF] = useState({
    amount: o.summary.agreedGross.toFixed(2),
    date: today(),
    method: "Bank transfer",
    note: "",
  })
  return (
    <Modal
      open
      onOpenChange={(v) => !v && onClose()}
      title="Declare payment"
      description="You pay the rental company directly. The partner confirms your declaration when the money arrives."
    >
      <form onSubmit={(e) => (e.preventDefault(), s.run(f))}>
        <ErrorLine message={s.message} fields={{}} />
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <Field label="Amount paid (€)" htmlFor="dp-amount" error={s.fields.amount}>
            <Input
              id="dp-amount"
              type="number"
              min={0.01}
              step={0.01}
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
            />
          </Field>
          <Field label="Date" htmlFor="dp-date" error={s.fields.date}>
            <Input
              id="dp-date"
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
          <Field label="Method" htmlFor="dp-method">
            <Select
              id="dp-method"
              value={f.method}
              onChange={(e) => setF({ ...f, method: e.target.value })}
              options={[
                ["Bank transfer", "Bank transfer"],
                ["Bank receipt (RiBa)", "Bank receipt (RiBa)"],
                ["Cheque", "Cheque"],
                ["Other", "Other"],
              ]}
            />
          </Field>
          <Field label="Notes (e.g. transfer reference)" htmlFor="dp-note">
            <Input
              id="dp-note"
              value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
            />
          </Field>
        </div>
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            Declare payment
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

export function ConfirmPaymentDialog({ order: o, onClose, submit }: DialogProps) {
  const s = useSubmit(submit, onClose)
  const amount = o.payment.declared?.amount ?? o.summary.agreedGross
  const [f, setF] = useState({ amount: amount.toFixed(2), date: today() })
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title="Confirm receipt">
      <form onSubmit={(e) => (e.preventDefault(), s.run(f))}>
        <ErrorLine message={s.message} fields={{}} />
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <Field label="Amount received (€)" htmlFor="cp-amount" error={s.fields.amount}>
            <Input
              id="cp-amount"
              type="number"
              min={0.01}
              step={0.01}
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
            />
          </Field>
          <Field label="Date received" htmlFor="cp-date" error={s.fields.date}>
            <Input
              id="cp-date"
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
        </div>
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="ok" disabled={s.busy}>
            Confirm receipt
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
