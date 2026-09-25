import { Badge } from "@/components/ui/badge"
import { date, dateTime, eur, stripDemo } from "@/lib/machina/format"
import type { HistoryEntry, Needs, Quote, SiteRef } from "@/lib/machina/types"

import { KV, TableWrap } from "./bits"

/** History, newest first. */
export function Timeline({ entries }: { entries: HistoryEntry[] }) {
  if (!entries.length) return <p className="text-muted-foreground text-sm">No events yet.</p>
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
  const items: [string, React.ReactNode][] = [
    [
      "Site",
      <>
        {site.name}
        <div className="text-muted-foreground text-[0.85rem] font-normal">
          {site.address}, {site.city} ({site.province})
        </div>
      </>,
    ],
  ]
  if (needs?.accessWidth) items.push(["Access", needs.accessWidth])
  if (needs?.ground) items.push(["Ground", needs.ground])
  if (needs?.schedule) items.push(["Hours / limits", needs.schedule])
  if (needs?.notes) items.push(["Notes", needs.notes])
  if (job)
    items.push([
      "Job",
      <span key="job" className="font-normal">
        {job}
      </span>,
    ])
  return <KV items={items} />
}

/** Quote versions with author, date, validity and status. */
export function VersionsList({ quote: q }: { quote: Quote }) {
  return (
    <>
      <TableWrap>
        <thead>
          <tr>
            <th>Version</th>
            <th>Author and date</th>
            <th>Valid until</th>
            <th className="num">Net</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {[...q.versions].reverse().map((v) => (
            <tr key={v.n}>
              <td className="whitespace-nowrap">
                <b>v{v.n}</b>{" "}
                {v.kind === "draft" ? (
                  <Badge>Machina draft</Badge>
                ) : (
                  <Badge tone="info">quote</Badge>
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
                {eur(v.totals.net)} {!v.totals.complete && <Badge tone="warn">partial</Badge>}
              </td>
              <td>
                {q.acceptedVersion === v.n ? (
                  <Badge tone="ok">accepted {q.acceptance ? dateTime(q.acceptance.at) : ""}</Badge>
                ) : v.n === q.currentVersion ? (
                  <Badge tone="accent">current</Badge>
                ) : (
                  <Badge>replaced</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {q.acceptance && (
        <p className="text-muted-foreground mt-1.5 text-[0.85rem]">
          Acceptance recorded: v{q.acceptance.version} by {q.acceptance.by} on{" "}
          {dateTime(q.acceptance.at)}.
        </p>
      )}
    </>
  )
}
