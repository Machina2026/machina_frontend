"use client"

import { useQuery } from "@tanstack/react-query"
import {
  ArrowRight,
  BadgeCheck,
  CalendarRange,
  Check,
  ChevronDown,
  FileCheck2,
  Lock,
  MapPin,
  Scale,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { ModelCard, ModelCardSkeleton } from "@/components/app/model-card"
import { MachinePhoto } from "@/components/app/model-image"
import { Container } from "@/components/layout/container"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { api, qs } from "@/lib/machina/api"
import { addDays, eurWhole, today } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import type { CatalogResponse } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

/** Text handed from another page to the assistant's first message. */
export const ASSISTANT_SEED_KEY = "machina.assistantSeed"

const PROMISES = [
  "Several rental companies, one request",
  "Published rates, compared like for like",
  "Price locked when you accept",
]

const WHY = [
  {
    icon: Scale,
    title: "Like-for-like comparison",
    body: "Transport, operator, accessories and minimum rental side by side, so the cheapest day rate isn't a surprise later.",
  },
  {
    icon: Wand2,
    title: "Help choosing the machine",
    body: "Describe the job in plain words. The assistant asks the right questions and suggests machines that fit your site.",
  },
  {
    icon: Lock,
    title: "Prices that don't move",
    body: "Once you accept a quote the price is locked. Extensions and extra charges always need your approval.",
  },
  {
    icon: MapPin,
    title: "Local rental companies",
    body: "Depots across Turin and Piedmont, with the provinces each company delivers to shown on every offer.",
  },
]

const STEPS = [
  {
    title: "Find your machine",
    body: "Search by category and dates, or describe the job and let the assistant suggest machines.",
  },
  {
    title: "Compare and request",
    body: "See what each offer includes, then send one request. Each rental company confirms its own lines.",
  },
  {
    title: "Accept and get to work",
    body: "Accept the final quote, then follow the order, extensions, charges and documents in one place.",
  },
]

const FAQ = [
  {
    q: "Are the prices on the catalogue final?",
    a: "They are the rates each rental company publishes, excluding VAT. When you send a request, the company confirms availability and the final price; once you accept the quote, that price is locked.",
  },
  {
    q: "Do I need an account to search?",
    a: "No. You can browse, compare and build a request without signing in. You need a customer account to send the request and follow quotes and orders.",
  },
  {
    q: "Can I rent a machine with an operator?",
    a: "Many offers include an operator on request, and some machines (like mobile cranes) are always rented with one. Use the “Available with an operator” filter in the catalogue.",
  },
  {
    q: "Is transport to the site included?",
    a: "Each offer says whether transport has a fixed price, is quoted separately or isn't available. The comparison shows it as its own line, so you see the full cost.",
  },
  {
    q: "Who are the rental companies?",
    a: "Local rental companies with depots in Piedmont. Each one is reviewed and approved by Machina before its machines appear in the catalogue.",
  },
]

/** A full-width band; its content sits on the site's container. */
function Section({
  muted,
  className,
  children,
}: {
  muted?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("py-16 sm:py-24", muted && "bg-secondary", className)}>
      <Container>{children}</Container>
    </section>
  )
}

/** Section title: heading and intro on the left, an optional link on the right. */
function SectionHead({
  title,
  intro,
  link,
}: {
  title: string
  intro?: string
  link?: [href: string, label: string]
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="max-w-2xl">
        <h2 className="mb-0 text-[2rem] sm:text-[2.4rem]">{title}</h2>
        {intro && <p className="text-muted-foreground mt-3 mb-0 text-[1.08rem]">{intro}</p>}
      </div>
      {link && (
        <Link
          href={link[0]}
          className="inline-flex items-center gap-1.5 font-semibold no-underline hover:underline"
        >
          {link[1]} <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </div>
  )
}

export function HomeView() {
  const router = useRouter()
  const meta = useMeta().data
  const catalog = useQuery({
    queryKey: ["catalog", {}],
    queryFn: () => api.get<CatalogResponse>("/api/catalog"),
  }).data
  const [search, setSearch] = useState(() => {
    const from = addDays(today(), 7)
    return { cat: "", prov: "TO", from, to: addDays(from, 4) }
  })

  // Figures and "from" prices come from the live catalogue, never hard-coded.
  const stats = useMemo(() => {
    if (!catalog) return null
    const results = catalog.results
    const byCat = new Map<string, { count: number; from: number }>()
    for (const { model, offers } of results) {
      const day = Math.min(...offers.map((o) => o.day ?? Infinity))
      const cur = byCat.get(model.category) ?? { count: 0, from: Infinity }
      byCat.set(model.category, { count: cur.count + 1, from: Math.min(cur.from, day) })
    }
    return {
      models: results.length,
      offers: results.reduce((n, r) => n + r.offers.length, 0),
      partners: new Set(results.flatMap((r) => r.offers.map((o) => o.partner.id))).size,
      byCat,
      featured: [...results]
        .sort((a, b) => b.offers.length - a.offers.length)
        .filter((r, i, all) => all.findIndex((x) => x.model.category === r.model.category) === i)
        .slice(0, 4),
    }
  }, [catalog])

  return (
    <>
      {/* Hero: photo, headline and one search bar. */}
      <section className="bg-ink relative overflow-hidden">
        <MachinePhoto src="/img/excavator.png" alt="" sizes="100vw" eager />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/25"
        />
        <Container className="relative py-20 sm:py-28">
          <h1 className="mb-5 max-w-[760px] text-[2.6rem] leading-[1.04] text-white sm:text-[4rem]">
            Rent the equipment you need, when you need it
          </h1>
          <p className="mb-10 max-w-[580px] text-[1.12rem] text-white/80 sm:text-[1.25rem]">
            Compare construction equipment from rental companies across Turin and Piedmont, and book
            it with one request.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              router.push(`/catalog${qs(search)}`)
            }}
            className="grid max-w-[1060px] gap-2 rounded-2xl bg-white p-2 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.55)] sm:grid-cols-2 lg:grid-cols-[1.4fr_1.1fr_1fr_1fr_auto]"
          >
            <label className="block">
              <span className="sr-only">Equipment</span>
              <Select
                value={search.cat}
                onChange={(e) => setSearch({ ...search, cat: e.target.value })}
                className="bg-secondary hover:border-border-strong min-h-13 border-transparent"
                options={[
                  ["", "All equipment"],
                  ...(meta?.categories ?? []).map((c) => [c.id, c.name] as const),
                ]}
              />
            </label>
            <label className="block">
              <span className="sr-only">Site province</span>
              <Select
                value={search.prov}
                onChange={(e) => setSearch({ ...search, prov: e.target.value })}
                className="bg-secondary hover:border-border-strong min-h-13 border-transparent"
                options={[
                  ["", "All of Piedmont"],
                  ...(meta?.provinces ?? []).map((p) => [p.id, p.name] as const),
                ]}
              />
            </label>
            <label className="block">
              <span className="sr-only">From</span>
              <Input
                type="date"
                value={search.from}
                onChange={(e) => setSearch({ ...search, from: e.target.value })}
                className="bg-secondary hover:border-border-strong min-h-13 border-transparent"
              />
            </label>
            <label className="block">
              <span className="sr-only">To</span>
              <Input
                type="date"
                value={search.to}
                onChange={(e) => setSearch({ ...search, to: e.target.value })}
                className="bg-secondary hover:border-border-strong min-h-13 border-transparent"
              />
            </label>
            <Button
              type="submit"
              variant="primary"
              className="min-h-13 px-8 text-[1.02rem] sm:col-span-2 lg:col-span-1"
            >
              <Search aria-hidden /> Search
            </Button>
          </form>

          <Link
            href="/assistant"
            className="mt-5 inline-flex items-center gap-2 font-semibold text-white decoration-white/40 hover:text-white hover:decoration-white"
          >
            <Sparkles aria-hidden className="text-primary size-4" />
            Not sure what you need? Describe your job
          </Link>
          <ul className="mt-10 flex list-none flex-wrap gap-x-8 gap-y-2 p-0">
            {PROMISES.map((t) => (
              <li key={t} className="flex items-center gap-2 text-[0.95rem] text-white/85">
                <Check aria-hidden className="text-primary size-4" />
                {t}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Section>
        <SectionHead
          title="Browse by category"
          intro="Every category, with the lowest daily rate across all rental companies."
          link={["/catalog", "View all equipment"]}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {meta
            ? meta.categories.map((c) => {
                const info = stats?.byCat.get(c.id)
                return (
                  <Link
                    key={c.id}
                    href={`/catalog?cat=${c.id}`}
                    className="group border-border bg-card text-foreground lift flex items-center gap-4 rounded-xl border p-3 no-underline hover:no-underline"
                  >
                    <div className="bg-muted relative size-[76px] shrink-0 overflow-hidden rounded-lg">
                      <MachinePhoto src={c.image} alt="" sizes="76px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <b className="block leading-snug font-semibold">{c.name}</b>
                      <div className="text-muted-foreground mt-1 h-5 text-[0.88rem]">
                        {!stats ? (
                          <Skeleton className="mt-1 h-3.5 w-32" />
                        ) : info ? (
                          <>
                            {info.count} model{info.count === 1 ? "" : "s"} · from{" "}
                            <b className="text-foreground">{eurWhole(info.from)}</b>/day
                          </>
                        ) : (
                          "No offers yet"
                        )}
                      </div>
                    </div>
                    <ArrowRight
                      aria-hidden
                      className="text-faint group-hover:text-foreground mr-1 size-4 shrink-0 transition-[color,transform] group-hover:translate-x-0.5"
                    />
                  </Link>
                )
              })
            : Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  aria-hidden
                  className="border-border flex items-center gap-4 rounded-xl border p-3"
                >
                  <Skeleton className="size-[76px] shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3.5 w-28" />
                  </div>
                </div>
              ))}
        </div>
      </Section>

      {(!stats || stats.featured.length > 0) && (
        <Section muted>
          <SectionHead
            title="Machines with the most offers"
            intro="More rental companies means more choice on price and conditions."
            link={["/catalog?sort=price", "Lowest prices first"]}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats
              ? stats.featured.map(({ model, offers }) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    offers={offers}
                    href={`/models/${model.id}`}
                    sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
                  />
                ))
              : Array.from({ length: 4 }, (_, i) => <ModelCardSkeleton key={i} />)}
          </div>
          <p className="text-muted-foreground mt-5 mb-0 text-[0.85rem]">
            Prices excluding VAT. Availability is always confirmed by the rental company.
          </p>
        </Section>
      )}

      <Section>
        <SectionHead title="How renting works" link={["/catalog", "Start your search"]} />
        <ol className="m-0 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-8">
          {STEPS.map(({ title, body }, i) => (
            <li key={title} className="relative">
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="bg-border absolute top-6 left-16 hidden h-px w-[calc(100%-3rem)] md:block"
                />
              )}
              <span className="bg-primary text-ink relative inline-flex size-12 items-center justify-center rounded-full text-[1.15rem] font-bold">
                {i + 1}
              </span>
              <h3 className="mt-5 mb-2 text-[1.2rem]">{title}</h3>
              <p className="text-muted-foreground m-0 max-w-[340px] leading-relaxed">{body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section muted>
        <SectionHead
          title="Why contractors choose Machina"
          intro="One place to find machines, compare real conditions and keep every quote, order and document for all your sites."
        />
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <span className="bg-ink text-primary inline-flex size-12 items-center justify-center rounded-xl">
                <Icon aria-hidden className="size-5" />
              </span>
              <h3 className="mt-5 mb-2">{title}</h3>
              <p className="text-muted-foreground m-0 text-[0.96rem] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        {/* Live figures; gap-px over the border colour draws the dividers. */}
        <dl className="border-border bg-border mt-14 mb-0 grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-4">
          {(
            [
              [stats?.models, "machine models"],
              [stats?.offers, "offers to compare"],
              [stats?.partners, "rental companies"],
              [meta?.provinces.length, "provinces served"],
            ] as const
          ).map(([n, label]) => (
            <div key={label} className="bg-card flex flex-col-reverse gap-1.5 px-6 py-6">
              <dt className="text-muted-foreground text-[0.92rem]">{label}</dt>
              <dd className="m-0 h-9 text-[2.2rem] leading-none font-bold tracking-[-0.03em] tabular-nums">
                {n === undefined ? <Skeleton className="h-9 w-14" /> : n}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section>
        {/* For rental companies: the page's one yellow block. */}
        <div className="bg-primary grid overflow-hidden rounded-2xl lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <p className="mb-2 text-[0.95rem] font-semibold">For rental companies</p>
            <h2 className="mb-4 text-[2rem] sm:text-[2.4rem]">List your equipment on Machina</h2>
            <p className="mb-6 max-w-md text-black/75">
              Publish your machines, receive structured requests with site, period and needs, and
              manage quotes and orders without the back-and-forth.
            </p>
            <ul className="mb-8 grid list-none gap-3 p-0">
              {(
                [
                  [CalendarRange, "Requests arrive complete: site, dates and needs"],
                  [BadgeCheck, "You confirm availability and price, line by line"],
                  [FileCheck2, "Changes, charges and documents tracked for you"],
                ] as const
              ).map(([Icon, t]) => (
                <li key={t} className="flex items-center gap-3 font-medium">
                  <Icon aria-hidden className="size-5 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href="/become-a-partner"
              className={buttonVariants({ variant: "dark", size: "lg" })}
            >
              Become a partner <ArrowRight aria-hidden />
            </Link>
          </div>
          <div className="relative min-h-[280px] lg:m-3 lg:overflow-hidden lg:rounded-xl">
            <MachinePhoto
              src="/img/telehandler.png"
              alt=""
              sizes="(min-width: 1024px) 600px, 100vw"
            />
          </div>
        </div>
      </Section>

      <Section className="pt-0 sm:pt-0">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <h2 className="mb-3 text-[2rem] sm:text-[2.4rem]">Frequently asked questions</h2>
            <p className="text-muted-foreground mb-6 text-[1.05rem]">
              How prices, requests and rental companies work on Machina.
            </p>
            <Link href="/catalog" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Browse the catalogue <ArrowRight aria-hidden />
            </Link>
          </div>
          <div className="border-border divide-border divide-y border-y">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[1.05rem] font-semibold [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown
                    aria-hidden
                    className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="text-muted-foreground m-0 pb-5 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>
    </>
  )
}
