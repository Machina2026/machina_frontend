"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { Scale } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Crumbs, MarkList, Small } from "@/components/app/bits"
import { EmptyState } from "@/components/states/empty-state"
import { LoadingState } from "@/components/states/loading-state"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { api, ApiError } from "@/lib/machina/api"
import { addDays, date, eur, num, today } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import type { CompareResponse, CompareRow, LineType, ModelDetail } from "@/lib/machina/types"

import { AddToDraftDialog } from "./add-to-draft"

type Body = {
  offerIds: string[]
  from: string
  to: string
  province: string
  qty: string
  transport: boolean
  operator: boolean
  accessoryIds: string[]
}

export function CompareView({ query }: { query: Record<string, string> }) {
  const meta = useMeta().data
  const model = useQuery({
    queryKey: ["model", query.model],
    queryFn: () => api.get<ModelDetail>(`/api/models/${query.model}`),
    enabled: Boolean(query.model),
  })
  const offerIds = query.offers
    ? query.offers.split(",").filter(Boolean)
    : (model.data?.offers.map((o) => o.id) ?? [])
  const [form, setForm] = useState(() => {
    const from = query.from || addDays(today(), 7)
    return {
      from,
      to: query.to || addDays(from, 4),
      province: query.prov || "TO",
      qty: query.qty || "1",
      transport: query.transport !== "0",
      operator: query.operator === "1",
      accessoryIds: (query.acc ?? "").split(",").filter(Boolean),
    }
  })
  const [adding, setAdding] = useState<CompareRow | null>(null)
  const compare = useMutation({
    mutationFn: (body: Body) =>
      api.post<CompareResponse>("/api/compare", body).then((res) => ({ res, body })),
  })
  const fieldErrors = compare.error instanceof ApiError ? compare.error.fields : {}

  const ready = !query.model || model.isSuccess
  const idsKey = offerIds.join(",")
  const { mutate } = compare
  useEffect(() => {
    // Run the first comparison once the offer list is known; later runs come from the form.
    if (ready && idsKey) mutate({ ...form, offerIds: idsKey.split(",") })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, idsKey, mutate])

  if (query.model && model.isPending) return <LoadingState />
  if (!offerIds.length) {
    return (
      <EmptyState
        icon={Scale}
        title="Nothing to compare yet"
        description="Open a machine with more than one offer and pick the offers to compare side by side."
        action={
          <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
            Go to the catalogue
          </Link>
        }
      />
    )
  }
  const accOptions = model.data?.accessories ?? meta?.accessories ?? []
  const m = model.data?.model

  return (
    <>
      <Crumbs
        items={[
          ["Catalogue", "/catalog"],
          ...(m ? [[`${m.brand} ${m.model}`, `/models/${m.id}`] as const] : []),
          ["Comparison"],
        ]}
      />
      <h1>Compare offers</h1>
      <p className="text-muted-foreground">
        Every offer is calculated with <b>the same period and the same needs</b>. Lines the partner
        still has to price are left out of the total.
      </p>
      <Card flat>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            compare.mutate({ ...form, offerIds })
          }}
        >
          <div className="grid gap-x-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="From" htmlFor="c-from" error={fieldErrors.from}>
              <Input
                id="c-from"
                type="date"
                value={form.from}
                aria-invalid={!!fieldErrors.from}
                onChange={(e) => setForm({ ...form, from: e.target.value })}
              />
            </Field>
            <Field label="To" htmlFor="c-to" error={fieldErrors.to}>
              <Input
                id="c-to"
                type="date"
                value={form.to}
                aria-invalid={!!fieldErrors.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
              />
            </Field>
            <Field label="Site province" htmlFor="c-prov" error={fieldErrors.province}>
              <Select
                id="c-prov"
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                options={(meta?.provinces ?? []).map((p) => [p.id, `${p.name} (${p.id})`] as const)}
              />
            </Field>
            <Field label="Quantity" htmlFor="c-qty">
              <Input
                id="c-qty"
                type="number"
                min={1}
                max={10}
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Check
              label="Delivery to site"
              checked={form.transport}
              onChange={(e) => setForm({ ...form, transport: e.target.checked })}
            />
            <Check
              label="With operator"
              checked={form.operator}
              onChange={(e) => setForm({ ...form, operator: e.target.checked })}
            />
            {accOptions.map((a) => (
              <Check
                key={a.id}
                label={a.name}
                checked={form.accessoryIds.includes(a.id)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    accessoryIds: e.target.checked
                      ? [...form.accessoryIds, a.id]
                      : form.accessoryIds.filter((x) => x !== a.id),
                  })
                }
              />
            ))}
            <Button type="submit" variant="primary" disabled={compare.isPending}>
              Update comparison
            </Button>
          </div>
        </form>
      </Card>
      <div className="mt-4">
        {compare.isPending && <LoadingState rows={2} />}
        {compare.isError && <Alert tone="warn">{compare.error.message}</Alert>}
        {compare.data && (
          <CompareResults res={compare.data.res} body={compare.data.body} onAdd={setAdding} />
        )}
      </div>
      {adding && compare.data && (
        <AddToDraftDialog
          offer={adding.offer}
          model={adding.model}
          preset={{
            qty: Number(compare.data.body.qty) || 1,
            accessoryIds: compare.data.body.accessoryIds,
            transport: compare.data.body.transport,
            operator: compare.data.body.operator,
            from: compare.data.res.period.from,
            to: compare.data.res.period.to,
          }}
          onClose={() => setAdding(null)}
        />
      )}
    </>
  )
}

function CompareResults({
  res,
  body,
  onAdd,
}: {
  res: CompareResponse
  body: Body
  onAdd: (r: CompareRow) => void
}) {
  const R = res.results
  // Cheapest offer whose total is complete (partial estimates can't be compared fairly).
  const complete = R.filter((r) => r.totals.complete)
  const bestId =
    complete.length > 1
      ? complete.reduce((a, b) => (b.totals.gross < a.totals.gross ? b : a)).offer.id
      : null
  const lineAmt = (r: CompareRow, type: LineType) => {
    const ls = r.lines.filter((l) => l.type === type)
    if (!ls.length) return null
    return ls.map((l, i) => (
      <div key={i}>
        {l.amount === null ? <Badge tone="warn">to price</Badge> : <b>{eur(l.amount)}</b>}
        <Small>
          {type === "accessory" && `${l.description} · `}
          {l.note}
        </Small>
      </div>
    ))
  }
  const muted = (s: string) => <span className="text-muted-foreground">{s}</span>
  const rows: [string, (r: CompareRow) => React.ReactNode][] = [
    [
      "Partner",
      (r) => (
        <>
          <b>{r.offer.partner.name}</b>
          <Small>{r.offer.partner.city}</Small>
          {r.inZone ? (
            <Badge tone="ok">area served</Badge>
          ) : (
            <Badge tone="warn">outside area</Badge>
          )}
        </>
      ),
    ],
    ["Model", (r) => `${r.model.brand} ${r.model.model}`],
    [
      "Rates",
      (r) => (
        <>
          {eur(r.offer.prices.day)}/day
          {r.offer.prices.week && (
            <>
              <br />
              {eur(r.offer.prices.week)}/week
            </>
          )}
          {r.offer.prices.month && (
            <>
              <br />
              {eur(r.offer.prices.month)}/month
            </>
          )}
        </>
      ),
    ],
    [
      "Minimum rental",
      (r) => (
        <>
          {r.offer.minDays} {r.offer.minDays === 1 ? "day" : "days"}{" "}
          {r.offer.minDays > r.days && <Badge tone="warn">applied</Badge>}
        </>
      ),
    ],
    [
      "Hours included",
      (r) => (
        <>
          {num(r.offer.hoursPerDay)} h/day
          {r.offer.extraHourPrice && <Small>overtime {eur(r.offer.extraHourPrice)}/h</Small>}
        </>
      ),
    ],
    ["Machine rental", (r) => lineAmt(r, "equipment") ?? "—"],
    [
      "Accessories",
      (r) =>
        lineAmt(r, "accessory") ??
        (body.accessoryIds.length ? <Badge tone="bad">not available</Badge> : muted("—")),
    ],
    [
      "Operator",
      (r) =>
        r.offer.operator.mode === "included" ? (
          <Badge tone="ok">included</Badge>
        ) : (
          (lineAmt(r, "operator") ??
          (body.operator ? <Badge tone="bad">not available</Badge> : muted("not requested")))
        ),
    ],
    [
      "Transport",
      (r) =>
        lineAmt(r, "transport") ??
        (body.transport ? <Badge tone="bad">not available</Badge> : muted("collect from depot")),
    ],
    [
      "Deposit",
      (r) =>
        r.offer.deposit ? (
          <>
            {eur(r.offer.deposit)}
            <Small>not in the total</Small>
          </>
        ) : (
          "None"
        ),
    ],
    ["Included", (r) => <MarkList tone="tick" className="text-sm" items={r.included} />],
    [
      "Missing",
      (r) =>
        r.missing.length ? (
          <MarkList tone="miss" className="text-sm" items={r.missing} />
        ) : (
          muted("Nothing")
        ),
    ],
    ["To confirm", (r) => <MarkList tone="confirm" className="text-sm" items={r.toConfirm} />],
    [
      "Warnings",
      (r) => (r.warnings.length ? <MarkList className="text-sm" items={r.warnings} /> : muted("—")),
    ],
    [
      "Estimate",
      (r) => (
        <>
          <div>
            Net: <b>{eur(r.totals.net)}</b>
          </div>
          <Small>
            VAT {r.totals.vatRate}%: {eur(r.totals.vat)}
          </Small>
          {r.totals.complete ? (
            <div>
              Estimated total: <b className="text-[1.05rem]">{eur(r.totals.gross)}</b>
              {r.offer.id === bestId && (
                <div className="mt-1">
                  <Badge tone="ok">Best estimate</Badge>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Badge tone="warn">Partial estimate</Badge>
              <Small>{r.totals.missing} lines to price excluded</Small>
            </div>
          )}
        </>
      ),
    ],
  ]
  const add = (r: CompareRow, block?: boolean) => (
    <Button
      variant="primary"
      size={block ? "default" : "sm"}
      block={block}
      onClick={() => onAdd(r)}
    >
      Add to request
    </Button>
  )
  // On phones the estimate moves up, right after the partner.
  const mobileRows = [rows[0], rows[rows.length - 1], ...rows.slice(1, -1)]
  return (
    <>
      <Alert tone="info" size="sm" className="mb-3">
        Period:{" "}
        <b>
          {date(res.period.from)} → {date(res.period.to)}
        </b>{" "}
        ({R[0]?.days ?? ""} calendar days) · Province {body.province} · Quantity {body.qty} ·{" "}
        {body.transport ? "with delivery" : "without delivery"} ·{" "}
        {body.operator ? "with operator" : "without operator"}. Demo prices excluding VAT;
        availability to be confirmed.
      </Alert>
      <div className="bg-card hidden overflow-x-auto rounded-lg border md:block">
        <table className="data-table">
          <thead>
            <tr>
              <th />
              {R.map((r) => (
                <th key={r.offer.id} className={r.offer.id === bestId ? "text-ok!" : undefined}>
                  {r.offer.partner.name}
                  {r.offer.id === bestId && " · best estimate"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, cell]) => (
              <tr key={label}>
                <td className="font-semibold whitespace-nowrap">{label}</td>
                {R.map((r) => (
                  <td key={r.offer.id}>{cell(r)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td />
              {R.map((r) => (
                <td key={r.offer.id}>{add(r)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {R.map((r) => (
          <Card key={r.offer.id}>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-[0.92rem]">
              {mobileRows.map(([label, cell]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="m-0">{cell(r)}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3">{add(r, true)}</div>
          </Card>
        ))}
      </div>
    </>
  )
}
