"use client"

import { useQuery } from "@tanstack/react-query"
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarRange,
  ClipboardList,
  FileCheck2,
  Layers,
  Lock,
  MapPin,
  Scale,
  Search,
  Sparkles,
  Truck,
  Wand2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { MachinePhoto } from "@/components/app/model-image"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api, qs } from "@/lib/machina/api"
import { addDays, eurWhole, stripDemo, today } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import type { CatalogResponse } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

export const ASSISTANT_SEED_KEY = "machina.assistantSeed"

const STEPS = [
  {
    icon: Search,
    title: "Search or get help",
    body: "Search by category or describe the job: the assistant suggests machines from the catalogue.",
  },
  {
    icon: Scale,
    title: "Compare the offers",
    body: "Same period and needs for every offer: see what's included, what's missing and what needs confirming.",
  },
  {
    icon: ClipboardList,
    title: "Send one request",
    body: "Machina prepares a draft with the published rates; each rental company checks and confirms its own lines.",
  },
  {
    icon: FileCheck2,
    title: "Accept and manage",
    body: "Accept the final quote and follow the order, extensions, charges and documents in one place.",
  },
]

const PROMISES = [
  { icon: Layers, text: "Several rental companies, one request" },
  { icon: BadgeCheck, text: "Published rates, compared like for like" },
  { icon: Lock, text: "Price locked when you accept" },
]

const WHY = [
  {
    icon: Scale,
    title: "Like-for-like comparison",
    body: "Transport, operator, accessories and minimum rental laid out side by side, so the cheapest day rate isn't a surprise later.",
  },
  {
    icon: Wand2,
    title: "Not sure what you need?",
    body: "Describe the job in plain words. The assistant asks the right questions and suggests machines that fit your site.",
  },
  {
    icon: Lock,
    title: "No moving prices",
    body: "Once you accept a quote the price is locked. Extensions and extra charges always need your approval.",
  },
  {
    icon: MapPin,
    title: "Local rental companies",
    body: "Depots across Turin and Piedmont, with the provinces each company delivers to shown on every offer.",
  },
]

function useCatalogOverview() {
  return useQuery({
    queryKey: ["catalog", {}],
    queryFn: () => api.get<CatalogResponse>("/api/catalog"),
  })
}

export function HomeView() {
  const router = useRouter()
  const meta = useMeta().data
  const catalog = useCatalogOverview().data
  const [mode, setMode] = useState<"search" | "describe">("search")
  const [text, setText] = useState("")
  const [search, setSearch] = useState(() => {
    const from = addDays(today(), 7)
    return { cat: "", prov: "TO", from, to: addDays(from, 4) }
  })

  // Figures and "from" prices come from the live catalogue, never hard-coded.
  const stats = useMemo(() => {
    const results = catalog?.results ?? []
    const partners = new Set(results.flatMap((r) => r.offers.map((o) => o.partner.id)))
    const byCat = new Map<string, { count: number; from: number | null }>()
    for (const { model, offers } of results) {
      const day = Math.min(...offers.map((o) => o.day ?? Infinity))
      const cur = byCat.get(model.category) ?? { count: 0, from: null }
      byCat.set(model.category, {
        count: cur.count + 1,
        from: Number.isFinite(day) ? Math.min(cur.from ?? Infinity, day) : cur.from,
      })
    }
    const featured = [...results]
      .sort((a, b) => b.offers.length - a.offers.length)
      .filter((r, i, all) => all.findIndex((x) => x.model.category === r.model.category) === i)
      .slice(0, 4)
    return {
      models: results.length,
      offers: results.reduce((n, r) => n + r.offers.length, 0),
      partners: partners.size,
      byCat,
      featured,
    }
  }, [catalog])

  function describe(e: React.FormEvent) {
    e.preventDefault()
    try {
      sessionStorage.setItem(ASSISTANT_SEED_KEY, text.trim())
    } catch {
      // Storage unavailable: the assistant simply starts empty.
    }
    router.push("/assistant")
  }

  const heroPick = stats.featured[0]

  return (
    <>
      {/* Full-bleed dark hero; body clips the horizontal overflow of 100vw. */}
      <section className="bg-ink text-ink-foreground relative mx-[calc(50%-50vw)] -mt-8 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_75%_at_80%_10%,rgb(236_116_48/0.42),transparent_62%),radial-gradient(40%_60%_at_0%_100%,rgb(245_181_46/0.14),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_70%_30%,black,transparent_75%)] [background-size:56px_56px] opacity-[0.07]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/hero-site.svg"
          alt=""
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[180px] w-full object-cover object-bottom opacity-50 sm:h-[220px]"
        />
        <div
          aria-hidden
          className="from-ink via-ink/80 pointer-events-none absolute inset-x-0 top-0 h-3/4 bg-gradient-to-b to-transparent"
        />

        <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-4 pt-14 pb-36 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:pb-44">
          <div>
            <span className="text-sun inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-[0.72rem] font-semibold tracking-[0.18em] uppercase backdrop-blur">
              <span className="bg-sun size-1.5 animate-pulse rounded-full" aria-hidden />
              Turin &amp; Piedmont · construction equipment
            </span>
            <h1 className="mt-5 max-w-[680px] text-[2.6rem] leading-[1.04] text-white sm:text-[3.7rem]">
              Rent the right machine, <span className="text-gradient">from one request.</span>
            </h1>
            <p className="text-ink-foreground/75 mt-5 max-w-[560px] text-[1.12rem] leading-relaxed">
              Compare offers from several rental companies, send a single request and manage quotes,
              orders, extensions and documents in one place.
            </p>
            <ul className="mt-7 flex list-none flex-wrap gap-x-6 gap-y-3 p-0">
              {PROMISES.map(({ icon: Icon, text: t }) => (
                <li
                  key={t}
                  className="text-ink-foreground/85 flex items-center gap-2 text-[0.93rem]"
                >
                  <span className="bg-sun/15 text-sun inline-flex size-7 items-center justify-center rounded-full">
                    <Icon aria-hidden className="size-[15px]" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Visual: the most offered model, with its live price. */}
          <div className="relative hidden lg:block" aria-hidden>
            <div className="absolute inset-6 rounded-full bg-[radial-gradient(circle,rgb(236_116_48/0.35),transparent_65%)] blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)] backdrop-blur-sm">
              <div className="bg-ink-2 relative aspect-[16/10] overflow-hidden rounded-2xl">
                <MachinePhoto
                  src={heroPick?.model.image ?? "/img/excavator.png"}
                  alt=""
                  sizes="(min-width: 1240px) 520px, 42vw"
                  eager
                />
                <span className="absolute right-2 bottom-2 rounded bg-black/55 px-1.5 text-[0.68rem] text-white/85">
                  Illustrative photo
                </span>
              </div>
              {heroPick && (
                <div className="mt-4 flex items-end justify-between gap-4 px-1">
                  <div>
                    <div className="text-ink-foreground/60 text-[0.78rem]">
                      {heroPick.model.subtype}
                    </div>
                    <div className="text-[1.15rem] font-semibold text-white">
                      {heroPick.model.brand} {heroPick.model.model}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-ink-foreground/60 text-[0.78rem]">
                      {heroPick.offers.length} offers from
                    </div>
                    <div className="font-heading text-sun text-[1.6rem] leading-none font-medium">
                      {eurWhole(Math.min(...heroPick.offers.map((o) => o.day ?? Infinity)))}
                      <span className="text-ink-foreground/60 font-sans text-sm"> /day</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {stats.partners > 0 && (
              <div className="bg-card text-foreground shadow-lift absolute -top-5 -left-8 flex items-center gap-3 rounded-2xl px-4 py-3">
                <span className="icon-tile size-10">
                  <Building2 />
                </span>
                <div className="leading-tight">
                  <b className="block text-[1.05rem]">{stats.partners} rental companies</b>
                  <span className="text-muted-foreground text-[0.8rem]">
                    one request reaches them all
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Search panel overlapping the hero. */}
      <section className="relative z-10 -mt-24 mb-8 lg:-mt-28">
        <div className="bg-card shadow-lift border-border/60 rounded-3xl border p-2">
          <div role="tablist" aria-label="How to start" className="flex gap-1 p-1">
            {(
              [
                ["search", Search, "Search for a machine", "Search"],
                ["describe", Sparkles, "Describe your job", "Describe the job"],
              ] as const
            ).map(([id, Icon, label, short]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-[0.95rem] font-medium transition-colors",
                  mode === id
                    ? "bg-ink text-white shadow-[0_6px_16px_-8px_rgb(0_0_0/0.6)]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon aria-hidden className="size-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </button>
            ))}
          </div>
          <div className="px-4 pt-3 pb-4 sm:px-5">
            {mode === "search" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  router.push(`/catalog${qs(search)}`)
                }}
                className="grid items-end gap-x-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1.1fr_1fr_1fr_auto]"
              >
                <Field label="Category" htmlFor="h-cat">
                  <Select
                    id="h-cat"
                    value={search.cat}
                    onChange={(e) => setSearch({ ...search, cat: e.target.value })}
                    options={[
                      ["", "All categories"],
                      ...(meta?.categories ?? []).map((c) => [c.id, c.name] as const),
                    ]}
                  />
                </Field>
                <Field label="Site province" htmlFor="h-prov">
                  <Select
                    id="h-prov"
                    value={search.prov}
                    onChange={(e) => setSearch({ ...search, prov: e.target.value })}
                    options={[
                      ["", "All of Piedmont"],
                      ...(meta?.provinces ?? []).map((p) => [p.id, `${p.name} (${p.id})`] as const),
                    ]}
                  />
                </Field>
                <Field label="From" htmlFor="h-from">
                  <Input
                    id="h-from"
                    type="date"
                    value={search.from}
                    onChange={(e) => setSearch({ ...search, from: e.target.value })}
                  />
                </Field>
                <Field label="To" htmlFor="h-to">
                  <Input
                    id="h-to"
                    type="date"
                    value={search.to}
                    onChange={(e) => setSearch({ ...search, to: e.target.value })}
                  />
                </Field>
                <Button
                  type="submit"
                  variant="primary"
                  className="mb-4 min-h-11 px-6 max-lg:w-full sm:col-span-2 lg:col-span-1"
                >
                  <Search aria-hidden /> Search
                </Button>
              </form>
            ) : (
              <form onSubmit={describe}>
                <Textarea
                  aria-label="Describe your job"
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="E.g. I need to break up the paving of a courtyard in Turin, about 150 sqm, and redo the sub-base. The narrowest passage is 1.5 m wide. Starting Monday, for two weeks."
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button type="submit" variant="primary" size="lg">
                    Continue with the assistant <ArrowRight aria-hidden />
                  </Button>
                  <span className="text-muted-foreground text-sm">
                    It asks the right questions and suggests machines from the catalogue.
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Live figures. */}
      <section className="mb-20 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [Truck, stats.models, "machine models"],
          [Layers, stats.offers, "offers to compare"],
          [Building2, stats.partners, "rental companies"],
          [MapPin, meta?.provinces.length ?? 0, "provinces served"],
        ].map(([Icon, n, label]) => {
          const I = Icon as typeof Truck
          return (
            <div
              key={label as string}
              className="border-border/70 flex items-center gap-3 rounded-2xl border bg-white/60 px-4 py-3.5"
            >
              <span className="icon-tile">
                <I aria-hidden />
              </span>
              <div className="leading-tight">
                <b className="font-heading block text-[1.6rem] font-medium tabular-nums">
                  {(n as number) || "—"}
                </b>
                <span className="text-muted-foreground text-[0.85rem]">{label as string}</span>
              </div>
            </div>
          )
        })}
      </section>

      <section className="mb-20">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="eyebrow">The fleet</div>
            <h2 className="mt-2 mb-0 text-[2.1rem]">Browse by category</h2>
          </div>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 font-medium no-underline hover:underline"
          >
            See the full catalogue <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(meta?.categories ?? []).map((c, i) => {
            const info = stats.byCat.get(c.id)
            return (
              <Link
                key={c.id}
                href={`/catalog?cat=${c.id}`}
                className={cn(
                  "group border-border/70 bg-card text-foreground shadow-soft lift relative flex flex-col overflow-hidden rounded-2xl border no-underline hover:no-underline",
                  i === 0 && "lg:col-span-2 lg:row-span-2"
                )}
              >
                <div
                  className={cn(
                    "bg-muted relative overflow-hidden",
                    i === 0 ? "aspect-[16/10] lg:aspect-auto lg:flex-1" : "aspect-[16/10]"
                  )}
                >
                  <MachinePhoto
                    src={c.image}
                    alt=""
                    sizes={
                      i === 0
                        ? "(min-width: 1024px) 620px, (min-width: 640px) 33vw, 50vw"
                        : "(min-width: 1024px) 300px, (min-width: 640px) 33vw, 50vw"
                    }
                    className="transition-transform duration-500 group-hover:scale-[1.06]"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
                  />
                  {info?.from != null && (
                    <span className="bg-ink absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold text-white">
                      from <span className="text-sun">{eurWhole(info.from)}</span>/day
                    </span>
                  )}
                </div>
                <div className={cn("flex flex-1 flex-col gap-1 p-4", i === 0 && "lg:flex-none")}>
                  <b
                    className={cn(
                      "leading-snug font-semibold",
                      i === 0
                        ? "lg:font-heading text-[0.98rem] lg:text-[1.35rem] lg:font-medium"
                        : "text-[0.98rem]"
                    )}
                  >
                    {c.name}
                  </b>
                  <span className="text-muted-foreground text-[0.84rem] leading-snug">
                    {c.subtypes.join(" · ")}
                  </span>
                  <span className="text-primary-hover mt-auto flex items-center justify-between pt-2 text-[0.84rem] font-medium">
                    {info ? `${info.count} model${info.count === 1 ? "" : "s"}` : " "}
                    <ArrowRight
                      aria-hidden
                      className="size-4 transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {stats.featured.length > 0 && (
        <section className="mb-20">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="eyebrow">Most choice</div>
              <h2 className="mt-2 mb-0 text-[2.1rem]">Machines with the most offers</h2>
            </div>
            <Link
              href="/catalog?sort=price"
              className="inline-flex items-center gap-1.5 font-medium no-underline hover:underline"
            >
              Lowest prices first <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.featured.map(({ model: m, offers }) => {
              const from = Math.min(...offers.map((o) => o.day ?? Infinity))
              return (
                <Link
                  key={m.id}
                  href={`/models/${m.id}`}
                  className="group border-border/70 bg-card text-foreground shadow-soft lift flex flex-col overflow-hidden rounded-2xl border no-underline hover:no-underline"
                >
                  <div className="bg-muted relative aspect-[4/3] overflow-hidden">
                    <MachinePhoto
                      src={m.image}
                      alt=""
                      sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
                      className="transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                    {offers.length > 1 && (
                      <span className="bg-sun text-ink absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold">
                        {offers.length} offers
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <span className="text-muted-foreground text-[0.8rem]">{m.subtype}</span>
                    <b className="text-[1.05rem] font-semibold">
                      {m.brand} {m.model}
                    </b>
                    <span className="text-muted-foreground mt-1 line-clamp-2 text-[0.85rem]">
                      {offers.map((o) => stripDemo(o.partner.name)).join(" · ")}
                    </span>
                    <div className="border-border/70 mt-auto flex items-end justify-between border-t pt-3">
                      <span>
                        <span className="text-muted-foreground text-[0.78rem]">from </span>
                        <span className="font-heading text-[1.45rem] leading-none font-medium">
                          {eurWhole(from)}
                        </span>
                        <span className="text-muted-foreground text-[0.78rem]"> /day</span>
                      </span>
                      <span className="bg-primary-soft text-primary group-hover:bg-primary inline-flex size-9 items-center justify-center rounded-full transition-colors group-hover:text-white">
                        <ArrowRight aria-hidden className="size-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
          <p className="text-faint mt-3 text-[0.82rem]">
            Demo prices excluding VAT; availability is always confirmed by the rental company.
          </p>
        </section>
      )}

      {/* Why Machina: dark full-bleed band. */}
      <section className="bg-ink text-ink-foreground relative mx-[calc(50%-50vw)] mb-20 overflow-hidden">
        <div className="bg-blueprint absolute inset-0" aria-hidden />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_70%_at_0%_0%,rgb(236_116_48/0.25),transparent_70%)]"
        />
        <div className="relative mx-auto grid max-w-[1240px] gap-10 px-4 py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="eyebrow text-sun">Why Machina</div>
            <h2 className="mt-3 text-[2.3rem] leading-tight text-white">
              Renting equipment, <span className="text-gradient">without the phone tag.</span>
            </h2>
            <p className="text-ink-foreground/70 max-w-md">
              One place to find machines, compare real conditions and keep every quote, order and
              document for all your sites.
            </p>
            <Link
              href="/catalog"
              className={buttonVariants({ variant: "primary", size: "lg", className: "mt-4" })}
            >
              Start comparing <ArrowRight aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHY.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.07]"
              >
                <span className="from-primary inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br to-[#f0a052] text-white shadow-[0_10px_24px_-10px_rgb(236_116_48/0.8)]">
                  <Icon aria-hidden className="size-5" />
                </span>
                <b className="mt-4 mb-1.5 block text-[1.05rem] text-white">{title}</b>
                <p className="text-ink-foreground/65 m-0 text-[0.93rem] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-20">
        <div className="mb-10 text-center">
          <div className="eyebrow">How it works</div>
          <h2 className="mx-auto mt-2 mb-0 max-w-xl text-[2.1rem]">
            From request to confirmed order in four steps
          </h2>
        </div>
        <ol className="relative m-0 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-4">
          <span
            aria-hidden
            className="via-primary/40 absolute top-7 right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-transparent to-transparent lg:block"
          />
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="relative text-center">
              <span className="border-primary/20 bg-card shadow-soft text-primary relative mx-auto inline-flex size-14 items-center justify-center rounded-2xl border">
                <Icon aria-hidden className="size-6" />
                <span className="bg-ink absolute -top-2 -right-2 inline-flex size-6 items-center justify-center rounded-full text-[0.72rem] font-bold text-white">
                  {i + 1}
                </span>
              </span>
              <b className="mt-4 mb-1.5 block text-[1.05rem]">{title}</b>
              <p className="text-muted-foreground m-0 mx-auto max-w-[260px] text-[0.93rem] leading-relaxed">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-border/70 bg-card shadow-lift relative grid overflow-hidden rounded-3xl border lg:grid-cols-2">
        <div className="relative p-8 sm:p-12">
          <div className="eyebrow">For rental companies</div>
          <h2 className="mt-3 mb-3 text-[2rem]">Are you a rental company in Piedmont?</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Publish your machines, receive structured requests with site, period and needs, and
            manage quotes and orders without the back-and-forth.
          </p>
          <ul className="mb-7 grid list-none gap-2.5 p-0">
            {[
              [CalendarRange, "Requests arrive complete: site, dates and needs"],
              [BadgeCheck, "You confirm availability and price, line by line"],
              [FileCheck2, "Changes, charges and documents tracked for you"],
            ].map(([Icon, t]) => {
              const I = Icon as typeof BadgeCheck
              return (
                <li key={t as string} className="flex items-center gap-2.5 text-[0.95rem]">
                  <span className="bg-ok-soft text-ok inline-flex size-7 items-center justify-center rounded-full">
                    <I aria-hidden className="size-4" />
                  </span>
                  {t as string}
                </li>
              )
            })}
          </ul>
          <Link
            href="/become-a-partner"
            className={buttonVariants({ variant: "dark", size: "lg" })}
          >
            Become a partner <ArrowRight aria-hidden />
          </Link>
        </div>
        <div className="bg-ink relative min-h-[260px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/yard.svg" alt="" className="absolute inset-0 size-full object-cover" />
        </div>
      </section>
    </>
  )
}
