"use client"

import { useQuery } from "@tanstack/react-query"
import { SearchX, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { PageHead, Small } from "@/components/app/bits"
import { ModelImage, SpecChips } from "@/components/app/model-image"
import { QueryView } from "@/components/app/query-view"
import { EmptyState } from "@/components/states/empty-state"
import { Button, buttonVariants } from "@/components/ui/button"
import { Check, Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { api, qs } from "@/lib/machina/api"
import { daysBetween, eur, stripDemo } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import type { CatalogResponse } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

export type CatalogQuery = Record<string, string>

export function CatalogView({ query }: { query: CatalogQuery }) {
  const router = useRouter()
  const meta = useMeta().data
  const [filters, setFilters] = useState<CatalogQuery>(query)
  const [open, setOpen] = useState(false)
  const catalog = useQuery({
    queryKey: ["catalog", query],
    queryFn: () => api.get<CatalogResponse>(`/api/catalog${qs(query)}`),
  })

  const cat = meta?.categories.find((c) => c.id === query.cat)
  const schemaKeys = cat ? meta?.specSchema[cat.id]?.map((s) => s.key) : null
  const specFilters = (meta?.specFilters ?? []).filter(
    (f) => !schemaKeys || schemaKeys.includes(f.key)
  )
  const set = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }))
  const apply = (next: CatalogQuery) => {
    setOpen(false)
    router.push(`/catalog${qs(next)}`)
  }
  const keep = { from: query.from, to: query.to, prov: query.prov }

  return (
    <>
      <PageHead
        title={cat ? cat.name : "Machinery catalogue"}
        actions={
          <Button className="lg:hidden" onClick={() => setOpen(true)}>
            <SlidersHorizontal /> Filters
          </Button>
        }
      >
        Models available from our partners. Each model can have several offers with different prices
        and conditions.
      </PageHead>
      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <form
          aria-label="Filters"
          onSubmit={(e) => {
            e.preventDefault()
            apply(filters)
          }}
          className={cn(
            "bg-card rounded-lg border p-4 max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:overflow-y-auto max-lg:rounded-none",
            !open && "max-lg:hidden"
          )}
        >
          <div className="mb-2.5 flex items-center justify-between lg:hidden">
            <h3 className="m-0">Filters</h3>
            <Button size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
          <Field label="Search" htmlFor="f-q">
            <Input
              id="f-q"
              placeholder="Brand, model, job…"
              value={filters.q ?? ""}
              onChange={(e) => set("q", e.target.value)}
            />
          </Field>
          <Field label="Category" htmlFor="f-cat">
            <Select
              id="f-cat"
              value={filters.cat ?? ""}
              onChange={(e) => apply({ ...filters, cat: e.target.value, sub: "" })}
              options={[
                ["", "All"],
                ...(meta?.categories ?? []).map((c) => [c.id, c.name] as const),
              ]}
            />
          </Field>
          {cat && (
            <Field label="Type" htmlFor="f-sub">
              <Select
                id="f-sub"
                value={filters.sub ?? ""}
                onChange={(e) => set("sub", e.target.value)}
                options={[["", "All"], ...cat.subtypes.map((s) => [s, s] as const)]}
              />
            </Field>
          )}
          <Field label="Area (province served)" htmlFor="f-prov">
            <Select
              id="f-prov"
              value={filters.prov ?? ""}
              onChange={(e) => set("prov", e.target.value)}
              options={[
                ["", "All of Piedmont"],
                ...(meta?.provinces ?? []).map((p) => [p.id, `${p.name} (${p.id})`] as const),
              ]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-x-3">
            <Field label="From" htmlFor="f-from">
              <Input
                id="f-from"
                type="date"
                value={filters.from ?? ""}
                onChange={(e) => set("from", e.target.value)}
              />
            </Field>
            <Field label="To" htmlFor="f-to">
              <Input
                id="f-to"
                type="date"
                value={filters.to ?? ""}
                onChange={(e) => set("to", e.target.value)}
              />
            </Field>
          </div>
          <Check
            className="mb-3.5"
            label="Available with an operator"
            checked={filters.operator === "1"}
            onChange={(e) => set("operator", e.target.checked ? "1" : "")}
          />
          <fieldset className="mb-3.5">
            <legend className="mb-1 text-[0.85rem] font-semibold">Daily price (€)</legend>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                aria-label="Minimum daily price"
                placeholder="min"
                value={filters.pmin ?? ""}
                onChange={(e) => set("pmin", e.target.value)}
              />
              <Input
                type="number"
                min={0}
                aria-label="Maximum daily price"
                placeholder="max"
                value={filters.pmax ?? ""}
                onChange={(e) => set("pmax", e.target.value)}
              />
            </div>
          </fieldset>
          <details open={specFilters.some((f) => query[`spec_${f.key}`])} className="mb-2">
            <summary className="mb-2 cursor-pointer text-sm font-semibold">Features</summary>
            {specFilters.map((f) => (
              <Field key={f.key} label={f.label} htmlFor={`f-${f.key}`}>
                <Input
                  id={`f-${f.key}`}
                  type="number"
                  min={0}
                  step="any"
                  value={filters[`spec_${f.key}`] ?? ""}
                  onChange={(e) => set(`spec_${f.key}`, e.target.value)}
                />
              </Field>
            ))}
          </details>
          <div className="flex gap-2">
            <Button type="submit" variant="primary">
              Apply
            </Button>
            <Link href="/catalog" className={buttonVariants()} onClick={() => setFilters({})}>
              Reset
            </Link>
          </div>
        </form>

        <div>
          <QueryView query={catalog}>
            {(data) => {
              if (!data.results.length) {
                return (
                  <EmptyState
                    icon={SearchX}
                    title="No model matches the selected filters."
                    action={
                      <Link href="/assistant" className={buttonVariants()}>
                        Describe your job to the assistant
                      </Link>
                    }
                  />
                )
              }
              const days = data.period ? daysBetween(data.period.from, data.period.to) : null
              return (
                <>
                  <Small className="mb-3">
                    {data.results.length} models · demo prices excluding VAT
                    {days ? ` · estimate for ${days} calendar days` : ""}
                  </Small>
                  <div className="space-y-3.5">
                    {data.results.map(({ model: m, offers }) => {
                      const best = offers[0]
                      const estimates = offers
                        .map((o) => o.estimate)
                        .filter((x): x is number => x !== null)
                      const href = `/models/${m.id}${qs(keep)}`
                      return (
                        <article
                          key={m.id}
                          className="border-border/70 bg-card shadow-soft hover:shadow-lift grid gap-5 rounded-xl border p-5 transition-shadow duration-200 md:grid-cols-[200px_minmax(0,1fr)_230px]"
                        >
                          <ModelImage src={m.image} alt={`${m.brand} ${m.model}`} />
                          <div className="min-w-0">
                            <Small>
                              {meta?.categories.find((c) => c.id === m.category)?.name} ·{" "}
                              {m.subtype}
                            </Small>
                            <h3 className="mt-0.5 mb-1">
                              <Link href={href} className="text-foreground">
                                {m.brand} {m.model}
                              </Link>
                            </h3>
                            <p className="text-muted-foreground m-0 text-sm">{m.description}</p>
                            <SpecChips model={m} />
                            <div className="text-sm">
                              <b>Jobs:</b> {m.jobs.slice(0, 3).join(" · ")}
                            </div>
                          </div>
                          <div className="flex flex-col justify-between gap-3 md:border-l md:pl-4">
                            <div>
                              <Small>
                                {offers.length} {offers.length === 1 ? "offer" : "offers"} from{" "}
                                {offers.map((o) => stripDemo(o.partner.name)).join(", ")}
                              </Small>
                              <div>
                                <span className="text-[1.35rem] font-bold">{eur(best.day)}</span>{" "}
                                <span className="text-muted-foreground text-sm">/day from</span>
                              </div>
                              {estimates.length > 0 && (
                                <div className="text-sm">
                                  Machine only, {days} days: from{" "}
                                  <b>{eur(Math.min(...estimates))}</b>
                                </div>
                              )}
                              <div className="text-faint text-sm">Availability to be confirmed</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={href}
                                className={buttonVariants({ variant: "primary", size: "sm" })}
                              >
                                See offers
                              </Link>
                              {offers.length > 1 && (
                                <Link
                                  href={`/compare${qs({ model: m.id, ...keep })}`}
                                  className={buttonVariants({ size: "sm" })}
                                >
                                  Compare
                                </Link>
                              )}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </>
              )
            }}
          </QueryView>
        </div>
      </div>
    </>
  )
}
