import Link from "next/link"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/** Page title row: title, optional subtitle and actions. */
export function PageHead({
  title,
  eyebrow,
  children,
  actions,
}: {
  title: React.ReactNode
  /** Small label above the title. */
  eyebrow?: React.ReactNode
  children?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2.5">{eyebrow}</div>}
        <h1 className="mb-2">{title}</h1>
        {children && (
          <div className="text-muted-foreground max-w-[760px] text-[1.02rem]">{children}</div>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Breadcrumbs: [label, href] pairs, last item is the current page. */
export function Crumbs({ items }: { items: (readonly [string, string?])[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-muted-foreground mb-4 flex flex-wrap items-center gap-1.5 text-[0.85rem]"
    >
      {items.map(([label, href], i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span aria-hidden className="text-faint/70">
              /
            </span>
          )}
          {href ? (
            <Link
              href={href}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-1.5 py-0.5 no-underline hover:no-underline"
            >
              {label}
            </Link>
          ) : (
            <span aria-current="page" className="text-foreground px-1.5 font-medium">
              {label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

/** Definition list in two columns (label / value). */
export function KV({
  items,
  className,
}: {
  items: [React.ReactNode, React.ReactNode][]
  className?: string
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[minmax(110px,max-content)_1fr] gap-x-3.5 gap-y-1.5 text-[0.92rem]",
        className
      )}
    >
      {items.map(([k, v], i) => (
        <React.Fragment key={i}>
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="m-0 font-medium">{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  )
}

/** Horizontally scrollable table container. */
export function TableWrap({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "border-border/70 bg-card shadow-soft overflow-x-auto rounded-2xl border",
        className
      )}
    >
      <table className="data-table">{children}</table>
    </div>
  )
}

export function DemoBadge() {
  return (
    <Badge tone="demo" title="Demo data">
      DEMO
    </Badge>
  )
}

export function Small({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-muted-foreground text-[0.88rem]", className)} {...props} />
}

/** Bulleted list; `tone` sets the marker (tick, cross, question mark or dot). */
export function MarkList({
  items,
  tone = "dot",
  className,
}: {
  items: React.ReactNode[]
  tone?: "tick" | "miss" | "confirm" | "dot"
  className?: string
}) {
  const marker = { tick: "✓", miss: "✕", confirm: "?", dot: "•" }[tone]
  const color = { tick: "text-ok", miss: "text-bad", confirm: "text-warn", dot: "text-faint" }[tone]
  return (
    <ul className={cn("m-0 list-none space-y-1 p-0", className)}>
      {items.map((x, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className={cn("font-bold", color)}>
            {marker}
          </span>
          <span>{x}</span>
        </li>
      ))}
    </ul>
  )
}
