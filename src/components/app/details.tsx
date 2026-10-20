"use client"

import { Badge } from "@/components/ui/badge"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { stripDemo } from "@/lib/machina/format"
import type { HistoryEntry, Needs, Quote, SiteRef } from "@/lib/machina/types"

import { KV, TableWrap } from "./bits"

const M = defineMessages({
  en: {
    noEvents: "No events yet.",
    site: "Site",
    access: "Access",
    ground: "Ground",
    hours: "Hours / limits",
    notes: "Notes",
    job: "Job",
    version: "Version",
    authorDate: "Author and date",
    validUntil: "Valid until",
    net: "Net",
    status: "Status",
    draft: "Machina draft",
    quote: "quote",
    partial: "partial",
    accepted: (at: string) => `accepted ${at}`,
    current: "current",
    replaced: "replaced",
    acceptance: (v: number, by: string, at: string) =>
      `Acceptance recorded: v${v} by ${by} on ${at}.`,
  },
  it: {
    noEvents: "Nessun evento.",
    site: "Cantiere",
    access: "Accesso",
    ground: "Terreno",
    hours: "Orari / vincoli",
    notes: "Note",
    job: "Lavoro",
    version: "Versione",
    authorDate: "Autore e data",
    validUntil: "Valido fino al",
    net: "Imponibile",
    status: "Stato",
    draft: "Bozza Machina",
    quote: "preventivo",
    partial: "parziale",
    accepted: (at: string) => `accettato ${at}`,
    current: "attuale",
    replaced: "sostituito",
    acceptance: (v: number, by: string, at: string) =>
      `Accettazione registrata: v${v} da ${by} il ${at}.`,
  },
})

/** History, newest first. */
export function Timeline({ entries }: { entries: HistoryEntry[] }) {
  const m = useMessages(M)
  const { dateTime } = useFormat()
  if (!entries.length) return <p className="text-muted-foreground text-sm">{m.noEvents}</p>
  return (
    <ol className="border-border m-0 list-none space-y-3 border-l-2 p-0 pl-4">
      {[...entries].reverse().map((h, i) => (
        <li key={i} className="relative text-[0.9rem]">
          <span
            aria-hidden
            className="bg-border-strong absolute top-1.5 -left-[21px] size-2 rounded-full"
          />
          <div className="text-muted-foreground text-[0.8rem]">
            {dateTime(h.at)} · {h.actor}
          </div>
          {h.text}
        </li>
      ))}
    </ol>
  )
}

/** Site address, needs and job description. */
export function SiteBlock({
  site,
  needs,
  job,
}: {
  site: SiteRef
  needs?: Partial<Needs>
  job?: string
}) {
  const m = useMessages(M)
  const items: [string, React.ReactNode][] = [
    [
      m.site,
      <>
        {site.name}
        <div className="text-muted-foreground text-[0.85rem] font-normal">
          {site.address}, {site.city} ({site.province})
        </div>
      </>,
    ],
  ]
  if (needs?.accessWidth) items.push([m.access, needs.accessWidth])
  if (needs?.ground) items.push([m.ground, needs.ground])
  if (needs?.schedule) items.push([m.hours, needs.schedule])
  if (needs?.notes) items.push([m.notes, needs.notes])
  if (job)
    items.push([
      m.job,
      <span key="job" className="font-normal">
        {job}
      </span>,
    ])
  return <KV items={items} />
}

/** Quote versions with author, date, validity and status. */
export function VersionsList({ quote: q }: { quote: Quote }) {
  const m = useMessages(M)
  const { date, dateTime, eur } = useFormat()
  return (
    <>
      <TableWrap>
        <thead>
          <tr>
            <th>{m.version}</th>
            <th>{m.authorDate}</th>
            <th>{m.validUntil}</th>
            <th className="num">{m.net}</th>
            <th>{m.status}</th>
          </tr>
        </thead>
        <tbody>
          {[...q.versions].reverse().map((v) => (
            <tr key={v.n}>
              <td className="whitespace-nowrap">
                <b>v{v.n}</b>{" "}
                {v.kind === "draft" ? (
                  <Badge>{m.draft}</Badge>
                ) : (
                  <Badge tone="info">{m.quote}</Badge>
                )}
              </td>
              <td>
                {stripDemo(v.author)}
                <div className="text-faint text-[0.82rem] whitespace-nowrap">
                  {dateTime(v.createdAt)}
                </div>
              </td>
              <td className="whitespace-nowrap">{v.validUntil ? date(v.validUntil) : "—"}</td>
              <td className="num">
                {eur(v.totals.net)} {!v.totals.complete && <Badge tone="warn">{m.partial}</Badge>}
              </td>
              <td>
                {q.acceptedVersion === v.n ? (
                  <Badge tone="ok">
                    {m.accepted(q.acceptance ? dateTime(q.acceptance.at) : "")}
                  </Badge>
                ) : v.n === q.currentVersion ? (
                  <Badge tone="accent">{m.current}</Badge>
                ) : (
                  <Badge>{m.replaced}</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {q.acceptance && (
        <p className="text-muted-foreground mt-1.5 text-[0.85rem]">
          {m.acceptance(q.acceptance.version, q.acceptance.by, dateTime(q.acceptance.at))}
        </p>
      )}
    </>
  )
}
