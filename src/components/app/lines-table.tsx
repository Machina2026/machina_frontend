"use client"

import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { useLabels } from "@/lib/machina/labels"
import type { Line } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

import { TableWrap } from "./bits"

export type TotalsLike = {
  net: number
  vat: number
  gross: number
  vatRate: number
  complete?: boolean
  missing?: number
}

const M = defineMessages({
  en: {
    net: "Net",
    pricedLines: " (priced lines)",
    vat: (rate: number) => `VAT ${rate}%`,
    partialEstimate: "Partial estimate",
    total: "Total",
    notFinal: "Total not final",
    missing: (n: number) =>
      `${n} line${n === 1 ? " is" : "s are"} still to be priced by the partner and not included.`,
    item: "Item",
    qty: "Qty",
    unitPrice: "Unit price",
    amount: "Amount",
    toPrice: "to price",
    toConfirm: "to confirm",
  },
  it: {
    net: "Imponibile",
    pricedLines: " (righe con prezzo)",
    vat: (rate: number) => `IVA ${rate}%`,
    partialEstimate: "Stima parziale",
    total: "Totale",
    notFinal: "Totale non definitivo",
    missing: (n: number) =>
      n === 1
        ? "1 riga deve ancora essere quotata dal noleggiatore e non è inclusa."
        : `${n} righe devono ancora essere quotate dal noleggiatore e non sono incluse.`,
    item: "Voce",
    qty: "Q.tà",
    unitPrice: "Prezzo unitario",
    amount: "Importo",
    toPrice: "da quotare",
    toConfirm: "da confermare",
  },
})

/** Net / VAT / total. A partial total (lines still to price) is flagged, never shown as final. */
export function TotalsBox({ totals, className }: { totals: TotalsLike; className?: string }) {
  const m = useMessages(M)
  const { eur } = useFormat()
  const partial = totals.complete === false
  return (
    <div className={className}>
      <table className="ml-auto w-full max-w-[360px] text-[0.92rem]">
        <tbody>
          <tr>
            <td className="py-1">
              {m.net}
              {partial && m.pricedLines}
            </td>
            <td className="py-1 text-right tabular-nums">{eur(totals.net)}</td>
          </tr>
          <tr>
            <td className="py-1">{m.vat(totals.vatRate)}</td>
            <td className="py-1 text-right tabular-nums">{eur(totals.vat)}</td>
          </tr>
          <tr className="border-foreground border-t-2 text-[1.05rem] font-bold">
            <td className="pt-2">{partial ? m.partialEstimate : m.total}</td>
            <td className="pt-2 text-right tabular-nums">{eur(totals.gross)}</td>
          </tr>
        </tbody>
      </table>
      {partial && (
        <Alert tone="warn" size="sm" className="mt-2" title={m.notFinal}>
          {m.missing(totals.missing ?? 0)}
        </Alert>
      )}
    </div>
  )
}

/** Read-only quote lines; unpriced lines are highlighted. */
export function LinesTable({ lines, totals }: { lines: Line[]; totals?: TotalsLike }) {
  const m = useMessages(M)
  const L = useLabels()
  const { eur, num } = useFormat()
  return (
    <>
      <TableWrap>
        <thead>
          <tr>
            <th>{m.item}</th>
            <th className="num">{m.qty}</th>
            <th className="num">{m.unitPrice}</th>
            <th className="num">{m.amount}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const unpriced = l.amount === null || l.amount === undefined
            return (
              <tr key={l.id ?? i} className={cn(unpriced && "to-confirm")}>
                <td className="min-w-[200px]">
                  <div className="text-faint mb-1 text-[0.7rem] font-semibold tracking-[0.1em] uppercase">
                    {L.LINE_TYPE[l.type]}
                  </div>
                  <div className="font-medium">{l.description}</div>
                  {l.note && <div className="text-muted-foreground text-[0.85rem]">{l.note}</div>}
                  {l.origin && <div className="text-faint text-[0.85rem]">{l.origin}</div>}
                </td>
                <td className="num">
                  {num(l.qty)} <span className="text-faint text-[0.85rem]">{l.unit}</span>
                </td>
                <td className="num">
                  {l.unitPrice === null ? <Badge tone="warn">{m.toPrice}</Badge> : eur(l.unitPrice)}
                </td>
                <td className="num">
                  {unpriced ? <Badge tone="warn">{m.toConfirm}</Badge> : eur(l.amount)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </TableWrap>
      {totals && <TotalsBox totals={totals} className="mt-3" />}
    </>
  )
}
