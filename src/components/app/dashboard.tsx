import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { ACTION_KIND } from "@/lib/machina/labels"
import type { ActionItem } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

/** Count tile; `hot` highlights it in the accent colour when the count is not zero. */
export function Stat({
  n,
  label,
  href,
  hot,
}: {
  n: number
  label: string
  href: string
  hot?: boolean
}) {
  const highlight = hot && n > 0
  return (
    <Link
      href={href}
      className={cn(
        "border-border/70 bg-card text-foreground shadow-soft hover:shadow-lift block rounded-xl border p-5 no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:no-underline",
        highlight && "from-primary-soft border-[#eccfb3] bg-gradient-to-br to-white"
      )}
    >
      <div
        className={cn(
          "font-heading text-[2.2rem] leading-none font-medium",
          highlight && "text-primary"
        )}
      >
        {n}
      </div>
      <div className="text-muted-foreground mt-2 text-[0.9rem]">{label}</div>
    </Link>
  )
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">{children}</div>
}

/** "To do" list linking to where each action happens. */
export function ActionList({ actions }: { actions: ActionItem[] }) {
  if (!actions.length) return <p className="text-muted-foreground text-sm">Nothing pending.</p>
  return (
    <div className="divide-y">
      {actions.map((a, i) => (
        <Link
          key={i}
          href={a.link}
          className="text-foreground hover:bg-secondary -mx-2 flex items-start gap-3 rounded-lg px-2 py-3 no-underline transition-colors hover:no-underline"
        >
          <Badge tone={a.kind === "tax" ? "warn" : "accent"}>{ACTION_KIND[a.kind] ?? a.kind}</Badge>
          <span className="text-[0.95rem]">{a.text}</span>
        </Link>
      ))}
    </div>
  )
}
