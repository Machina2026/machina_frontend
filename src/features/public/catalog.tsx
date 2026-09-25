"use client"

import { useQuery } from "@tanstack/react-query"
import { LayoutGrid, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { PageHead, Small } from "@/components/app/bits"
import { MachinePhoto, SpecChips } from "@/components/app/model-image"
import { QueryView } from "@/components/app/query-view"
import { EmptyState } from "@/components/states/empty-state"
import { Alert } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Check, Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { api, qs } from "@/lib/machina/api"
import { daysBetween, eur, eurWhole, stripDemo } from "@/lib/machina/format"
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
        eyebrow="Catalogue"
        title={cat ? cat.name : "Find the right machine"}
        actions={
          <Button className="lg:hidden" onClick={() => setOpen(true)}>
            <SlidersHorizontal /> Filters
          </Button>
        }
      >
        Models available from our partners. Each model can have several offers with different prices
        and conditions.
      </PageHead>
      <nav
        aria-label="Categories"
        className="-mx-4 mb-6 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
      >
        {[{ id: "", name: "All machines", image: "" }, ...(meta?.categories ?? [])].map((c) => {
          const on = (query.cat ?? "") === c.id
          return (
            <Link
              key={c.id || "all"}
              href={`/catalog${qs({ ...keep, cat: c.id })}`}
              aria-current={on ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-[0.88rem] font-medium no-underline transition-colors hover:no-underline",
                on
                  ? "bg-ink border-ink text-white"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              )}
            >
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center overflow-hidden rounded-full",
                  on ? "bg-white/15" : "bg-muted"
                )}
              >
                {c.image ? (
                  <span className="relative size-7">
                    <MachinePhoto src={c.image} alt="" sizes="28px" />
                  </span>
                ) : (
                  <LayoutGrid aria-hidden className="size-3.5" />
                )}
              </span>
              {c.name}
            </Link>
          )
        })}
      </nav>
      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <form
          aria-label="Filters"
          onSubmit={(e) => {
            e.preventDefault()
            apply(filters)
          }}
          className={cn(
            "bg-card border-border/70 shadow-soft rounded-2xl border p-5 max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:overflow-y-auto max-lg:rounded-none lg:sticky lg:top-[96px]",
            !open && "max-lg:hidden"
          )}
        >
          <div className="border-border/70 mb-4 flex items-center justify-between border-b pb-3">
            <h3 className="m-0 flex items-center gap-2 text-[1.02rem]">
              <SlidersHorizontal aria-hidden className="text-primary size-4" /> Filters
            </h3>
            <Button size="sm" className="lg:hidden" onClick={() => setOpen(false)}>
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
                onChange={(e) => apply({ ...filters, sub: e.target.value })}
                options={[["", "All"], ...cat.subtypes.map((s) => [s, s] as const)]}
              />
            </Field>
          )}
          <Field label="Area (province served)" htmlFor="f-prov">
            <Select
              id="f-prov"
              value={filters.prov ?? ""}
              onChange={(e) => apply({ ...filters, prov: e.target.value })}
              options={[
                ["", "All of Piedmont"],
                ...(meta?.provinces ?? []).map((p) => [p.id, `${p.name} (${p.id})`] as const),
              ]}
            />
          </Field>
          <div className="grid gap-x-3 max-lg:grid-cols-2">
            <Field label="From" htmlFor="f-from">
              <Input
                id="f-from"
                type="date"
                value={filters.from ?? ""}
                onChange={(e) => apply({ ...filters, from: e.target.value })}
              />
            </Field>
            <Field label="To" htmlFor="f-to">
              <Input
                id="f-to"
                type="date"
                value={filters.to ?? ""}
                onChange={(e) => apply({ ...filters, to: e.target.value })}
              />
            </Field>
          </div>
          <Check
            className="mb-3.5"
            label="Available with an operator"
            checked={filters.operator === "1"}
            onChange={(e) => apply({ ...filters, operator: e.target.checked ? "1" : "" })}
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
          <Small className="mb-3">
            Lists update as you change them; press Search for text and number fields.
          </Small>
          <div className="flex gap-2">
            <Button type="submit" variant="primary">
              Search
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
                    image="/img/empty-search.svg"
                    title="No machine matches these filters"
                    description="Try removing a filter, or describe the job and let the assistant pick the machines."
                    action={
                      <Link href="/assistant" className={buttonVariants()}>
                        Describe your job to the assistant
                      </Link>
                    }
                  />
                )
              }
              const days = data.period ? daysBetween(data.period.from, data.period.to) : null
              const sorted = [...data.results]
              if (query.sort === "price")
                sorted.sort((a, b) => (a.offers[0].day ?? 0) - (b.offers[0].day ?? 0))
              if (query.sort === "price_desc")
                sorted.sort((a, b) => (b.offers[0].day ?? 0) - (a.offers[0].day ?? 0))
              return (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <Small>
                      <b className="text-foreground">{data.results.length}</b> models · demo prices
                      excluding VAT
                      {days ? ` · estimates for ${days} calendar days` : ""}
                    </Small>
                    <label className="text-muted-foreground flex items-center gap-2 text-sm">
                      Sort by
                      <Select
                        className="min-h-9 w-auto py-1"
                        value={query.sort ?? ""}
                        onChange={(e) => apply({ ...filters, sort: e.target.value })}
                        options={[
                          ["", "Category"],
                          ["price", "Lowest daily price"],
                          ["price_desc", "Highest daily price"],
                        ]}
                      />
                    </label>
                  </div>
                  {!days && (
                    <Alert tone="info" size="sm" className="mb-4">
                      Add your <b>rental dates</b> in the filters to see what each machine would
                      cost for your period.
                    </Alert>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {sorted.map(({ model: m, offers }) => {
                      const best = offers[0]
                      const estimates = offers
                        .map((o) => o.estimate)
                        .filter((x): x is number => x !== null)
                      const href = `/models/${m.id}${qs(keep)}`
                      return (
                        <article
                          key={m.id}
                          className="group border-border/70 bg-card shadow-soft lift relative flex flex-col overflow-hidden rounded-2xl border"
                        >
                          <Link
                            href={href}
                            tabIndex={-1}
                            aria-hidden
                            className="bg-muted relative block aspect-[16/10] overflow-hidden"
                          >
                            <MachinePhoto
                              src={m.image}
                              alt=""
                              sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 100vw"
                              className="transition-transform duration-500 group-hover:scale-[1.05]"
                            />
                            <span className="absolute right-2 bottom-2 rounded bg-black/55 px-1.5 text-[0.66rem] text-white/85">
                              Illustrative photo
                            </span>
                            {offers.length > 1 && (
                              <span className="bg-sun text-ink absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold">
                                {offers.length} offers
                              </span>
                            )}
                          </Link>
                          <div className="flex flex-1 flex-col p-4 sm:p-5">
                            <span className="text-primary-hover text-[0.74rem] font-semibold tracking-[0.08em] uppercase">
                              {m.subtype}
                            </span>
                            <h3 className="mt-1 mb-1 text-[1.15rem]">
                              <Link
                                href={href}
                                className="text-foreground hover:text-primary-hover no-underline"
                              >
                                {m.brand} {m.model}
                              </Link>
                            </h3>
                            <p className="text-muted-foreground m-0 line-clamp-2 text-[0.88rem]">
                              {m.description}
                            </p>
                            <SpecChips model={m} max={3} />
                            <Small className="mt-auto pt-1">
                              {offers.map((o) => stripDemo(o.partner.name)).join(" · ")}
                            </Small>
                            <div className="border-border/70 mt-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-t pt-3">
                              <div className="leading-tight whitespace-nowrap">
                                <span className="text-muted-foreground text-[0.78rem]">from </span>
                                <span className="font-heading text-[1.6rem] font-medium">
                                  {eurWhole(best.day)}
                                </span>
                                <span className="text-muted-foreground text-[0.78rem]"> /day</span>
                                {estimates.length > 0 && (
                                  <div className="text-[0.8rem]">
                                    {days} days from{" "}
                                    <b className="text-primary-hover">
                                      {eur(Math.min(...estimates))}
                                    </b>
                                  </div>
                                )}
                              </div>
                              <div className="ml-auto flex gap-1.5">
                                {offers.length > 1 && (
                                  <Link
                                    href={`/compare${qs({ model: m.id, ...keep })}`}
                                    className={buttonVariants({ size: "sm" })}
                                  >
                                    Compare
                                  </Link>
                                )}
                                <Link
                                  href={href}
                                  className={buttonVariants({ variant: "primary", size: "sm" })}
                                >
                                  See offers
                                </Link>
                              </div>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                  <Small className="text-faint mt-4">
                    Demo prices excluding VAT. Availability is always confirmed by the rental
                    company.
                  </Small>
                </>
              )
            }}
          </QueryView>
        </div>
      </div>
    </>
  )
}
