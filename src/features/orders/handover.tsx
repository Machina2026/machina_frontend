"use client"

import { useState } from "react"

import { Small } from "@/components/app/bits"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHead } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal, ModalActions } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useFormat, useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages } from "@/i18n/messages"
import { readUpload } from "@/lib/machina/api"
import type {
  FileMeta,
  Fuel,
  HandoverReport,
  OrderView,
  Reading,
  ReportKind,
  Viewer,
} from "@/lib/machina/types"

import { SignatureFields } from "./contract"
import { ErrorLine, type Submit, useSubmit } from "./order-dialogs"

const FUELS: Fuel[] = ["full", "three_quarters", "half", "quarter", "empty", "not_applicable"]
const MAX_PHOTOS = 8

const M = defineMessages({
  en: {
    title: "Handover reports",
    intro:
      "At delivery and at collection the rental company records each machine's hour meter, fuel and condition, with photos, and signs. You countersign, adding remarks if anything differs.",
    report: { delivery: "Delivery report", return: "Return report" } as Record<ReportKind, string>,
    record: { delivery: "Record delivery", return: "Record collection" } as Record<
      ReportKind,
      string
    >,
    notYet: {
      delivery: "Not recorded yet: the rental company records it when handing the machines over.",
      return: "Not recorded yet: the rental company records it when collecting the machines.",
    } as Record<ReportKind, string>,
    machine: "Machine",
    hourMeter: "Hour meter",
    fuel: "Fuel",
    condition: "Condition",
    hours: (h: string) => `${h} h`,
    used: (h: string) => `${h} h used`,
    noMeter: "—",
    notes: "Notes",
    photos: "Photos:",
    signedPartner: (name: string, at: string) => `Signed by the rental company: "${name}", ${at}`,
    signedClient: (name: string, at: string) => `Countersigned by the customer: "${name}", ${at}`,
    awaiting: "Awaiting the customer's countersignature",
    remarks: "Customer's remarks",
    countersign: "Countersign",
    fuels: {
      full: "Full",
      three_quarters: "¾",
      half: "½",
      quarter: "¼",
      empty: "Empty",
      not_applicable: "Not applicable (electric)",
    } as Record<Fuel, string>,
    // Partner dialog
    recordTitle: {
      delivery: "Delivery report",
      return: "Return report",
    } as Record<ReportKind, string>,
    recordHint: {
      delivery:
        "Fill it in when you hand the machines over. Signing it starts the rental; the customer then countersigns it.",
      return:
        "Fill it in when you collect the machines. Signing it ends the rental; the customer then countersigns it. Charge any damage or missing fuel separately.",
    } as Record<ReportKind, string>,
    hourMeterField: "Hour meter (h)",
    hourMeterHint: "Leave empty if the machine has none",
    atDelivery: (h: string, fuel: string) => `At delivery: ${h}, fuel ${fuel}`,
    conditionPh: "Scratches, dents, missing parts, cleanliness…",
    notesField: "Notes (optional)",
    photosField: `Photos (JPG, PNG, WebP · up to ${MAX_PHOTOS}, max 5 MB each)`,
    confirmPartner: {
      delivery: "I confirm the machines were handed over as described in this report.",
      return: "I confirm the machines were collected as described in this report.",
    } as Record<ReportKind, string>,
    signRecord: "Sign and record",
    // Client dialog
    signTitle: (report: string) => `Countersign the ${report.toLowerCase()}`,
    signHint:
      "Check the readings and photos. If anything is wrong or missing, write it in the remarks: they stay with the report.",
    remarksField: "Remarks (optional)",
    remarksPh: "E.g. bucket teeth worn, not noted in the report",
    confirmClient: "I have checked this report. Anything I disagree with is in the remarks.",
    sign: "Countersign",
  },
  it: {
    title: "Verbali di consegna e riconsegna",
    intro:
      "Alla consegna e al ritiro il noleggiatore registra contaore, carburante e stato di ogni macchina, con foto, e firma. Tu controfirmi, aggiungendo osservazioni se qualcosa non corrisponde.",
    report: { delivery: "Verbale di consegna", return: "Verbale di riconsegna" } as Record<
      ReportKind,
      string
    >,
    record: { delivery: "Registra la consegna", return: "Registra il ritiro" } as Record<
      ReportKind,
      string
    >,
    notYet: {
      delivery: "Non ancora registrato: il noleggiatore lo registra alla consegna delle macchine.",
      return: "Non ancora registrato: il noleggiatore lo registra al ritiro delle macchine.",
    } as Record<ReportKind, string>,
    machine: "Macchina",
    hourMeter: "Contaore",
    fuel: "Carburante",
    condition: "Stato",
    hours: (h: string) => `${h} h`,
    used: (h: string) => `${h} h di utilizzo`,
    noMeter: "—",
    notes: "Note",
    photos: "Foto:",
    signedPartner: (name: string, at: string) => `Firmato dal noleggiatore: "${name}", ${at}`,
    signedClient: (name: string, at: string) => `Controfirmato dal cliente: "${name}", ${at}`,
    awaiting: "In attesa della controfirma del cliente",
    remarks: "Osservazioni del cliente",
    countersign: "Controfirma",
    fuels: {
      full: "Pieno",
      three_quarters: "¾",
      half: "½",
      quarter: "¼",
      empty: "Vuoto",
      not_applicable: "Non applicabile (elettrica)",
    } as Record<Fuel, string>,
    recordTitle: {
      delivery: "Verbale di consegna",
      return: "Verbale di riconsegna",
    } as Record<ReportKind, string>,
    recordHint: {
      delivery:
        "Compilalo quando consegni le macchine. Firmandolo inizia il noleggio; poi il cliente lo controfirma.",
      return:
        "Compilalo quando ritiri le macchine. Firmandolo il noleggio si conclude; poi il cliente lo controfirma. Addebita a parte danni o carburante mancante.",
    } as Record<ReportKind, string>,
    hourMeterField: "Contaore (h)",
    hourMeterHint: "Lascia vuoto se la macchina non lo ha",
    atDelivery: (h: string, fuel: string) => `Alla consegna: ${h}, carburante ${fuel}`,
    conditionPh: "Graffi, ammaccature, parti mancanti, pulizia…",
    notesField: "Note (facoltative)",
    photosField: `Foto (JPG, PNG, WebP · fino a ${MAX_PHOTOS}, max 5 MB ciascuna)`,
    confirmPartner: {
      delivery: "Confermo che le macchine sono state consegnate come descritto in questo verbale.",
      return: "Confermo che le macchine sono state ritirate come descritto in questo verbale.",
    } as Record<ReportKind, string>,
    signRecord: "Firma e registra",
    signTitle: (report: string) => `Controfirma il ${report.toLowerCase()}`,
    signHint:
      "Controlla letture e foto. Se qualcosa è sbagliato o manca, scrivilo nelle osservazioni: restano allegate al verbale.",
    remarksField: "Osservazioni (facoltative)",
    remarksPh: "Es. denti della benna usurati, non indicati nel verbale",
    confirmClient:
      "Ho controllato questo verbale. Quello su cui non sono d'accordo è nelle osservazioni.",
    sign: "Controfirma",
  },
})

const KINDS: ReportKind[] = ["delivery", "return"]

/** Both reports of an order, with the action each side can take. */
export function ReportsCard({
  order: o,
  role,
  onRecord,
  onSign,
  openFile,
}: {
  order: OrderView
  role: Viewer
  onRecord: (kind: ReportKind) => void
  onSign: (kind: ReportKind) => void
  openFile: (f: FileMeta) => void
}) {
  const t = useMessages(M)
  const next: ReportKind | null =
    o.status === "confirmed" ? "delivery" : o.status === "in_progress" ? "return" : null
  return (
    <Card id="reports" className="scroll-mt-24">
      <CardHead
        title={t.title}
        actions={
          role === "partner" &&
          next && (
            <Button size="sm" variant="primary" onClick={() => onRecord(next)}>
              {t.record[next]}
            </Button>
          )
        }
      />
      <Small className="mb-3">{t.intro}</Small>
      {KINDS.map((kind) => {
        const r = o.reports[kind]
        return (
          <Card key={kind} flat className="mb-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b>{t.report[kind]}</b>
              {r && !r.clientSignature && <Badge tone="warn">{t.awaiting}</Badge>}
              {r?.clientSignature && <Badge tone="ok">✓</Badge>}
            </div>
            {r ? (
              <ReportBody
                report={r}
                before={kind === "return" ? o.reports.delivery : undefined}
                openFile={openFile}
              />
            ) : (
              <Small className="mt-1">{t.notYet[kind]}</Small>
            )}
            {role === "client" && r && !r.clientSignature && (
              <div className="mt-2.5">
                <Button variant="primary" onClick={() => onSign(kind)}>
                  {t.countersign}
                </Button>
              </div>
            )}
          </Card>
        )
      })}
    </Card>
  )
}

function ReportBody({
  report: r,
  before,
  openFile,
}: {
  report: HandoverReport
  before?: HandoverReport
  openFile?: (f: FileMeta) => void
}) {
  const t = useMessages(M)
  const { dateTime, num } = useFormat()
  const at = (x?: Reading) => before?.readings.find((b) => b.itemId === x?.itemId)
  return (
    <>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-left">
              <th className="py-1 pr-3 font-medium">{t.machine}</th>
              <th className="py-1 pr-3 font-medium">{t.hourMeter}</th>
              <th className="py-1 pr-3 font-medium">{t.fuel}</th>
              <th className="py-1 font-medium">{t.condition}</th>
            </tr>
          </thead>
          <tbody>
            {r.readings.map((x) => {
              const b = at(x)
              const used =
                x.hourMeter !== null && b?.hourMeter != null ? x.hourMeter - b.hourMeter : null
              return (
                <tr key={x.itemId} className="border-t align-top">
                  <td className="py-1.5 pr-3">
                    {x.label}
                    {x.qty > 1 && ` ×${x.qty}`}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">
                    {x.hourMeter === null ? t.noMeter : t.hours(num(x.hourMeter))}
                    {used !== null && <Small className="text-faint">{t.used(num(used))}</Small>}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {t.fuels[x.fuel]}
                    {b && b.fuel !== x.fuel && (
                      <Small className="text-faint">← {t.fuels[b.fuel]}</Small>
                    )}
                  </td>
                  <td className="py-1.5">{x.condition || "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {r.notes && (
        <p className="mt-2 mb-0 text-sm">
          <b>{t.notes}:</b> {r.notes}
        </p>
      )}
      {openFile && r.files && r.files.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
          {t.photos}
          {r.files.map((f) => (
            <Button key={f.id} variant="link" onClick={() => openFile(f)}>
              {f.name}
            </Button>
          ))}
        </div>
      )}
      <Small className="text-faint mt-2">
        {t.signedPartner(r.partnerSignature.name, dateTime(r.partnerSignature.at))}
        {r.clientSignature && (
          <>
            <br />
            {t.signedClient(r.clientSignature.name, dateTime(r.clientSignature.at))}
          </>
        )}
      </Small>
      {r.clientSignature?.remarks && (
        <Alert tone="warn" size="sm" className="mt-2" title={t.remarks}>
          {r.clientSignature.remarks}
        </Alert>
      )}
    </>
  )
}

type Row = { hourMeter: string; fuel: Fuel | ""; condition: string }

/** Partner: the delivery or return report, signed. */
export function ReportDialog({
  order: o,
  kind,
  onClose,
  submit,
}: {
  order: OrderView
  kind: ReportKind
  onClose: () => void
  submit: Submit
}) {
  const t = useMessages(M)
  const c = useCommon()
  const { num } = useFormat()
  const s = useSubmit(submit, onClose)
  const delivery = o.reports.delivery
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      o.items.map((it) => {
        const prev = kind === "return" ? delivery?.readings.find((r) => r.itemId === it.id) : null
        return [
          it.id,
          {
            hourMeter: prev?.hourMeter != null ? String(prev.hourMeter) : "",
            fuel: prev?.fuel ?? "",
            condition: "",
          },
        ]
      })
    )
  )
  const [notes, setNotes] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [name, setName] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const set = (id: string, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }))
  const fuelOptions = [["", "—"] as const, ...FUELS.map((f) => [f, t.fuels[f]] as const)]
  return (
    <Modal
      open
      wide
      onOpenChange={(v) => !v && onClose()}
      title={t.recordTitle[kind]}
      description={t.recordHint[kind]}
    >
      <form
        onSubmit={(e) => (
          e.preventDefault(),
          s.run(async () => ({
            readings: o.items.map((it) => ({ itemId: it.id, ...rows[it.id] })),
            notes,
            photos: await Promise.all(files.slice(0, MAX_PHOTOS).map(readUpload)),
            signatureName: name,
            confirm: confirmed,
          }))
        )}
      >
        <ErrorLine message={s.message} fields={{}} />
        {o.items.map((it, i) => {
          const prev = delivery?.readings.find((r) => r.itemId === it.id)
          const pre = `readings.${i}.`
          return (
            <fieldset key={it.id} className="mb-3 rounded-lg border p-3">
              <legend className="px-1 text-sm font-semibold">
                {it.label}
                {it.qty > 1 && ` ×${it.qty}`}
              </legend>
              {kind === "return" && prev && (
                <Small className="mb-2">
                  {t.atDelivery(
                    prev.hourMeter === null ? t.noMeter : t.hours(num(prev.hourMeter)),
                    t.fuels[prev.fuel]
                  )}
                </Small>
              )}
              <div className="grid gap-x-3.5 sm:grid-cols-2">
                <Field
                  label={t.hourMeterField}
                  htmlFor={`rp-h-${i}`}
                  error={s.fields[`${pre}hourMeter`]}
                  hint={t.hourMeterHint}
                >
                  <Input
                    id={`rp-h-${i}`}
                    type="number"
                    min={0}
                    step={0.1}
                    value={rows[it.id].hourMeter}
                    onChange={(e) => set(it.id, { hourMeter: e.target.value })}
                  />
                </Field>
                <Field label={t.fuel} htmlFor={`rp-f-${i}`} error={s.fields[`${pre}fuel`]}>
                  <Select
                    id={`rp-f-${i}`}
                    value={rows[it.id].fuel}
                    onChange={(e) => set(it.id, { fuel: e.target.value as Fuel })}
                    options={fuelOptions}
                  />
                </Field>
              </div>
              <Field label={t.condition} htmlFor={`rp-c-${i}`} className="mb-0">
                <Input
                  id={`rp-c-${i}`}
                  value={rows[it.id].condition}
                  placeholder={t.conditionPh}
                  onChange={(e) => set(it.id, { condition: e.target.value })}
                />
              </Field>
            </fieldset>
          )
        })}
        <Field label={t.notesField} htmlFor="rp-notes">
          <Textarea id="rp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field label={t.photosField} htmlFor="rp-photos" error={s.fields["photos.0"]}>
          <input
            id="rp-photos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="text-sm"
          />
        </Field>
        <SignatureFields
          idPrefix="rp"
          name={name}
          onName={setName}
          confirmed={confirmed}
          onConfirmed={setConfirmed}
          confirmLabel={t.confirmPartner[kind]}
          fields={s.fields}
        />
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            {t.signRecord}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

/** Client: countersigns a report, with optional remarks. */
export function SignReportDialog({
  order: o,
  kind,
  onClose,
  submit,
}: {
  order: OrderView
  kind: ReportKind
  onClose: () => void
  submit: Submit
}) {
  const t = useMessages(M)
  const c = useCommon()
  const s = useSubmit(submit, onClose)
  const [remarks, setRemarks] = useState("")
  const [name, setName] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const report = o.reports[kind]
  if (!report) return null
  return (
    <Modal
      open
      wide
      onOpenChange={(v) => !v && onClose()}
      title={t.signTitle(t.report[kind])}
      description={t.signHint}
    >
      <ReportBody report={report} before={kind === "return" ? o.reports.delivery : undefined} />
      <form
        className="mt-4"
        onSubmit={(e) => (
          e.preventDefault(),
          s.run({ remarks, signatureName: name, confirm: confirmed })
        )}
      >
        <ErrorLine message={s.message} fields={{}} />
        <Field label={t.remarksField} htmlFor="sr-remarks">
          <Textarea
            id="sr-remarks"
            value={remarks}
            placeholder={t.remarksPh}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </Field>
        <SignatureFields
          idPrefix="sr"
          name={name}
          onName={setName}
          confirmed={confirmed}
          onConfirmed={setConfirmed}
          confirmLabel={t.confirmClient}
          fields={s.fields}
        />
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="primary" disabled={s.busy}>
            {t.sign}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
