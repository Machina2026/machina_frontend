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
import { useCatalogText } from "@/i18n/catalog"
import { useFormat, useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages, plural } from "@/i18n/messages"
import { addDays, today } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import type { CatalogResponse } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

/** Text handed from another page to the assistant's first message. */
export const ASSISTANT_SEED_KEY = "machina.assistantSeed"

const WHY_ICONS = [Scale, Wand2, Lock, MapPin]
const PARTNER_ICONS = [CalendarRange, BadgeCheck, FileCheck2]

const M = defineMessages({
  en: {
    heroTitle: "Rent the equipment you need, when you need it",
    heroIntro:
      "Compare construction equipment from rental companies across Turin and Piedmont, and book it with one request.",
    equipment: "Equipment",
    allEquipment: "All equipment",
    province: "Site province",
    allPiedmont: "All of Piedmont",
    fromDate: "From",
    toDate: "To",
    notSure: "Not sure what you need? Describe your job",
    promises: [
      "Several rental companies, one request",
      "Published rates, compared like for like",
      "Price locked when you accept",
    ],
    browseTitle: "Browse by category",
    browseIntro: "Every category, with the lowest daily rate across all rental companies.",
    viewAll: "View all equipment",
    models: (n: number) => `${n} ${plural(n, "model", "models")}`,
    noOffers: "No offers yet",
    popularTitle: "Machines with the most offers",
    popularIntro: "More rental companies means more choice on price and conditions.",
    lowestFirst: "Lowest prices first",
    howTitle: "How renting works",
    startSearch: "Start your search",
    steps: [
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
    ],
    whyTitle: "Why contractors choose Machina",
    whyIntro:
      "One place to find machines, compare real conditions and keep every quote, order and document for all your sites.",
    why: [
      {
        title: "Like-for-like comparison",
        body: "Transport, operator, accessories and minimum rental side by side, so the cheapest day rate isn't a surprise later.",
      },
      {
        title: "Help choosing the machine",
        body: "Describe the job in plain words. The assistant asks the right questions and suggests machines that fit your site.",
      },
      {
        title: "Prices that don't move",
        body: "Once you accept a quote the price is locked. Extensions and extra charges always need your approval.",
      },
      {
        title: "Local rental companies",
        body: "Depots across Turin and Piedmont, with the provinces each company delivers to shown on every offer.",
      },
    ],
    statModels: "machine models",
    statOffers: "offers to compare",
    statPartners: "rental companies",
    statProvinces: "provinces served",
    partnerKicker: "For rental companies",
    partnerTitle: "List your equipment on Machina",
    partnerIntro:
      "Publish your machines, receive structured requests with site, period and needs, and manage quotes and orders without the back-and-forth.",
    partnerPoints: [
      "Requests arrive complete: site, dates and needs",
      "You confirm availability and price, line by line",
      "Changes, charges and documents tracked for you",
    ],
    becomePartner: "Become a partner",
    faqTitle: "Frequently asked questions",
    faqIntro: "How prices, requests and rental companies work on Machina.",
    browseCatalog: "Browse the catalogue",
    faq: [
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
    ],
  },
  it: {
    heroTitle: "Le macchine che ti servono, quando ti servono",
    heroIntro:
      "Confronta le macchine edili dei noleggiatori di Torino e del Piemonte e prenotale con una sola richiesta.",
    equipment: "Macchina",
    allEquipment: "Tutte le macchine",
    province: "Provincia del cantiere",
    allPiedmont: "Tutto il Piemonte",
    fromDate: "Dal",
    toDate: "Al",
    notSure: "Non sai quale macchina ti serve? Descrivi il lavoro",
    promises: [
      "Più noleggiatori, una sola richiesta",
      "Tariffe pubblicate, confrontate alla pari",
      "Prezzo bloccato quando accetti",
    ],
    browseTitle: "Cerca per categoria",
    browseIntro: "Tutte le categorie, con la tariffa giornaliera più bassa tra i noleggiatori.",
    viewAll: "Vedi tutte le macchine",
    models: (n: number) => `${n} ${plural(n, "modello", "modelli")}`,
    noOffers: "Nessuna offerta per ora",
    popularTitle: "Le macchine con più offerte",
    popularIntro: "Più noleggiatori significa più scelta su prezzo e condizioni.",
    lowestFirst: "Prima i prezzi più bassi",
    howTitle: "Come funziona il noleggio",
    startSearch: "Inizia la ricerca",
    steps: [
      {
        title: "Trova la macchina",
        body: "Cerca per categoria e date, oppure descrivi il lavoro e lascia che l'assistente ti suggerisca le macchine.",
      },
      {
        title: "Confronta e richiedi",
        body: "Guarda cosa include ogni offerta, poi invia una sola richiesta. Ogni noleggiatore conferma le proprie righe.",
      },
      {
        title: "Accetta e inizia a lavorare",
        body: "Accetta il preventivo finale, poi segui ordine, proroghe, addebiti e documenti in un unico posto.",
      },
    ],
    whyTitle: "Perché le imprese scelgono Machina",
    whyIntro:
      "Un unico posto per trovare le macchine, confrontare le condizioni reali e tenere ogni preventivo, ordine e documento di tutti i tuoi cantieri.",
    why: [
      {
        title: "Confronto alla pari",
        body: "Trasporto, operatore, accessori e noleggio minimo uno accanto all'altro, così la tariffa giornaliera più bassa non riserva sorprese.",
      },
      {
        title: "Aiuto nella scelta",
        body: "Descrivi il lavoro con parole tue. L'assistente fa le domande giuste e suggerisce le macchine adatte al tuo cantiere.",
      },
      {
        title: "Prezzi che non cambiano",
        body: "Quando accetti un preventivo il prezzo è bloccato. Proroghe e addebiti extra richiedono sempre la tua approvazione.",
      },
      {
        title: "Noleggiatori locali",
        body: "Depositi a Torino e in tutto il Piemonte, con le province servite da ogni noleggiatore indicate su ogni offerta.",
      },
    ],
    statModels: "modelli di macchine",
    statOffers: "offerte da confrontare",
    statPartners: "noleggiatori",
    statProvinces: "province servite",
    partnerKicker: "Per i noleggiatori",
    partnerTitle: "Pubblica le tue macchine su Machina",
    partnerIntro:
      "Pubblica le tue macchine, ricevi richieste strutturate con cantiere, periodo ed esigenze, e gestisci preventivi e ordini senza continui scambi.",
    partnerPoints: [
      "Le richieste arrivano complete: cantiere, date ed esigenze",
      "Confermi disponibilità e prezzo, riga per riga",
      "Modifiche, addebiti e documenti tracciati per te",
    ],
    becomePartner: "Diventa partner",
    faqTitle: "Domande frequenti",
    faqIntro: "Come funzionano prezzi, richieste e noleggiatori su Machina.",
    browseCatalog: "Sfoglia il catalogo",
    faq: [
      {
        q: "I prezzi del catalogo sono definitivi?",
        a: "Sono le tariffe pubblicate da ogni noleggiatore, IVA esclusa. Quando invii una richiesta, il noleggiatore conferma disponibilità e prezzo finale; quando accetti il preventivo, quel prezzo è bloccato.",
      },
      {
        q: "Serve un account per cercare?",
        a: "No. Puoi sfogliare, confrontare e preparare una richiesta senza accedere. Ti serve un account cliente per inviare la richiesta e seguire preventivi e ordini.",
      },
      {
        q: "Posso noleggiare una macchina con l'operatore?",
        a: "Molte offerte includono l'operatore su richiesta, e alcune macchine (come le autogru) si noleggiano sempre con l'operatore. Usa il filtro “Disponibile con operatore” nel catalogo.",
      },
      {
        q: "Il trasporto in cantiere è incluso?",
        a: "Ogni offerta indica se il trasporto ha un prezzo fisso, è su preventivo o non è disponibile. Il confronto lo mostra come voce separata, così vedi il costo completo.",
      },
      {
        q: "Chi sono i noleggiatori?",
        a: "Aziende di noleggio locali con deposito in Piemonte. Ognuna viene verificata e approvata da Machina prima che le sue macchine compaiano nel catalogo.",
      },
    ],
  },
})

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
  const t = useMessages(M)
  const c = useCommon()
  const ct = useCatalogText()
  const { eurWhole } = useFormat()
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
            {t.heroTitle}
          </h1>
          <p className="mb-10 max-w-[580px] text-[1.12rem] text-white/80 sm:text-[1.25rem]">
            {t.heroIntro}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              router.push(`/catalog${qs(search)}`)
            }}
            className="grid max-w-[1060px] gap-2 rounded-2xl bg-white p-2 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.55)] sm:grid-cols-2 lg:grid-cols-[1.4fr_1.1fr_1fr_1fr_auto]"
          >
            <label className="block">
              <span className="sr-only">{t.equipment}</span>
              <Select
                value={search.cat}
                onChange={(e) => setSearch({ ...search, cat: e.target.value })}
                className="bg-secondary hover:border-border-strong min-h-13 border-transparent"
                options={[
                  ["", t.allEquipment],
                  ...(meta?.categories ?? []).map(
                    (x) => [x.id, ct.category(x.id, x.name)] as const
                  ),
                ]}
              />
            </label>
            <label className="block">
              <span className="sr-only">{t.province}</span>
              <Select
                value={search.prov}
                onChange={(e) => setSearch({ ...search, prov: e.target.value })}
                className="bg-secondary hover:border-border-strong min-h-13 border-transparent"
                options={[
                  ["", t.allPiedmont],
                  ...(meta?.provinces ?? []).map((p) => [p.id, ct.province(p.id, p.name)] as const),
                ]}
              />
            </label>
            <label className="block">
              <span className="sr-only">{t.fromDate}</span>
              <Input
                type="date"
                value={search.from}
                onChange={(e) => setSearch({ ...search, from: e.target.value })}
                className="bg-secondary hover:border-border-strong min-h-13 border-transparent"
              />
            </label>
            <label className="block">
              <span className="sr-only">{t.toDate}</span>
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
              <Search aria-hidden /> {c.search}
            </Button>
          </form>

          <Link
            href="/assistant"
            className="mt-5 inline-flex items-center gap-2 font-semibold text-white decoration-white/40 hover:text-white hover:decoration-white"
          >
            <Sparkles aria-hidden className="text-primary size-4" />
            {t.notSure}
          </Link>
          <ul className="mt-10 flex list-none flex-wrap gap-x-8 gap-y-2 p-0">
            {t.promises.map((p) => (
              <li key={p} className="flex items-center gap-2 text-[0.95rem] text-white/85">
                <Check aria-hidden className="text-primary size-4" />
                {p}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Section>
        <SectionHead title={t.browseTitle} intro={t.browseIntro} link={["/catalog", t.viewAll]} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {meta
            ? meta.categories.map((cat) => {
                const info = stats?.byCat.get(cat.id)
                return (
                  <Link
                    key={cat.id}
                    href={`/catalog?cat=${cat.id}`}
                    className="group border-border bg-card text-foreground lift flex items-center gap-4 rounded-xl border p-3 no-underline hover:no-underline"
                  >
                    <div className="bg-muted relative size-[76px] shrink-0 overflow-hidden rounded-lg">
                      <MachinePhoto src={cat.image} alt="" sizes="76px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <b className="block leading-snug font-semibold">
                        {ct.category(cat.id, cat.name)}
                      </b>
                      <div className="text-muted-foreground mt-1 h-5 text-[0.88rem]">
                        {!stats ? (
                          <Skeleton className="mt-1 h-3.5 w-32" />
                        ) : info ? (
                          <>
                            {t.models(info.count)} · {c.from}{" "}
                            <b className="text-foreground">{eurWhole(info.from)}</b>
                            {c.perDay}
                          </>
                        ) : (
                          t.noOffers
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
            title={t.popularTitle}
            intro={t.popularIntro}
            link={["/catalog?sort=price", t.lowestFirst]}
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
          <p className="text-muted-foreground mt-5 mb-0 text-[0.85rem]">{c.pricesExclVat}</p>
        </Section>
      )}

      <Section>
        <SectionHead title={t.howTitle} link={["/catalog", t.startSearch]} />
        <ol className="m-0 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-8">
          {t.steps.map(({ title, body }, i) => (
            <li key={title} className="relative">
              {i < t.steps.length - 1 && (
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
        <SectionHead title={t.whyTitle} intro={t.whyIntro} />
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {t.why.map(({ title, body }, i) => {
            const Icon = WHY_ICONS[i]
            return (
              <div key={title}>
                <span className="bg-ink text-primary inline-flex size-12 items-center justify-center rounded-xl">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="mt-5 mb-2">{title}</h3>
                <p className="text-muted-foreground m-0 text-[0.96rem] leading-relaxed">{body}</p>
              </div>
            )
          })}
        </div>
        {/* Live figures; gap-px over the border colour draws the dividers. */}
        <dl className="border-border bg-border mt-14 mb-0 grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-4">
          {(
            [
              [stats?.models, t.statModels],
              [stats?.offers, t.statOffers],
              [stats?.partners, t.statPartners],
              [meta?.provinces.length, t.statProvinces],
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
            <p className="mb-2 text-[0.95rem] font-semibold">{t.partnerKicker}</p>
            <h2 className="mb-4 text-[2rem] sm:text-[2.4rem]">{t.partnerTitle}</h2>
            <p className="mb-6 max-w-md text-black/75">{t.partnerIntro}</p>
            <ul className="mb-8 grid list-none gap-3 p-0">
              {t.partnerPoints.map((point, i) => {
                const Icon = PARTNER_ICONS[i]
                return (
                  <li key={point} className="flex items-center gap-3 font-medium">
                    <Icon aria-hidden className="size-5 shrink-0" />
                    {point}
                  </li>
                )
              })}
            </ul>
            <Link
              href="/become-a-partner"
              className={buttonVariants({ variant: "dark", size: "lg" })}
            >
              {t.becomePartner} <ArrowRight aria-hidden />
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
            <h2 className="mb-3 text-[2rem] sm:text-[2.4rem]">{t.faqTitle}</h2>
            <p className="text-muted-foreground mb-6 text-[1.05rem]">{t.faqIntro}</p>
            <Link href="/catalog" className={buttonVariants({ variant: "primary", size: "lg" })}>
              {t.browseCatalog} <ArrowRight aria-hidden />
            </Link>
          </div>
          <div className="border-border divide-border divide-y border-y">
            {t.faq.map(({ q, a }) => (
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
