import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { eur, num } from "@/lib/machina/format"
import { LINE_TYPE } from "@/lib/machina/labels"
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

/** Net / VAT / total. A partial total (lines still to price) is flagged, never shown as final. */
export function TotalsBox({ totals, className }: { totals: TotalsLike; className?: string }) {
  const partial = totals.complete === false
  return (
    <div className={className}>
      <table className="ml-auto w-full max-w-[360px] text-[0.92rem]">
        <tbody>
          <tr>
            <td className="py-1">Net{partial && " (priced lines)"}</td>
            <td className="py-1 text-right tabular-nums">{eur(totals.net)}</td>
          </tr>
          <tr>
            <td className="py-1">VAT {totals.vatRate}%</td>
            <td className="py-1 text-right tabular-nums">{eur(totals.vat)}</td>
          </tr>
          <tr className="border-foreground border-t-2 text-[1.05rem] font-bold">
            <td className="pt-2">{partial ? "Partial estimate" : "Total"}</td>
            <td className="pt-2 text-right tabular-nums">{eur(totals.gross)}</td>
          </tr>
        </tbody>
      </table>
      {partial && (
        <Alert tone="warn" size="sm" className="mt-2" title="Total not final">
          {totals.missing} line{totals.missing === 1 ? " is" : "s are"} still to be priced by the
          partner and not included.
        </Alert>
      )}
    </div>
  )
}

/** Read-only quote lines; unpriced lines are highlighted. */
export function LinesTable({ lines, totals }: { lines: Line[]; totals?: TotalsLike }) {
  return (
    <>
      <TableWrap>
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Qty</th>
            <th className="num">Unit price</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const unpriced = l.amount === null || l.amount === undefined
            return (
              <tr key={l.id ?? i} className={cn(unpriced && "to-confirm")}>
                <td className="min-w-[200px]">
                  <div className="text-faint mb-1 text-[0.7rem] font-semibold tracking-[0.1em] uppercase">
                    {LINE_TYPE[l.type]}
                  </div>
                  <div className="font-medium">{l.description}</div>
                  {l.note && <div className="text-muted-foreground text-[0.85rem]">{l.note}</div>}
                  {l.origin && <div className="text-faint text-[0.85rem]">{l.origin}</div>}
                </td>
                <td className="num">
                  {num(l.qty)} <span className="text-faint text-[0.85rem]">{l.unit}</span>
                </td>
                <td className="num">
                  {l.unitPrice === null ? <Badge tone="warn">to price</Badge> : eur(l.unitPrice)}
                </td>
                <td className="num">
                  {unpriced ? <Badge tone="warn">to confirm</Badge> : eur(l.amount)}
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
