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
import { useFormat, useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages } from "@/i18n/messages"
import { addDays, daysBetween, today } from "@/lib/machina/format"
import { useLabels } from "@/lib/machina/labels"
import type { ChangeKind, OrderChange, OrderCharge, OrderView } from "@/lib/machina/types"

/** Payment methods as stored on the order, with their label in each language. */
const PAYMENT_METHODS = ["Bank transfer", "Bank receipt (RiBa)", "Cheque", "Other"] as const

const M = defineMessages({
  en: {
    requestChange: "Request a change",
    requestChangeHint:
      "The partner will check availability and propose a price, which you can accept or reject.",
    type: "Type",
    newEnd: "New end date",
    currentEnd: (d: string) => `Current end: ${d}`,
    description: "Description",
    descriptionPh: "E.g. the concrete pour has slipped by a week",
    sendRequest: "Send request",
    extensionLine: (label: string, until: string, days: number) =>
      `Extension of the ${label} rental until ${until} (${days} days)`,
    unitDays: "days",
    unitWeeks: "weeks",
    priceRequest: (code: string) => `Price request ${code}`,
    proposeChange: "Propose a change",
    proposeHint:
      "The customer will see the previous amount, the difference and the new total, and can accept or reject.",
    customerRequest: "Customer's request",
    reason: "Reason",
    lineDescription: "Line description",
    quantity: "Quantity",
    unit: "Unit",
    unitPrice: "Unit price (€, excl. VAT)",
    preview: "Preview",
    amount: "Amount:",
    plusVat: "+ VAT",
    agreedTotal: "Agreed total:",
    sendToCustomer: "Send to customer",
    required: "Required",
    recordCharge: "Record a charge",
    recordChargeHint:
      "The customer can accept or dispute it. Until accepted, it is not part of the agreed total.",
    amountRequested: "Amount requested (€, excl. VAT)",
    photos: "Photos and documents (JPG, PNG, PDF · max 5 MB each)",
    reviseTitle: (code: string) => `Revise amount ${code}`,
    newAmount: "New amount (€, excl. VAT)",
    uploadTitle: "Upload the final invoice",
    uploadInfo: (b: (s: string) => React.ReactNode) => (
      <>
        Issue the invoice with your own management software. Uploading it to Machina makes it
        visible to the customer but{" "}
        {b("is not a submission to the SdI (Italian e-invoicing exchange)")}.
      </>
    ),
    alreadyInvoiced:
      "This order already has an invoice. Upload any supplementary invoices or credit notes here: documents already issued are not changed.",
    docType: "Document type",
    number: "Number",
    date: "Date",
    docTotal: "Document total (€)",
    file: "File (PDF or XML, max 5 MB)",
    notes: "Notes",
    uploadDocument: "Upload document",
    declareTitle: "Declare payment",
    declareHint:
      "You pay the rental company directly. The partner confirms your declaration when the money arrives.",
    amountPaid: "Amount paid (€)",
    method: "Method",
    methods: {
      "Bank transfer": "Bank transfer",
      "Bank receipt (RiBa)": "Bank receipt (RiBa)",
      Cheque: "Cheque",
      Other: "Other",
    } as Record<string, string>,
    paymentNotes: "Notes (e.g. transfer reference)",
    declare: "Declare payment",
    confirmTitle: "Confirm receipt",
    amountReceived: "Amount received (€)",
    dateReceived: "Date received",
  },
  it: {
    requestChange: "Richiedi una modifica",
    requestChangeHint:
      "Il noleggiatore verificherà la disponibilità e proporrà un prezzo, che potrai accettare o rifiutare.",
    type: "Tipo",
    newEnd: "Nuova data di fine",
    currentEnd: (d: string) => `Fine attuale: ${d}`,
    description: "Descrizione",
    descriptionPh: "Es. il getto di calcestruzzo è slittato di una settimana",
    sendRequest: "Invia la richiesta",
    extensionLine: (label: string, until: string, days: number) =>
      `Proroga del noleggio ${label} fino al ${until} (${days} giorni)`,
    unitDays: "giorni",
    unitWeeks: "settimane",
    priceRequest: (code: string) => `Quota la richiesta ${code}`,
    proposeChange: "Proponi una modifica",
    proposeHint:
      "Il cliente vedrà l'importo precedente, la differenza e il nuovo totale, e potrà accettare o rifiutare.",
    customerRequest: "Richiesta del cliente",
    reason: "Motivo",
    lineDescription: "Descrizione della riga",
    quantity: "Quantità",
    unit: "Unità",
    unitPrice: "Prezzo unitario (€, IVA esclusa)",
    preview: "Anteprima",
    amount: "Importo:",
    plusVat: "+ IVA",
    agreedTotal: "Totale concordato:",
    sendToCustomer: "Invia al cliente",
    required: "Obbligatorio",
    recordCharge: "Registra un addebito",
    recordChargeHint:
      "Il cliente può accettarlo o contestarlo. Finché non è accettato, non fa parte del totale concordato.",
    amountRequested: "Importo richiesto (€, IVA esclusa)",
    photos: "Foto e documenti (JPG, PNG, PDF · max 5 MB ciascuno)",
    reviseTitle: (code: string) => `Rivedi l'importo ${code}`,
    newAmount: "Nuovo importo (€, IVA esclusa)",
    uploadTitle: "Carica la fattura finale",
    uploadInfo: (b: (s: string) => React.ReactNode) => (
      <>
        Emetti la fattura con il tuo gestionale. Caricarla su Machina la rende visibile al cliente
        ma {b("non è un invio allo SdI (Sistema di Interscambio)")}.
      </>
    ),
    alreadyInvoiced:
      "Questo ordine ha già una fattura. Carica qui eventuali fatture integrative o note di credito: i documenti già emessi non cambiano.",
    docType: "Tipo di documento",
    number: "Numero",
    date: "Data",
    docTotal: "Totale documento (€)",
    file: "File (PDF o XML, max 5 MB)",
    notes: "Note",
    uploadDocument: "Carica il documento",
    declareTitle: "Dichiara il pagamento",
    declareHint:
      "Paghi direttamente il noleggiatore. Il noleggiatore conferma la tua dichiarazione quando riceve il denaro.",
    amountPaid: "Importo pagato (€)",
    method: "Metodo",
    methods: {
      "Bank transfer": "Bonifico bancario",
      "Bank receipt (RiBa)": "Ricevuta bancaria (RiBa)",
      Cheque: "Assegno",
      Other: "Altro",
    } as Record<string, string>,
    paymentNotes: "Note (es. riferimento del bonifico)",
    declare: "Dichiara il pagamento",
    confirmTitle: "Conferma l'incasso",
    amountReceived: "Importo ricevuto (€)",
    dateReceived: "Data di ricezione",
  },
})

/** A stored payment method in the current language. */
export function usePaymentMethodLabel() {
  const t = useMessages(M)
  return (method: string) => t.methods[method] ?? method
}

const bold = (s: string) => <b>{s}</b>

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

function useKindOptions() {
  const L = useLabels()
  return (Object.keys(L.CHANGE_KIND) as ChangeKind[]).map((k) => [k, L.CHANGE_KIND[k]] as const)
}

export function ClientChangeDialog({ order: o, onClose, submit }: DialogProps) {
  const t = useMessages(M)
  const c = useCommon()
  const { date } = useFormat()
  const kindOptions = useKindOptions()
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
      title={t.requestChange}
      description={t.requestChangeHint}
    >
      <form onSubmit={(e) => (e.preventDefault(), s.run(f))}>
        <ErrorLine message={s.message} fields={{}} />
        <Field label={t.type} htmlFor="cc-kind" error={s.fields.kind}>
          <Select
            id="cc-kind"
            value={f.kind}
            onChange={(e) => setF({ ...f, kind: e.target.value as ChangeKind })}
            options={kindOptions}
          />
        </Field>
        {f.kind === "extension" && (
          <Field
            label={t.newEnd}
            htmlFor="cc-to"
            hint={t.currentEnd(date(o.period.to))}
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
        <Field label={t.description} htmlFor="cc-reason" error={s.fields.reason}>
          <Textarea
            id="cc-reason"
            placeholder={t.descriptionPh}
            value={f.reason}
            onChange={(e) => setF({ ...f, reason: e.target.value })}
          />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            {t.sendRequest}
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
  const t = useMessages(M)
  const c = useCommon()
  const { date, eur } = useFormat()
  const kindOptions = useKindOptions()
  const s = useSubmit(submit, onClose)
  const first = o.items[0]
  const rates = o.offerRates?.[first.offerId] ?? { day: null, week: null, month: null }
  const prefill = (kind: ChangeKind, newTo: string) => {
    const extra = daysBetween(o.period.to, newTo) - 1
    if (kind !== "extension" || extra <= 0) return {}
    const description = t.extensionLine(first.label, date(newTo), extra)
    if (extra >= 7 && rates.week && extra % 7 === 0)
      return {
        description,
        qty: String(extra / 7),
        unit: t.unitWeeks,
        unitPrice: String(rates.week),
      }
    return {
      description,
      qty: String(extra),
      unit: t.unitDays,
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
    unit: t.unitDays,
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
      title={existing ? t.priceRequest(existing.code) : t.proposeChange}
      description={t.proposeHint}
    >
      <form onSubmit={(e) => (e.preventDefault(), s.run({ ...f, changeId: existing?.id }))}>
        <ErrorLine message={s.message} fields={{}} />
        {existing && (
          <Alert size="sm" className="mb-3" title={t.customerRequest}>
            {existing.reason}
          </Alert>
        )}
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <Field label={t.type} htmlFor="pc-kind" error={s.fields.kind}>
            <Select
              id="pc-kind"
              value={f.kind}
              onChange={(e) => {
                const kind = e.target.value as ChangeKind
                setF({ ...f, kind, ...prefill(kind, f.newTo) })
              }}
              options={kindOptions}
            />
          </Field>
          {f.kind === "extension" && (
            <Field
              label={t.newEnd}
              htmlFor="pc-to"
              hint={t.currentEnd(date(o.period.to))}
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
        <Field label={t.reason} htmlFor="pc-reason" error={s.fields.reason}>
          <Textarea
            id="pc-reason"
            rows={2}
            value={f.reason}
            onChange={(e) => setF({ ...f, reason: e.target.value })}
          />
        </Field>
        <Field label={t.lineDescription} htmlFor="pc-desc" error={s.fields.description}>
          <Input
            id="pc-desc"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
        </Field>
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <Field label={t.quantity} htmlFor="pc-qty" error={s.fields.qty}>
            <Input
              id="pc-qty"
              type="number"
              min={0.01}
              step={0.01}
              value={f.qty}
              onChange={(e) => setF({ ...f, qty: e.target.value })}
            />
          </Field>
          <Field label={t.unit} htmlFor="pc-unit">
            <Input
              id="pc-unit"
              value={f.unit}
              onChange={(e) => setF({ ...f, unit: e.target.value })}
            />
          </Field>
          <Field label={t.unitPrice} htmlFor="pc-price" error={s.fields.unitPrice}>
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
            <span className="mb-1 block text-[0.85rem] font-semibold">{t.preview}</span>
            {t.amount} <b>{eur(amount)}</b> {t.plusVat}
            <br />
            {t.agreedTotal} {eur(o.summary.agreedGross)} →{" "}
            <b>{eur(o.summary.agreedGross + amount * vatFactor)}</b>
          </div>
        </div>
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            {t.sendToCustomer}
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
  confirmLabel,
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
  const t = useMessages(M)
  const c = useCommon()
  const s = useSubmit(submit, onClose)
  const [text, setText] = useState("")
  const [local, setLocal] = useState("")
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!optional && !text.trim()) return setLocal(t.required)
          void s.run({ [field]: text.trim() })
        }}
      >
        <ErrorLine message={s.message} fields={{}} />
        <Field label={label} htmlFor="reason" error={local || s.fields[field]}>
          <Textarea id="reason" value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="danger" disabled={s.busy}>
            {confirmLabel ?? c.confirm}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

export function ChargeDialog({ onClose, submit }: Omit<DialogProps, "order">) {
  const t = useMessages(M)
  const c = useCommon()
  const L = useLabels()
  const chargeOptions = (Object.keys(L.CHARGE_KIND) as (keyof typeof L.CHARGE_KIND)[]).map(
    (k) => [k, L.CHARGE_KIND[k]] as const
  )
  const s = useSubmit(submit, onClose)
  const [f, setF] = useState({ kind: "damage", amount: "", description: "" })
  const [files, setFiles] = useState<File[]>([])
  return (
    <Modal
      open
      onOpenChange={(v) => !v && onClose()}
      title={t.recordCharge}
      description={t.recordChargeHint}
    >
      <form
        onSubmit={(e) => (
          e.preventDefault(),
          s.run(async () => ({ ...f, files: await Promise.all(files.map(readUpload)) }))
        )}
      >
        <ErrorLine message={s.message} fields={{}} />
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <Field label={t.type} htmlFor="ch-kind" error={s.fields.kind}>
            <Select
              id="ch-kind"
              value={f.kind}
              onChange={(e) => setF({ ...f, kind: e.target.value })}
              options={chargeOptions}
            />
          </Field>
          <Field label={t.amountRequested} htmlFor="ch-amount" error={s.fields.amount}>
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
        <Field label={t.description} htmlFor="ch-desc" error={s.fields.description}>
          <Textarea
            id="ch-desc"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
        </Field>
        <Field label={t.photos} htmlFor="ch-files" error={s.fields.file}>
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
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            {t.sendToCustomer}
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
  const t = useMessages(M)
  const c = useCommon()
  const s = useSubmit(submit, onClose)
  const [f, setF] = useState({ amount: String(charge.amount), note: "" })
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={t.reviseTitle(charge.code)}>
      <form onSubmit={(e) => (e.preventDefault(), s.run(f))}>
        <ErrorLine message={s.message} fields={{}} />
        <Field label={t.newAmount} htmlFor="cr-amount" error={s.fields.amount}>
          <Input
            id="cr-amount"
            type="number"
            min={0.01}
            step={0.01}
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
        <Field label={t.reason} htmlFor="cr-note">
          <Textarea
            id="cr-note"
            rows={2}
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
          />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            {t.sendToCustomer}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

export function InvoiceDialog({ order: o, onClose, submit }: DialogProps) {
  const t = useMessages(M)
  const c = useCommon()
  const L = useLabels()
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
    <Modal open wide onOpenChange={(v) => !v && onClose()} title={t.uploadTitle}>
      <Alert tone="info" size="sm" className="mb-3">
        {t.uploadInfo(bold)}
      </Alert>
      {hasInvoice && (
        <Alert tone="warn" size="sm" className="mb-3">
          {t.alreadyInvoiced}
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
          <Field label={t.docType} htmlFor="inv-type">
            <Select
              id="inv-type"
              value={f.docType}
              onChange={(e) => setF({ ...f, docType: e.target.value })}
              options={(Object.keys(L.DOC_TYPE) as (keyof typeof L.DOC_TYPE)[]).map(
                (k) => [k, L.DOC_TYPE[k]] as const
              )}
            />
          </Field>
          <Field label={t.number} htmlFor="inv-number" error={s.fields.number}>
            <Input
              id="inv-number"
              value={f.number}
              onChange={(e) => setF({ ...f, number: e.target.value })}
            />
          </Field>
          <Field label={t.date} htmlFor="inv-date" error={s.fields.date}>
            <Input
              id="inv-date"
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
          <Field label={t.docTotal} htmlFor="inv-amount" error={s.fields.amount}>
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
        <Field label={t.file} htmlFor="inv-file" error={s.fields.file}>
          <input
            id="inv-file"
            type="file"
            accept="application/pdf,.xml,application/xml,text/xml"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </Field>
        <Field label={t.notes} htmlFor="inv-note">
          <Input
            id="inv-note"
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
          />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            {t.uploadDocument}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

export function DeclarePaymentDialog({ order: o, onClose, submit }: DialogProps) {
  const t = useMessages(M)
  const c = useCommon()
  const s = useSubmit(submit, onClose)
  const [f, setF] = useState({
    amount: o.summary.agreedGross.toFixed(2),
    date: today(),
    method: PAYMENT_METHODS[0] as string,
    note: "",
  })
  return (
    <Modal
      open
      onOpenChange={(v) => !v && onClose()}
      title={t.declareTitle}
      description={t.declareHint}
    >
      <form onSubmit={(e) => (e.preventDefault(), s.run(f))}>
        <ErrorLine message={s.message} fields={{}} />
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <Field label={t.amountPaid} htmlFor="dp-amount" error={s.fields.amount}>
            <Input
              id="dp-amount"
              type="number"
              min={0.01}
              step={0.01}
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
            />
          </Field>
          <Field label={t.date} htmlFor="dp-date" error={s.fields.date}>
            <Input
              id="dp-date"
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
          <Field label={t.method} htmlFor="dp-method">
            <Select
              id="dp-method"
              value={f.method}
              onChange={(e) => setF({ ...f, method: e.target.value })}
              options={PAYMENT_METHODS.map((m) => [m, t.methods[m]] as const)}
            />
          </Field>
          <Field label={t.paymentNotes} htmlFor="dp-note">
            <Input
              id="dp-note"
              value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
            />
          </Field>
        </div>
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            {t.declare}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

export function ConfirmPaymentDialog({ order: o, onClose, submit }: DialogProps) {
  const t = useMessages(M)
  const c = useCommon()
  const s = useSubmit(submit, onClose)
  const amount = o.payment.declared?.amount ?? o.summary.agreedGross
  const [f, setF] = useState({ amount: amount.toFixed(2), date: today() })
  return (
    <Modal open onOpenChange={(v) => !v && onClose()} title={t.confirmTitle}>
      <form onSubmit={(e) => (e.preventDefault(), s.run(f))}>
        <ErrorLine message={s.message} fields={{}} />
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <Field label={t.amountReceived} htmlFor="cp-amount" error={s.fields.amount}>
            <Input
              id="cp-amount"
              type="number"
              min={0.01}
              step={0.01}
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
            />
          </Field>
          <Field label={t.dateReceived} htmlFor="cp-date" error={s.fields.date}>
            <Input
              id="cp-date"
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
        </div>
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="ok" disabled={s.busy}>
            {t.confirmTitle}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
