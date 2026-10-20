"use client"

import { useQuery } from "@tanstack/react-query"
import { SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { PageHead, Small } from "@/components/app/bits"
import { ModelCard } from "@/components/app/model-card"
import { QueryView } from "@/components/app/query-view"
import { EmptyState } from "@/components/states/empty-state"
import { Alert } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Check, Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useCatalogText } from "@/i18n/catalog"
import { useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages } from "@/i18n/messages"
import { api, qs } from "@/lib/machina/api"
import { daysBetween } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import type { CatalogResponse } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

export type CatalogQuery = Record<string, string>

const M = defineMessages({
  en: {
    eyebrow: "Catalogue",
    title: "Find the right machine",
    intro:
      "Models available from our partners. Each model can have several offers with different prices and conditions.",
    filters: "Filters",
    categories: "Categories",
    allEquipment: "All equipment",
    searchPlaceholder: "Brand, model, job…",
    category: "Category",
    all: "All",
    type: "Type",
    area: "Area (province served)",
    allPiedmont: "All of Piedmont",
    from: "From",
    to: "To",
    withOperator: "Available with an operator",
    dailyPrice: "Daily price (€)",
    minPrice: "Minimum daily price",
    maxPrice: "Maximum daily price",
    min: "min",
    max: "max",
    features: "Features",
    liveHint: "Lists update as you change them; press Search for text and number fields.",
    noMatch: "No machine matches these filters",
    noMatchHint:
      "Try removing a filter, or describe the job and let the assistant pick the machines.",
    askAssistant: "Describe your job to the assistant",
    summary: (n: number, days: number | null) =>
      `${n === 1 ? "model" : "models"} · prices excluding VAT${days ? ` · estimates for ${days} calendar days` : ""}`,
    sortBy: "Sort by",
    sortCategory: "Category",
    sortLowest: "Lowest daily price",
    sortHighest: "Highest daily price",
    addDates: (b: (s: string) => React.ReactNode) => (
      <>
        Add your {b("rental dates")} in the filters to see what each machine would cost for your
        period.
      </>
    ),
  },
  it: {
    eyebrow: "Catalogo",
    title: "Trova la macchina giusta",
    intro:
      "I modelli disponibili presso i nostri partner. Ogni modello può avere più offerte con prezzi e condizioni diversi.",
    filters: "Filtri",
    categories: "Categorie",
    allEquipment: "Tutte le macchine",
    searchPlaceholder: "Marca, modello, lavoro…",
    category: "Categoria",
    all: "Tutte",
    type: "Tipo",
    area: "Zona (provincia servita)",
    allPiedmont: "Tutto il Piemonte",
    from: "Dal",
    to: "Al",
    withOperator: "Disponibile con operatore",
    dailyPrice: "Prezzo giornaliero (€)",
    minPrice: "Prezzo giornaliero minimo",
    maxPrice: "Prezzo giornaliero massimo",
    min: "min",
    max: "max",
    features: "Caratteristiche",
    liveHint:
      "Gli elenchi si aggiornano mentre li cambi; premi Cerca per i campi di testo e numerici.",
    noMatch: "Nessuna macchina corrisponde a questi filtri",
    noMatchHint:
      "Prova a togliere un filtro, oppure descrivi il lavoro e lascia che l'assistente scelga le macchine.",
    askAssistant: "Descrivi il lavoro all'assistente",
    summary: (n: number, days: number | null) =>
      `${n === 1 ? "modello" : "modelli"} · prezzi IVA esclusa${days ? ` · stime per ${days} giorni di calendario` : ""}`,
    sortBy: "Ordina per",
    sortCategory: "Categoria",
    sortLowest: "Prezzo giornaliero più basso",
    sortHighest: "Prezzo giornaliero più alto",
    addDates: (b: (s: string) => React.ReactNode) => (
      <>
        Aggiungi le {b("date del noleggio")} nei filtri per vedere quanto costerebbe ogni macchina
        nel tuo periodo.
      </>
    ),
  },
})

const bold = (s: string) => <b>{s}</b>

export function CatalogView({ query }: { query: CatalogQuery }) {
  const router = useRouter()
  const t = useMessages(M)
  const c = useCommon()
  const ct = useCatalogText()
  const meta = useMeta().data
  const [filters, setFilters] = useState<CatalogQuery>(query)
  const [open, setOpen] = useState(false)
  const catalog = useQuery({
    queryKey: ["catalog", query],
    queryFn: () => api.get<CatalogResponse>(`/api/catalog${qs(query)}`),
  })

  const cat = meta?.categories.find((x) => x.id === query.cat)
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
        eyebrow={t.eyebrow}
        title={cat ? ct.category(cat.id, cat.name) : t.title}
        actions={
          <Button className="lg:hidden" onClick={() => setOpen(true)}>
            <SlidersHorizontal /> {t.filters}
          </Button>
        }
      >
        {t.intro}
      </PageHead>
      <nav
        aria-label={t.categories}
        className="mb-8 flex [scrollbar-width:none] gap-2 max-sm:-mx-4 max-sm:overflow-x-auto max-sm:px-4 sm:flex-wrap"
      >
        {[{ id: "", name: t.allEquipment }, ...(meta?.categories ?? [])].map((x) => {
          const on = (query.cat ?? "") === x.id
          return (
            <Link
              key={x.id || "all"}
              href={`/catalog${qs({ ...keep, cat: x.id })}`}
              aria-current={on ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-[0.9rem] font-medium whitespace-nowrap no-underline transition-colors hover:no-underline",
                on
                  ? "bg-ink border-ink text-white hover:text-white"
                  : "border-border bg-card text-foreground hover:border-foreground/40"
              )}
            >
              {x.id ? ct.category(x.id, x.name) : x.name}
            </Link>
          )
        })}
      </nav>
      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <form
          aria-label={t.filters}
          onSubmit={(e) => {
            e.preventDefault()
            apply(filters)
          }}
          className={cn(
            "bg-card border-border rounded-xl border p-5 max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:overflow-y-auto max-lg:rounded-none lg:sticky lg:top-[88px]",
            !open && "max-lg:hidden"
          )}
        >
          <div className="border-border mb-4 flex items-center justify-between border-b pb-3">
            <h3 className="m-0 flex items-center gap-2 text-[1.02rem]">
              <SlidersHorizontal aria-hidden className="size-4" /> {t.filters}
            </h3>
            <Button size="sm" className="lg:hidden" onClick={() => setOpen(false)}>
              {c.close}
            </Button>
          </div>
          <Field label={c.search} htmlFor="f-q">
            <Input
              id="f-q"
              placeholder={t.searchPlaceholder}
              value={filters.q ?? ""}
              onChange={(e) => set("q", e.target.value)}
            />
          </Field>
          <Field label={t.category} htmlFor="f-cat">
            <Select
              id="f-cat"
              value={filters.cat ?? ""}
              onChange={(e) => apply({ ...filters, cat: e.target.value, sub: "" })}
              options={[
                ["", t.all],
                ...(meta?.categories ?? []).map((x) => [x.id, ct.category(x.id, x.name)] as const),
              ]}
            />
          </Field>
          {cat && (
            <Field label={t.type} htmlFor="f-sub">
              <Select
                id="f-sub"
                value={filters.sub ?? ""}
                onChange={(e) => apply({ ...filters, sub: e.target.value })}
                options={[["", t.all], ...cat.subtypes.map((s) => [s, ct.subtype(s)] as const)]}
              />
            </Field>
          )}
          <Field label={t.area} htmlFor="f-prov">
            <Select
              id="f-prov"
              value={filters.prov ?? ""}
              onChange={(e) => apply({ ...filters, prov: e.target.value })}
              options={[
                ["", t.allPiedmont],
                ...(meta?.provinces ?? []).map(
                  (p) => [p.id, `${ct.province(p.id, p.name)} (${p.id})`] as const
                ),
              ]}
            />
          </Field>
          <div className="grid gap-x-3 max-lg:grid-cols-2">
            <Field label={t.from} htmlFor="f-from">
              <Input
                id="f-from"
                type="date"
                value={filters.from ?? ""}
                onChange={(e) => apply({ ...filters, from: e.target.value })}
              />
            </Field>
            <Field label={t.to} htmlFor="f-to">
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
            label={t.withOperator}
            checked={filters.operator === "1"}
            onChange={(e) => apply({ ...filters, operator: e.target.checked ? "1" : "" })}
          />
          <fieldset className="mb-3.5">
            <legend className="mb-1 text-[0.85rem] font-semibold">{t.dailyPrice}</legend>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                aria-label={t.minPrice}
                placeholder={t.min}
                value={filters.pmin ?? ""}
                onChange={(e) => set("pmin", e.target.value)}
              />
              <Input
                type="number"
                min={0}
                aria-label={t.maxPrice}
                placeholder={t.max}
                value={filters.pmax ?? ""}
                onChange={(e) => set("pmax", e.target.value)}
              />
            </div>
          </fieldset>
          <details open={specFilters.some((f) => query[`spec_${f.key}`])} className="mb-2">
            <summary className="mb-2 cursor-pointer text-sm font-semibold">{t.features}</summary>
            {specFilters.map((f) => (
              <Field key={f.key} label={ct.spec(f.label)} htmlFor={`f-${f.key}`}>
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
          <Small className="mb-3">{t.liveHint}</Small>
          <div className="flex gap-2">
            <Button type="submit" variant="primary">
              {c.search}
            </Button>
            <Link href="/catalog" className={buttonVariants()} onClick={() => setFilters({})}>
              {c.reset}
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
                    title={t.noMatch}
                    description={t.noMatchHint}
                    action={
                      <Link href="/assistant" className={buttonVariants()}>
                        {t.askAssistant}
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
                      <b className="text-foreground">{data.results.length}</b>{" "}
                      {t.summary(data.results.length, days)}
                    </Small>
                    <label className="text-muted-foreground flex items-center gap-2 text-sm">
                      {t.sortBy}
                      <Select
                        className="min-h-9 w-auto py-1"
                        value={query.sort ?? ""}
                        onChange={(e) => apply({ ...filters, sort: e.target.value })}
                        options={[
                          ["", t.sortCategory],
                          ["price", t.sortLowest],
                          ["price_desc", t.sortHighest],
                        ]}
                      />
                    </label>
                  </div>
                  {!days && (
                    <Alert tone="info" size="sm" className="mb-4">
                      {t.addDates(bold)}
                    </Alert>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {sorted.map(({ model: m, offers }) => {
                      const estimates = offers
                        .map((o) => o.estimate)
                        .filter((x): x is number => x !== null)
                      return (
                        <ModelCard
                          key={m.id}
                          model={m}
                          offers={offers}
                          href={`/models/${m.id}${qs(keep)}`}
                          estimate={
                            days && estimates.length ? [days, Math.min(...estimates)] : null
                          }
                          compareHref={
                            offers.length > 1
                              ? `/compare${qs({ model: m.id, ...keep })}`
                              : undefined
                          }
                        />
                      )
                    })}
                  </div>
                  <Small className="text-faint mt-4">{c.pricesExclVat}</Small>
                </>
              )
            }}
          </QueryView>
        </div>
      </div>
    </>
  )
}
