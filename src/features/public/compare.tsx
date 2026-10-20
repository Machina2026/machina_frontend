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
import { useCatalogText } from "@/i18n/catalog"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages, plural } from "@/i18n/messages"
import { api, ApiError } from "@/lib/machina/api"
import { addDays, today } from "@/lib/machina/format"
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

const M = defineMessages({
  en: {
    nothingTitle: "Nothing to compare yet",
    nothingBody:
      "Open a machine with more than one offer and pick the offers to compare side by side.",
    goCatalog: "Go to the catalogue",
    catalog: "Catalogue",
    comparison: "Comparison",
    title: "Compare offers",
    intro: (b: (s: string) => React.ReactNode) => (
      <>
        Every offer is calculated with {b("the same period and the same needs")}. Lines the partner
        still has to price are left out of the total.
      </>
    ),
    from: "From",
    to: "To",
    province: "Site province",
    quantity: "Quantity",
    delivery: "Delivery to site",
    withOperator: "With operator",
    update: "Update comparison",
    toPrice: "to price",
    rowPartner: "Partner",
    areaServed: "area served",
    outsideArea: "outside area",
    rowModel: "Model",
    rowRates: "Rates",
    perDay: "/day",
    perWeek: "/week",
    perMonth: "/month",
    rowMinRental: "Minimum rental",
    days: (n: number) => `${n} ${plural(n, "day", "days")}`,
    applied: "applied",
    rowHours: "Hours included",
    hoursPerDay: "h/day",
    overtime: (price: string) => `overtime ${price}/h`,
    rowMachine: "Machine rental",
    rowAccessories: "Accessories",
    notAvailable: "not available",
    rowOperator: "Operator",
    included: "included",
    notRequested: "not requested",
    rowTransport: "Transport",
    collect: "collect from depot",
    rowDeposit: "Deposit",
    notInTotal: "not in the total",
    none: "None",
    rowIncluded: "Included",
    rowMissing: "Missing",
    nothing: "Nothing",
    rowToConfirm: "To confirm",
    rowWarnings: "Warnings",
    rowEstimate: "Estimate",
    net: "Net:",
    vat: (rate: number) => `VAT ${rate}%:`,
    estimatedTotal: "Estimated total:",
    bestEstimate: "Best estimate",
    bestEstimateSuffix: " · best estimate",
    partialEstimate: "Partial estimate",
    linesExcluded: (n: number) => `${n} ${plural(n, "line", "lines")} to price excluded`,
    addToRequest: "Add to request",
    period: "Period:",
    summary: (
      days: number | string,
      prov: string,
      qty: string,
      transport: boolean,
      operator: boolean
    ) =>
      ` (${days} calendar days) · Province ${prov} · Quantity ${qty} · ${transport ? "with delivery" : "without delivery"} · ${operator ? "with operator" : "without operator"}. Prices excluding VAT; availability to be confirmed.`,
  },
  it: {
    nothingTitle: "Ancora niente da confrontare",
    nothingBody:
      "Apri una macchina con più di un'offerta e scegli le offerte da confrontare una accanto all'altra.",
    goCatalog: "Vai al catalogo",
    catalog: "Catalogo",
    comparison: "Confronto",
    title: "Confronta le offerte",
    intro: (b: (s: string) => React.ReactNode) => (
      <>
        Ogni offerta è calcolata con {b("lo stesso periodo e le stesse esigenze")}. Le righe che il
        noleggiatore deve ancora quotare sono escluse dal totale.
      </>
    ),
    from: "Dal",
    to: "Al",
    province: "Provincia del cantiere",
    quantity: "Quantità",
    delivery: "Consegna in cantiere",
    withOperator: "Con operatore",
    update: "Aggiorna il confronto",
    toPrice: "da quotare",
    rowPartner: "Noleggiatore",
    areaServed: "zona servita",
    outsideArea: "fuori zona",
    rowModel: "Modello",
    rowRates: "Tariffe",
    perDay: "/giorno",
    perWeek: "/settimana",
    perMonth: "/mese",
    rowMinRental: "Noleggio minimo",
    days: (n: number) => `${n} ${plural(n, "giorno", "giorni")}`,
    applied: "applicato",
    rowHours: "Ore incluse",
    hoursPerDay: "h/giorno",
    overtime: (price: string) => `ore extra ${price}/h`,
    rowMachine: "Noleggio macchina",
    rowAccessories: "Accessori",
    notAvailable: "non disponibile",
    rowOperator: "Operatore",
    included: "incluso",
    notRequested: "non richiesto",
    rowTransport: "Trasporto",
    collect: "ritiro al deposito",
    rowDeposit: "Cauzione",
    notInTotal: "esclusa dal totale",
    none: "Nessuna",
    rowIncluded: "Incluso",
    rowMissing: "Mancante",
    nothing: "Niente",
    rowToConfirm: "Da confermare",
    rowWarnings: "Avvisi",
    rowEstimate: "Stima",
    net: "Imponibile:",
    vat: (rate: number) => `IVA ${rate}%:`,
    estimatedTotal: "Totale stimato:",
    bestEstimate: "Stima migliore",
    bestEstimateSuffix: " · stima migliore",
    partialEstimate: "Stima parziale",
    linesExcluded: (n: number) =>
      `${n} ${plural(n, "riga da quotare esclusa", "righe da quotare escluse")}`,
    addToRequest: "Aggiungi alla richiesta",
    period: "Periodo:",
    summary: (
      days: number | string,
      prov: string,
      qty: string,
      transport: boolean,
      operator: boolean
    ) =>
      ` (${days} giorni di calendario) · Provincia ${prov} · Quantità ${qty} · ${transport ? "con consegna" : "senza consegna"} · ${operator ? "con operatore" : "senza operatore"}. Prezzi IVA esclusa; disponibilità da confermare.`,
  },
})

const bold = (s: string) => <b>{s}</b>

export function CompareView({ query }: { query: Record<string, string> }) {
  const t = useMessages(M)
  const ct = useCatalogText()
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
        title={t.nothingTitle}
        description={t.nothingBody}
        action={
          <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
            {t.goCatalog}
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
          [t.catalog, "/catalog"],
          ...(m ? [[`${m.brand} ${m.model}`, `/models/${m.id}`] as const] : []),
          [t.comparison],
        ]}
      />
      <h1>{t.title}</h1>
      <p className="text-muted-foreground">{t.intro(bold)}</p>
      <Card flat>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            compare.mutate({ ...form, offerIds })
          }}
        >
          <div className="grid gap-x-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t.from} htmlFor="c-from" error={fieldErrors.from}>
              <Input
                id="c-from"
                type="date"
                value={form.from}
                aria-invalid={!!fieldErrors.from}
                onChange={(e) => setForm({ ...form, from: e.target.value })}
              />
            </Field>
            <Field label={t.to} htmlFor="c-to" error={fieldErrors.to}>
              <Input
                id="c-to"
                type="date"
                value={form.to}
                aria-invalid={!!fieldErrors.to}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
              />
            </Field>
            <Field label={t.province} htmlFor="c-prov" error={fieldErrors.province}>
              <Select
                id="c-prov"
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                options={(meta?.provinces ?? []).map(
                  (p) => [p.id, `${ct.province(p.id, p.name)} (${p.id})`] as const
                )}
              />
            </Field>
            <Field label={t.quantity} htmlFor="c-qty">
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
              label={t.delivery}
              checked={form.transport}
              onChange={(e) => setForm({ ...form, transport: e.target.checked })}
            />
            <Check
              label={t.withOperator}
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
              {t.update}
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
  const t = useMessages(M)
  const { date, eur, num } = useFormat()
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
        {l.amount === null ? <Badge tone="warn">{t.toPrice}</Badge> : <b>{eur(l.amount)}</b>}
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
      t.rowPartner,
      (r) => (
        <>
          <b>{r.offer.partner.name}</b>
          <Small>{r.offer.partner.city}</Small>
          {r.inZone ? (
            <Badge tone="ok">{t.areaServed}</Badge>
          ) : (
            <Badge tone="warn">{t.outsideArea}</Badge>
          )}
        </>
      ),
    ],
    [t.rowModel, (r) => `${r.model.brand} ${r.model.model}`],
    [
      t.rowRates,
      (r) => (
        <>
          {eur(r.offer.prices.day)}
          {t.perDay}
          {r.offer.prices.week && (
            <>
              <br />
              {eur(r.offer.prices.week)}
              {t.perWeek}
            </>
          )}
          {r.offer.prices.month && (
            <>
              <br />
              {eur(r.offer.prices.month)}
              {t.perMonth}
            </>
          )}
        </>
      ),
    ],
    [
      t.rowMinRental,
      (r) => (
        <>
          {t.days(r.offer.minDays)}{" "}
          {r.offer.minDays > r.days && <Badge tone="warn">{t.applied}</Badge>}
        </>
      ),
    ],
    [
      t.rowHours,
      (r) => (
        <>
          {num(r.offer.hoursPerDay)} {t.hoursPerDay}
          {r.offer.extraHourPrice && <Small>{t.overtime(eur(r.offer.extraHourPrice))}</Small>}
        </>
      ),
    ],
    [t.rowMachine, (r) => lineAmt(r, "equipment") ?? "—"],
    [
      t.rowAccessories,
      (r) =>
        lineAmt(r, "accessory") ??
        (body.accessoryIds.length ? <Badge tone="bad">{t.notAvailable}</Badge> : muted("—")),
    ],
    [
      t.rowOperator,
      (r) =>
        r.offer.operator.mode === "included" ? (
          <Badge tone="ok">{t.included}</Badge>
        ) : (
          (lineAmt(r, "operator") ??
          (body.operator ? <Badge tone="bad">{t.notAvailable}</Badge> : muted(t.notRequested)))
        ),
    ],
    [
      t.rowTransport,
      (r) =>
        lineAmt(r, "transport") ??
        (body.transport ? <Badge tone="bad">{t.notAvailable}</Badge> : muted(t.collect)),
    ],
    [
      t.rowDeposit,
      (r) =>
        r.offer.deposit ? (
          <>
            {eur(r.offer.deposit)}
            <Small>{t.notInTotal}</Small>
          </>
        ) : (
          t.none
        ),
    ],
    [t.rowIncluded, (r) => <MarkList tone="tick" className="text-sm" items={r.included} />],
    [
      t.rowMissing,
      (r) =>
        r.missing.length ? (
          <MarkList tone="miss" className="text-sm" items={r.missing} />
        ) : (
          muted(t.nothing)
        ),
    ],
    [t.rowToConfirm, (r) => <MarkList tone="confirm" className="text-sm" items={r.toConfirm} />],
    [
      t.rowWarnings,
      (r) => (r.warnings.length ? <MarkList className="text-sm" items={r.warnings} /> : muted("—")),
    ],
    [
      t.rowEstimate,
      (r) => (
        <>
          <div>
            {t.net} <b>{eur(r.totals.net)}</b>
          </div>
          <Small>
            {t.vat(r.totals.vatRate)} {eur(r.totals.vat)}
          </Small>
          {r.totals.complete ? (
            <div>
              {t.estimatedTotal} <b className="text-[1.05rem]">{eur(r.totals.gross)}</b>
              {r.offer.id === bestId && (
                <div className="mt-1">
                  <Badge tone="ok">{t.bestEstimate}</Badge>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Badge tone="warn">{t.partialEstimate}</Badge>
              <Small>{t.linesExcluded(r.totals.missing)}</Small>
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
      {t.addToRequest}
    </Button>
  )
  // On phones the estimate moves up, right after the partner.
  const mobileRows = [rows[0], rows[rows.length - 1], ...rows.slice(1, -1)]
  return (
    <>
      <Alert tone="info" size="sm" className="mb-3">
        {t.period}{" "}
        <b>
          {date(res.period.from)} → {date(res.period.to)}
        </b>
        {t.summary(R[0]?.days ?? "", body.province, body.qty, body.transport, body.operator)}
      </Alert>
      <div className="bg-card hidden overflow-x-auto rounded-lg border md:block">
        <table className="data-table">
          <thead>
            <tr>
              <th />
              {R.map((r) => (
                <th key={r.offer.id} className={r.offer.id === bestId ? "text-ok!" : undefined}>
                  {r.offer.partner.name}
                  {r.offer.id === bestId && t.bestEstimateSuffix}
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
