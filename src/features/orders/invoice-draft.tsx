"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"

import { KV } from "@/components/app/bits"
import { LinesTable } from "@/components/app/lines-table"
import { QueryView } from "@/components/app/query-view"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { api, downloadText } from "@/lib/machina/api"
import { date, dateTime, eur, num } from "@/lib/machina/format"
import type { InvoiceDraft } from "@/lib/machina/types"

function asText(d: InvoiceDraft): string {
  const L: string[] = [
    d.title,
    "",
    `Generated on ${dateTime(d.generatedAt)}`,
    `Order reference: ${d.orderCode} (quote ${d.quoteCode} v${d.acceptedVersion})`,
    "",
    "RENTAL COMPANY",
    d.issuer.name,
    `VAT ${d.issuer.vat ?? ""}`,
    `${d.issuer.address}, ${d.issuer.city} (${d.issuer.province})`,
    `PEC ${d.issuer.pec ?? ""}`,
    "",
    "CUSTOMER",
    d.customer.name,
    `VAT ${d.customer.vat ?? ""}`,
    `${d.customer.address}, ${d.customer.city} (${d.customer.province})`,
    `PEC ${d.customer.pec ?? ""} · SDI ${d.customer.sdi ?? ""}`,
    "",
    `Rental period: ${date(d.period.from)} - ${date(d.period.to)}`,
    `Site: ${d.site.name}, ${d.site.address}, ${d.site.city} (${d.site.province})`,
    "",
    ...d.lines.map(
      (l) =>
        `- ${l.description} | ${num(l.qty)} ${l.unit ?? ""} x ${eur(l.unitPrice)} = ${eur(l.amount)}${l.origin ? ` [${l.origin}]` : ""}`
    ),
    "",
    `Net: ${eur(d.totals.net)}`,
    `VAT ${d.totals.vatRate}%: ${eur(d.totals.vat)}`,
    `Total: ${eur(d.totals.gross)}`,
    "",
    d.disclaimer,
  ]
  return L.join("\n")
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  )

/** Standalone HTML copy of the draft, for saving or sending. */
function asHtml(d: InvoiceDraft): string {
  const e = escapeHtml
  const party = (title: string, p: InvoiceDraft["issuer"] | InvoiceDraft["customer"], extra = "") =>
    `<div><h3>${title}</h3><b>${e(p.name)}</b><br>VAT ${e(p.vat || "—")}<br>${e(p.address)}<br>${e(p.city)} (${e(p.province)})<br>PEC ${e(p.pec || "—")}${extra}</div>`
  const rows = d.lines
    .map(
      (l) =>
        `<tr><td>${e(l.description)}${l.origin ? `<br><small>${e(l.origin)}</small>` : ""}</td><td class="n">${num(l.qty)} ${e(l.unit ?? "")}</td><td class="n">${eur(l.unitPrice)}</td><td class="n">${eur(l.amount)}</td></tr>`
    )
    .join("")
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${e(d.title)} ${e(d.orderCode)}</title>
<style>body{font-family:system-ui,sans-serif;color:#25282b;max-width:860px;margin:24px auto;padding:0 16px}
.banner{border:2px dashed #b3261e;color:#b3261e;font-weight:700;text-align:center;padding:10px;margin-bottom:16px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:16px 0}h3{font-size:.8rem;text-transform:uppercase;color:#5d6166}
table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e2e2dc;padding:6px;text-align:left;vertical-align:top}.n{text-align:right;white-space:nowrap}
small{color:#8a8e93}</style></head><body>
<div class="banner">${e(d.title)}</div>
<p>Number: <b>not assigned</b> (tax numbering by the rental company) · Generated on ${dateTime(d.generatedAt)}</p>
<div class="parties">${party("Rental company (supplier)", d.issuer)}${party("Customer", d.customer, `<br>SDI code ${e(d.customer.sdi || "—")}`)}</div>
<p>Order ${e(d.orderCode)} · quote ${e(d.quoteCode)} v${d.acceptedVersion}<br>Rental period: ${date(d.period.from)} → ${date(d.period.to)}<br>
Site: ${e(d.site.name)}, ${e(d.site.address)}, ${e(d.site.city)} (${e(d.site.province)})</p>
<table><thead><tr><th>Description</th><th class="n">Qty</th><th class="n">Unit price</th><th class="n">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<p class="n">Net ${eur(d.totals.net)}<br>VAT ${d.totals.vatRate}% ${eur(d.totals.vat)}<br><b>Total ${eur(d.totals.gross)}</b></p>
<p><small>${e(d.disclaimer)}</small></p></body></html>`
}

type PartyInfo = Pick<
  InvoiceDraft["issuer"],
  "name" | "vat" | "address" | "city" | "province" | "pec"
>

function Party({ title, p, extra }: { title: string; p: PartyInfo; extra?: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground mb-2.5 text-[0.78rem] font-bold tracking-wide uppercase">
        {title}
      </div>
      <b>{p.name}</b>
      <br />
      VAT {p.vat || "—"}
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
  const q = useQuery({
    queryKey: ["invoice-draft", orderId],
    queryFn: () => api.get<InvoiceDraft>(`/api/orders/${orderId}/invoice-draft`),
  })
  return (
    <QueryView query={q}>
      {(d) => (
        <>
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
            <Link href={backHref}>← Back to order {d.orderCode}</Link>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(asText(d))
                    toast.success("Data copied to the clipboard")
                  } catch {
                    downloadText(`draft-${d.orderCode}.txt`, asText(d))
                    toast.info("Clipboard not available: downloaded a text file instead")
                  }
                }}
              >
                Copy data
              </Button>
              <Button
                onClick={() =>
                  downloadText(
                    `DRAFT-invoice-${d.orderCode}.html`,
                    asHtml(d),
                    "text/html;charset=utf-8"
                  )
                }
              >
                Download draft
              </Button>
              <Button onClick={() => window.print()}>Print</Button>
            </div>
          </div>
          <article className="bg-card mx-auto max-w-[860px] rounded-lg border p-6 shadow-sm print:border-0 print:shadow-none">
            <div className="border-bad text-bad mb-4 border-2 border-dashed p-2.5 text-center font-bold">
              {d.title}
            </div>
            <div className="mb-4 flex flex-wrap justify-between gap-2 text-sm">
              <span>
                Number: <b>not assigned</b> (tax numbering by the rental company)
              </span>
              <span>Generated on {dateTime(d.generatedAt)}</span>
            </div>
            <div className="mb-4 grid gap-6 sm:grid-cols-2">
              <Party title="Rental company (supplier)" p={d.issuer} />
              <Party
                title="Customer"
                p={d.customer}
                extra={
                  <>
                    <br />
                    SDI code {d.customer.sdi || "—"}
                  </>
                }
              />
            </div>
            <KV
              className="mb-4"
              items={[
                ["Order reference", `${d.orderCode} · quote ${d.quoteCode} v${d.acceptedVersion}`],
                [
                  "Rental period",
                  `${date(d.period.from)} → ${date(d.period.to)}${
                    d.period.to !== d.originalPeriod.to
                      ? ` (extended; originally until ${date(d.originalPeriod.to)})`
                      : ""
                  }`,
                ],
                [
                  "Description",
                  `Machinery rental at site ${d.site.name}, ${d.site.address}, ${d.site.city} (${d.site.province})`,
                ],
              ]}
            />
            <LinesTable lines={d.lines} totals={{ ...d.totals, complete: true }} />
            {(d.excluded.pendingChanges > 0 ||
              d.excluded.contestedCharges > 0 ||
              d.excluded.pendingCharges > 0) && (
              <Alert size="sm" className="mt-3" title="Amounts excluded from the draft">
                {d.excluded.pendingChanges > 0 && (
                  <div>Changes not yet approved: {eur(d.excluded.pendingChanges)}</div>
                )}
                {d.excluded.pendingCharges > 0 && (
                  <div>Charges to review: {eur(d.excluded.pendingCharges)}</div>
                )}
                {d.excluded.contestedCharges > 0 && (
                  <div>Disputed charges: {eur(d.excluded.contestedCharges)}</div>
                )}
              </Alert>
            )}
            {d.invoicesIssued.length > 0 && (
              <Alert tone="warn" size="sm" className="mt-3" title="Tax documents already issued">
                {d.invoicesIssued.map((i) => `no. ${i.number} of ${date(i.date)}`).join(", ")}. Any
                later changes must be handled with a separate document.
              </Alert>
            )}
            <p className="text-muted-foreground mt-4 text-sm">{d.disclaimer}</p>
          </article>
        </>
      )}
    </QueryView>
  )
}
