"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"

import { KV } from "@/components/app/bits"
import { LinesTable } from "@/components/app/lines-table"
import { QueryView } from "@/components/app/query-view"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useFormat, useMessages } from "@/i18n/client"
import type { Format } from "@/i18n/format"
import { defineMessages } from "@/i18n/messages"
import { api, downloadText } from "@/lib/machina/api"
import type { InvoiceDraft } from "@/lib/machina/types"

const M = defineMessages({
  en: {
    generatedOn: (at: string) => `Generated on ${at}`,
    orderRefLine: (order: string, quote: string, v: number) =>
      `Order reference: ${order} (quote ${quote} v${v})`,
    rentalCompanyCaps: "RENTAL COMPANY",
    customerCaps: "CUSTOMER",
    vat: "VAT",
    rentalPeriodLine: (from: string, to: string) => `Rental period: ${from} - ${to}`,
    siteLine: (site: string) => `Site: ${site}`,
    net: "Net",
    total: "Total",
    sdiCode: "SDI code",
    number: "Number",
    numberNote: "(tax numbering by the rental company)",
    notAssigned: "not assigned",
    supplier: "Rental company (supplier)",
    customer: "Customer",
    order: "Order",
    quote: "quote",
    description: "Description",
    qty: "Qty",
    unitPrice: "Unit price",
    amount: "Amount",
    back: (code: string) => `← Back to order ${code}`,
    copied: "Data copied to the clipboard",
    noClipboard: "Clipboard not available: downloaded a text file instead",
    copy: "Copy data",
    download: "Download draft",
    print: "Print",
    orderReference: "Order reference",
    rentalPeriod: "Rental period",
    extended: (until: string) => ` (extended; originally until ${until})`,
    machineryAt: (site: string) => `Machinery rental at site ${site}`,
    excluded: "Amounts excluded from the draft",
    notApproved: (a: string) => `Changes not yet approved: ${a}`,
    toReview: (a: string) => `Charges to review: ${a}`,
    disputed: (a: string) => `Disputed charges: ${a}`,
    issued: "Tax documents already issued",
    issuedDoc: (n: string, on: string) => `no. ${n} of ${on}`,
    laterChanges: "Any later changes must be handled with a separate document.",
    fileName: "DRAFT-invoice",
  },
  it: {
    generatedOn: (at: string) => `Generata il ${at}`,
    orderRefLine: (order: string, quote: string, v: number) =>
      `Riferimento ordine: ${order} (preventivo ${quote} v${v})`,
    rentalCompanyCaps: "NOLEGGIATORE",
    customerCaps: "CLIENTE",
    vat: "P. IVA",
    rentalPeriodLine: (from: string, to: string) => `Periodo di noleggio: ${from} - ${to}`,
    siteLine: (site: string) => `Cantiere: ${site}`,
    net: "Imponibile",
    total: "Totale",
    sdiCode: "Codice SDI",
    number: "Numero",
    numberNote: "(numerazione fiscale a cura del noleggiatore)",
    notAssigned: "non assegnato",
    supplier: "Noleggiatore (fornitore)",
    customer: "Cliente",
    order: "Ordine",
    quote: "preventivo",
    description: "Descrizione",
    qty: "Q.tà",
    unitPrice: "Prezzo unitario",
    amount: "Importo",
    back: (code: string) => `← Torna all'ordine ${code}`,
    copied: "Dati copiati negli appunti",
    noClipboard: "Appunti non disponibili: scaricato un file di testo",
    copy: "Copia i dati",
    download: "Scarica la bozza",
    print: "Stampa",
    orderReference: "Riferimento ordine",
    rentalPeriod: "Periodo di noleggio",
    extended: (until: string) => ` (prorogato; inizialmente fino al ${until})`,
    machineryAt: (site: string) => `Noleggio macchine presso il cantiere ${site}`,
    excluded: "Importi esclusi dalla bozza",
    notApproved: (a: string) => `Modifiche non ancora approvate: ${a}`,
    toReview: (a: string) => `Addebiti da verificare: ${a}`,
    disputed: (a: string) => `Addebiti contestati: ${a}`,
    issued: "Documenti fiscali già emessi",
    issuedDoc: (n: string, on: string) => `n. ${n} del ${on}`,
    laterChanges: "Eventuali modifiche successive vanno gestite con un documento separato.",
    fileName: "BOZZA-fattura",
  },
})

type Texts = (typeof M)["en"]

const siteText = (d: InvoiceDraft) =>
  `${d.site.name}, ${d.site.address}, ${d.site.city} (${d.site.province})`

function asText(d: InvoiceDraft, t: Texts, f: Format): string {
  const lines: string[] = [
    d.title,
    "",
    t.generatedOn(f.dateTime(d.generatedAt)),
    t.orderRefLine(d.orderCode, d.quoteCode, d.acceptedVersion),
    "",
    t.rentalCompanyCaps,
    d.issuer.name,
    `${t.vat} ${d.issuer.vat ?? ""}`,
    `${d.issuer.address}, ${d.issuer.city} (${d.issuer.province})`,
    `PEC ${d.issuer.pec ?? ""}`,
    "",
    t.customerCaps,
    d.customer.name,
    `${t.vat} ${d.customer.vat ?? ""}`,
    `${d.customer.address}, ${d.customer.city} (${d.customer.province})`,
    `PEC ${d.customer.pec ?? ""} · SDI ${d.customer.sdi ?? ""}`,
    "",
    t.rentalPeriodLine(f.date(d.period.from), f.date(d.period.to)),
    t.siteLine(siteText(d)),
    "",
    ...d.lines.map(
      (l) =>
        `- ${l.description} | ${f.num(l.qty)} ${l.unit ?? ""} x ${f.eur(l.unitPrice)} = ${f.eur(l.amount)}${l.origin ? ` [${l.origin}]` : ""}`
    ),
    "",
    `${t.net}: ${f.eur(d.totals.net)}`,
    `${t.vat} ${d.totals.vatRate}%: ${f.eur(d.totals.vat)}`,
    `${t.total}: ${f.eur(d.totals.gross)}`,
    "",
    d.disclaimer,
  ]
  return lines.join("\n")
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  )

/** Standalone HTML copy of the draft, for saving or sending. */
function asHtml(d: InvoiceDraft, t: Texts, f: Format): string {
  const e = escapeHtml
  const party = (title: string, p: InvoiceDraft["issuer"] | InvoiceDraft["customer"], extra = "") =>
    `<div><h3>${e(title)}</h3><b>${e(p.name)}</b><br>${t.vat} ${e(p.vat || "—")}<br>${e(p.address)}<br>${e(p.city)} (${e(p.province)})<br>PEC ${e(p.pec || "—")}${extra}</div>`
  const rows = d.lines
    .map(
      (l) =>
        `<tr><td>${e(l.description)}${l.origin ? `<br><small>${e(l.origin)}</small>` : ""}</td><td class="n">${f.num(l.qty)} ${e(l.unit ?? "")}</td><td class="n">${f.eur(l.unitPrice)}</td><td class="n">${f.eur(l.amount)}</td></tr>`
    )
    .join("")
  return `<!doctype html><html lang="${f.locale}"><head><meta charset="utf-8"><title>${e(d.title)} ${e(d.orderCode)}</title>
<style>body{font-family:system-ui,sans-serif;color:#25282b;max-width:860px;margin:24px auto;padding:0 16px}
.banner{border:2px dashed #b3261e;color:#b3261e;font-weight:700;text-align:center;padding:10px;margin-bottom:16px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:16px 0}h3{font-size:.8rem;text-transform:uppercase;color:#5d6166}
table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e2e2dc;padding:6px;text-align:left;vertical-align:top}.n{text-align:right;white-space:nowrap}
small{color:#8a8e93}</style></head><body>
<div class="banner">${e(d.title)}</div>
<p>${e(t.number)}: <b>${e(t.notAssigned)}</b> ${e(t.numberNote)} · ${e(t.generatedOn(f.dateTime(d.generatedAt)))}</p>
<div class="parties">${party(t.supplier, d.issuer)}${party(t.customer, d.customer, `<br>${t.sdiCode} ${e(d.customer.sdi || "—")}`)}</div>
<p>${e(t.order)} ${e(d.orderCode)} · ${e(t.quote)} ${e(d.quoteCode)} v${d.acceptedVersion}<br>${e(t.rentalPeriodLine(f.date(d.period.from), f.date(d.period.to)))}<br>
${e(t.siteLine(siteText(d)))}</p>
<table><thead><tr><th>${e(t.description)}</th><th class="n">${e(t.qty)}</th><th class="n">${e(t.unitPrice)}</th><th class="n">${e(t.amount)}</th></tr></thead><tbody>${rows}</tbody></table>
<p class="n">${e(t.net)} ${f.eur(d.totals.net)}<br>${t.vat} ${d.totals.vatRate}% ${f.eur(d.totals.vat)}<br><b>${e(t.total)} ${f.eur(d.totals.gross)}</b></p>
<p><small>${e(d.disclaimer)}</small></p></body></html>`
}

type PartyInfo = Pick<
  InvoiceDraft["issuer"],
  "name" | "vat" | "address" | "city" | "province" | "pec"
>

function Party({ title, p, extra }: { title: string; p: PartyInfo; extra?: React.ReactNode }) {
  const t = useMessages(M)
  return (
    <div>
      <div className="text-muted-foreground mb-2.5 text-[0.78rem] font-bold tracking-wide uppercase">
        {title}
      </div>
      <b>{p.name}</b>
      <br />
      {t.vat} {p.vat || "—"}
      <br />
      {p.address}
      <br />
      {p.city} ({p.province})
      <br />
      PEC {p.pec || "—"}
      {extra}
    </div>
  )
}

export function InvoiceDraftView({ orderId, backHref }: { orderId: string; backHref: string }) {
  const t = useMessages(M)
  const f = useFormat()
  const { date, dateTime, eur } = f
  const q = useQuery({
    queryKey: ["invoice-draft", orderId],
    queryFn: () => api.get<InvoiceDraft>(`/api/orders/${orderId}/invoice-draft`),
  })
  return (
    <QueryView query={q}>
      {(d) => (
        <>
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
            <Link href={backHref}>{t.back(d.orderCode)}</Link>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(asText(d, t, f))
                    toast.success(t.copied)
                  } catch {
                    downloadText(`draft-${d.orderCode}.txt`, asText(d, t, f))
                    toast.info(t.noClipboard)
                  }
                }}
              >
                {t.copy}
              </Button>
              <Button
                onClick={() =>
                  downloadText(
                    `${t.fileName}-${d.orderCode}.html`,
                    asHtml(d, t, f),
                    "text/html;charset=utf-8"
                  )
                }
              >
                {t.download}
              </Button>
              <Button onClick={() => window.print()}>{t.print}</Button>
            </div>
          </div>
          <article className="bg-card mx-auto max-w-[860px] rounded-lg border p-6 shadow-sm print:border-0 print:shadow-none">
            <div className="border-bad text-bad mb-4 border-2 border-dashed p-2.5 text-center font-bold">
              {d.title}
            </div>
            <div className="mb-4 flex flex-wrap justify-between gap-2 text-sm">
              <span>
                {t.number}: <b>{t.notAssigned}</b> {t.numberNote}
              </span>
              <span>{t.generatedOn(dateTime(d.generatedAt))}</span>
            </div>
            <div className="mb-4 grid gap-6 sm:grid-cols-2">
              <Party title={t.supplier} p={d.issuer} />
              <Party
                title={t.customer}
                p={d.customer}
                extra={
                  <>
                    <br />
                    {t.sdiCode} {d.customer.sdi || "—"}
                  </>
                }
              />
            </div>
            <KV
              className="mb-4"
              items={[
                [
                  t.orderReference,
                  `${d.orderCode} · ${t.quote} ${d.quoteCode} v${d.acceptedVersion}`,
                ],
                [
                  t.rentalPeriod,
                  `${date(d.period.from)} → ${date(d.period.to)}${
                    d.period.to !== d.originalPeriod.to ? t.extended(date(d.originalPeriod.to)) : ""
                  }`,
                ],
                [t.description, t.machineryAt(siteText(d))],
              ]}
            />
            <LinesTable lines={d.lines} totals={{ ...d.totals, complete: true }} />
            {(d.excluded.pendingChanges > 0 ||
              d.excluded.contestedCharges > 0 ||
              d.excluded.pendingCharges > 0) && (
              <Alert size="sm" className="mt-3" title={t.excluded}>
                {d.excluded.pendingChanges > 0 && (
                  <div>{t.notApproved(eur(d.excluded.pendingChanges))}</div>
                )}
                {d.excluded.pendingCharges > 0 && (
                  <div>{t.toReview(eur(d.excluded.pendingCharges))}</div>
                )}
                {d.excluded.contestedCharges > 0 && (
                  <div>{t.disputed(eur(d.excluded.contestedCharges))}</div>
                )}
              </Alert>
            )}
            {d.invoicesIssued.length > 0 && (
              <Alert tone="warn" size="sm" className="mt-3" title={t.issued}>
                {d.invoicesIssued.map((i) => t.issuedDoc(i.number, date(i.date))).join(", ")}.{" "}
                {t.laterChanges}
              </Alert>
            )}
            <p className="text-muted-foreground mt-4 text-sm">{d.disclaimer}</p>
          </article>
        </>
      )}
    </QueryView>
  )
}
