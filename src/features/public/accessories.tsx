"use client"

import { useQuery } from "@tanstack/react-query"
import { Drill, Forklift, Hammer, type LucideIcon, Puzzle, Shovel, Zap } from "lucide-react"
import Link from "next/link"

import { PageHead, Small } from "@/components/app/bits"
import { QueryView } from "@/components/app/query-view"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/machina/api"
import { useCatalogText } from "@/i18n/catalog"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { stripDemo } from "@/lib/machina/format"
import type { AccessoryListing } from "@/lib/machina/types"

const GROUP_ICON: Record<string, LucideIcon> = {
  Demolition: Hammer,
  Digging: Shovel,
  Drilling: Drill,
  Lifting: Forklift,
  Power: Zap,
}

const M = defineMessages({
  en: {
    eyebrow: "Attachments",
    title: "Compatible accessories",
    intro: "Accessories are rented together with a compatible machine. Prices excluding VAT.",
    groups: "Accessory groups",
    included: "Included",
    from: "from",
    perDay: "/day",
    withModel: (model: string) => `with ${model}`,
    noPartner: "No partner lists it at the moment.",
  },
  it: {
    eyebrow: "Attrezzature",
    title: "Accessori compatibili",
    intro: "Gli accessori si noleggiano insieme a una macchina compatibile. Prezzi IVA esclusa.",
    groups: "Gruppi di accessori",
    included: "Incluso",
    from: "da",
    perDay: "/giorno",
    withModel: (model: string) => `con ${model}`,
    noPartner: "Al momento nessun noleggiatore lo offre.",
  },
})

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-")

export function AccessoriesView() {
  const t = useMessages(M)
  const ct = useCatalogText()
  const { eur, eurWhole } = useFormat()
  const q = useQuery({
    queryKey: ["accessories"],
    queryFn: () => api.get<{ accessories: AccessoryListing[] }>("/api/accessories"),
  })
  return (
    <>
      <PageHead eyebrow={t.eyebrow} title={t.title}>
        {t.intro}
      </PageHead>
      <QueryView query={q}>
        {({ accessories }) => {
          const groups = new Map<string, AccessoryListing[]>()
          for (const a of accessories) groups.set(a.group, [...(groups.get(a.group) ?? []), a])
          return (
            <>
              <nav aria-label={t.groups} className="mb-8 flex flex-wrap gap-2">
                {[...groups].map(([group, items]) => {
                  const Icon = GROUP_ICON[group] ?? Puzzle
                  return (
                    <a
                      key={group}
                      href={`#${slug(group)}`}
                      className="border-border bg-card text-foreground hover:border-primary/40 inline-flex items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-[0.88rem] font-medium no-underline hover:no-underline"
                    >
                      <span className="bg-primary-soft text-brand inline-flex size-7 items-center justify-center rounded-full">
                        <Icon aria-hidden className="size-3.5" />
                      </span>
                      {ct.accessoryGroup(group)}
                      <span className="text-faint text-[0.8rem]">{items.length}</span>
                    </a>
                  )
                })}
              </nav>
              {[...groups].map(([group, items]) => {
                const Icon = GROUP_ICON[group] ?? Puzzle
                return (
                  <section key={group} id={slug(group)} className="mb-10 scroll-mt-28">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="icon-tile">
                        <Icon aria-hidden />
                      </span>
                      <h2 className="m-0">{ct.accessoryGroup(group)}</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {items.map((a) => {
                        const paid = a.availability.filter((x) => !x.included).map((x) => x.day)
                        const included = a.availability.some((x) => x.included)
                        return (
                          <Card key={a.id} className="lift flex flex-col">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="m-0">{a.name}</h3>
                              {(paid.length > 0 || included) && (
                                <span className="bg-ink shrink-0 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold whitespace-nowrap text-white">
                                  {included && !paid.length ? (
                                    <span className="text-primary">{t.included}</span>
                                  ) : (
                                    <>
                                      {t.from}{" "}
                                      <span className="text-primary">
                                        {eurWhole(Math.min(...paid))}
                                      </span>
                                      {t.perDay}
                                    </>
                                  )}
                                </span>
                              )}
                            </div>
                            <Small className="mt-1.5 mb-3">{a.description}</Small>
                            <div className="mb-3 flex flex-wrap gap-1.5">
                              {a.compatibleModels.map((m) => (
                                <Link
                                  key={m.id}
                                  href={`/models/${m.id}`}
                                  className="bg-muted text-foreground hover:bg-primary-soft hover:text-brand rounded-md border px-2 py-0.5 text-[0.8rem] font-medium no-underline hover:no-underline"
                                >
                                  {m.label}
                                </Link>
                              ))}
                            </div>
                            {a.availability.length ? (
                              <ul className="border-border m-0 mt-auto list-none divide-y rounded-xl border p-0 text-[0.88rem]">
                                {a.availability.map((x) => (
                                  <li
                                    key={x.offerId}
                                    className="flex items-center justify-between gap-3 px-3 py-2"
                                  >
                                    <span className="min-w-0">
                                      <b className="block truncate font-medium">
                                        {stripDemo(x.partner)}
                                      </b>
                                      <Link
                                        href={`/models/${x.modelId}`}
                                        className="text-muted-foreground text-[0.8rem]"
                                      >
                                        {t.withModel(x.model)}
                                      </Link>
                                    </span>
                                    <span className="shrink-0 font-semibold tabular-nums">
                                      {x.included ? (
                                        <span className="text-ok">{t.included}</span>
                                      ) : (
                                        `${eur(x.day)}${t.perDay}`
                                      )}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <Small className="mt-auto">{t.noPartner}</Small>
                            )}
                          </Card>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </>
          )
        }}
      </QueryView>
    </>
  )
}
