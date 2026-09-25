import { ArrowUpRight, ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { ACTION_KIND } from "@/lib/machina/labels"
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
        "group border-border/70 bg-card text-foreground shadow-soft lift relative block overflow-hidden rounded-2xl border p-5 no-underline hover:no-underline",
        highlight && "from-primary-soft border-[#eecdb0] bg-gradient-to-br via-white to-white"
      )}
    >
      {highlight && (
        <span aria-hidden className="bg-primary absolute inset-y-0 left-0 w-1 rounded-r-full" />
      )}
      <div className="flex items-start justify-between gap-3">
        {Icon && (
          <span
            className={cn(
              "icon-tile size-10",
              !highlight && "bg-muted text-muted-foreground",
              highlight && "bg-primary text-white shadow-[0_8px_18px_-8px_rgb(208_98_26/0.8)]"
            )}
          >
            <Icon aria-hidden />
          </span>
        )}
        <ArrowUpRight
          aria-hidden
          className="text-faint group-hover:text-primary size-4 transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
      <div
        className={cn(
          "font-heading mt-4 text-[2.4rem] leading-none font-medium tabular-nums",
          highlight && "text-primary"
        )}
      >
        {n}
      </div>
      <div className="text-muted-foreground mt-1.5 text-[0.9rem] leading-snug">{label}</div>
    </Link>
  )
}

function greeting(date = new Date()) {
  const h = date.getHours()
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

/** Dark greeting banner at the top of an area overview. */
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
  const first = name?.split(" ")[0]
  return (
    <section className="bg-ink text-ink-foreground shadow-lift relative mb-6 overflow-hidden rounded-3xl">
      <div className="bg-blueprint absolute inset-0" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_120%_at_100%_0%,rgb(236_116_48/0.42),transparent_65%),radial-gradient(40%_80%_at_0%_100%,rgb(245_181_46/0.12),transparent_70%)]"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/hero-site.svg"
        alt=""
        className="pointer-events-none absolute right-0 bottom-0 hidden h-full w-[55%] object-cover object-right-bottom opacity-60 md:block"
      />
      <div className="relative max-w-[580px] p-6 sm:p-9">
        <span className="text-sun inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[0.68rem] font-semibold tracking-[0.16em] uppercase">
          <span className="bg-sun size-1.5 rounded-full" aria-hidden />
          {org ? stripDemo(org) : ""}
        </span>
        <h1 className="mt-4 mb-2 text-[2.2rem] text-white sm:text-[2.7rem]">
          {greeting()}
          {first ? (
            <>
              , <span className="text-gradient">{first}</span>
            </>
          ) : (
            ""
          )}
        </h1>
        <p className="text-ink-foreground/75 m-0 text-[1.05rem]">{subtitle}</p>
        {actions && <div className="mt-6 flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div aria-hidden className="hazard relative h-1.5 opacity-80" />
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
  if (!actions.length)
    return (
      <p className="text-muted-foreground bg-ok-soft/60 text-ok m-0 rounded-xl px-4 py-3 text-sm">
        All clear: nothing pending.
      </p>
    )
  return (
    <div className="space-y-2">
      {actions.map((a, i) => (
        <Link
          key={i}
          href={a.link}
          className="group text-foreground border-border/70 hover:border-primary/40 hover:bg-primary-soft/40 flex items-center gap-3 rounded-xl border px-3.5 py-3 no-underline transition-colors hover:no-underline"
        >
          <Badge tone={a.kind === "tax" ? "warn" : "accent"}>{ACTION_KIND[a.kind] ?? a.kind}</Badge>
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
