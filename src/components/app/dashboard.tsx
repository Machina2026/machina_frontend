"use client"

import { ArrowUpRight, ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { useLabels } from "@/lib/machina/labels"
import { stripDemo } from "@/lib/machina/format"
import type { ActionItem } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

/** Count tile; `hot` highlights it in the accent colour when the count is not zero. */
export function Stat({
  n,
  label,
  href,
  hot,
  icon: Icon,
}: {
  n: number
  label: string
  href: string
  hot?: boolean
  icon?: LucideIcon
}) {
  const highlight = hot && n > 0
  return (
    <Link
      href={href}
      className={cn(
        "group border-border bg-card text-foreground lift relative block overflow-hidden rounded-xl border p-5 no-underline hover:no-underline",
        highlight && "border-primary"
      )}
    >
      {highlight && <span aria-hidden className="bg-primary absolute inset-x-0 top-0 h-1" />}
      <div className="flex items-start justify-between gap-3">
        {Icon && (
          <span
            className={cn(
              "icon-tile size-10",
              !highlight && "bg-muted text-muted-foreground",
              highlight && "bg-primary text-ink"
            )}
          >
            <Icon aria-hidden />
          </span>
        )}
        <ArrowUpRight
          aria-hidden
          className="text-faint group-hover:text-foreground size-4 transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
      <div className="mt-4 text-[2.4rem] leading-none font-bold tracking-[-0.03em] tabular-nums">
        {n}
      </div>
      <div className="text-muted-foreground mt-1.5 text-[0.9rem] leading-snug">{label}</div>
    </Link>
  )
}

const M = defineMessages({
  en: {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    allClear: "All clear: nothing pending.",
  },
  it: {
    morning: "Buongiorno",
    afternoon: "Buon pomeriggio",
    evening: "Buonasera",
    allClear: "Tutto a posto: niente in sospeso.",
  },
})

function greetingKey(date = new Date()) {
  const h = date.getHours()
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"
}

/** Greeting at the top of an area overview. */
export function WelcomeBanner({
  name,
  org,
  subtitle,
  actions,
}: {
  name?: string
  org?: string
  subtitle: string
  actions?: React.ReactNode
}) {
  const t = useMessages(M)
  const first = name?.split(" ")[0]
  return (
    <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {org && (
          <p className="text-muted-foreground mb-1 text-[0.92rem] font-medium">{stripDemo(org)}</p>
        )}
        <h1 className="mb-1.5">
          {t[greetingKey()]}
          {first ? `, ${first}` : ""}
        </h1>
        <p className="text-muted-foreground m-0 text-[1.02rem]">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  )
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">{children}</div>
}

/** Card heading with an icon tile. */
export function PanelTitle({
  icon: Icon,
  children,
  aside,
}: {
  icon: LucideIcon
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="icon-tile size-9 rounded-lg [&_svg]:size-[18px]">
        <Icon aria-hidden />
      </span>
      <h3 className="m-0 flex-1">{children}</h3>
      {aside}
    </div>
  )
}

/** "To do" list linking to where each action happens. */
export function ActionList({ actions }: { actions: ActionItem[] }) {
  const t = useMessages(M)
  const L = useLabels()
  if (!actions.length)
    return (
      <p className="text-muted-foreground bg-ok-soft/60 text-ok m-0 rounded-xl px-4 py-3 text-sm">
        {t.allClear}
      </p>
    )
  return (
    <div className="space-y-2">
      {actions.map((a, i) => (
        <Link
          key={i}
          href={a.link}
          className="group text-foreground border-border hover:border-primary/40 hover:bg-primary-soft/40 flex items-center gap-3 rounded-xl border px-3.5 py-3 no-underline transition-colors hover:no-underline"
        >
          <Badge tone={a.kind === "tax" ? "warn" : "accent"}>
            {L.ACTION_KIND[a.kind] ?? a.kind}
          </Badge>
          <span className="flex-1 text-[0.93rem] leading-snug">{a.text}</span>
          <ChevronRight
            aria-hidden
            className="text-faint group-hover:text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      ))}
    </div>
  )
}
