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
        "bg-card text-foreground hover:border-primary block rounded-lg border p-4 no-underline hover:no-underline",
        highlight && "bg-primary-soft border-[#f5d2b0]"
      )}
    >
      <div
        className={cn("text-[1.8rem] leading-none font-bold", highlight && "text-primary-hover")}
      >
        {n}
      </div>
      <div className="text-muted-foreground mt-1 text-sm">{label}</div>
    </Link>
  )
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">{children}</div>
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
          className="text-foreground hover:bg-muted flex items-start gap-2.5 py-2.5 no-underline hover:no-underline"
        >
          <Badge tone={a.kind === "tax" ? "warn" : "accent"}>{ACTION_KIND[a.kind] ?? a.kind}</Badge>
          <span className="text-[0.92rem]">{a.text}</span>
        </Link>
      ))}
    </div>
  )
}
