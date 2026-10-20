"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { MachinePhoto } from "@/components/app/model-image"
import { Skeleton } from "@/components/ui/skeleton"
import { useCatalogText } from "@/i18n/catalog"
import { useFormat, useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages } from "@/i18n/messages"
import { stripDemo } from "@/lib/machina/format"
import type { CatalogOffer, PublicModel } from "@/lib/machina/types"

const M = defineMessages({
  en: {
    offers: (n: number) => `${n} offers`,
    companies: (n: number) => `${n} rental companies`,
    daysFrom: (days: number) => `${days} days from`,
    compare: "Compare",
  },
  it: {
    offers: (n: number) => `${n} offerte`,
    companies: (n: number) => `${n} noleggiatori`,
    daysFrom: (days: number) => `${days} giorni da`,
    compare: "Confronta",
  },
})

/** A machine with its cheapest offer. The whole card links to the model page. */
export function ModelCard({
  model: m,
  offers,
  href,
  estimate,
  compareHref,
  sizes = "(min-width: 1280px) 300px, (min-width: 640px) 45vw, 100vw",
}: {
  model: PublicModel
  offers: CatalogOffer[]
  href: string
  /** Cheapest total for the searched period, e.g. [5, 1100]. */
  estimate?: [days: number, amount: number] | null
  compareHref?: string
  sizes?: string
}) {
  const t = useMessages(M)
  const c = useCommon()
  const ct = useCatalogText()
  const { eur, eurWhole, num } = useFormat()
  const from = Math.min(...offers.map((o) => o.day ?? Infinity))
  const specs = m.specList
    .slice(0, 2)
    .map(
      (s) => `${typeof s.value === "number" ? num(s.value) : s.value}${s.unit ? ` ${s.unit}` : ""}`
    )
  const partners = [...new Set(offers.map((o) => stripDemo(o.partner.name)))]
  return (
    <article className="group border-border bg-card lift relative flex flex-col overflow-hidden rounded-xl border">
      <div className="bg-muted relative aspect-[4/3] overflow-hidden">
        <MachinePhoto
          src={m.image}
          alt=""
          sizes={sizes}
          className="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute right-2 bottom-2 rounded bg-black/55 px-1.5 text-[0.66rem] text-white/90">
          {c.illustrativePhoto}
        </span>
        {offers.length > 1 && (
          <span className="bg-primary text-ink absolute top-3 left-3 rounded-md px-2 py-0.5 text-[0.75rem] font-bold">
            {t.offers(offers.length)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="text-muted-foreground text-[0.82rem]">{ct.subtype(m.subtype)}</span>
        <h3 className="mt-0.5 mb-1 text-[1.08rem]">
          {/* Stretched link: the whole card is clickable. */}
          <Link
            href={href}
            className="text-foreground no-underline after:absolute after:inset-0 hover:no-underline"
          >
            {m.brand} {m.model}
          </Link>
        </h3>
        {specs.length > 0 && (
          <p className="text-muted-foreground m-0 text-[0.86rem]">{specs.join(" · ")}</p>
        )}
        <p className="text-muted-foreground m-0 mt-1 line-clamp-1 text-[0.86rem]">
          {partners.length === 1 ? partners[0] : t.companies(partners.length)}
        </p>
        <div className="border-border mt-4 flex items-end justify-between gap-3 border-t pt-3">
          <div className="leading-tight">
            <span className="text-muted-foreground text-[0.82rem]">{c.from} </span>
            <span className="text-[1.35rem] font-bold tracking-[-0.02em]">{eurWhole(from)}</span>
            <span className="text-muted-foreground text-[0.82rem]"> {c.perDay}</span>
            {estimate && (
              <div className="text-muted-foreground text-[0.8rem]">
                {t.daysFrom(estimate[0])} <b className="text-foreground">{eur(estimate[1])}</b>
              </div>
            )}
          </div>
          {compareHref ? (
            <Link
              href={compareHref}
              className="border-border-strong hover:border-foreground/50 relative z-10 rounded-lg border px-3 py-1.5 text-[0.85rem] font-semibold no-underline hover:no-underline"
            >
              {t.compare}
            </Link>
          ) : (
            <span
              aria-hidden
              className="bg-secondary group-hover:bg-primary inline-flex size-9 items-center justify-center rounded-full transition-colors"
            >
              <ArrowRight className="size-4" />
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

/** Placeholder with the card's exact shape, so the grid doesn't jump when data arrives. */
export function ModelCardSkeleton() {
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border" aria-hidden>
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3.5 w-28" />
        <div className="border-border mt-4 border-t pt-3">
          <Skeleton className="h-7 w-28" />
        </div>
      </div>
    </div>
  )
}
