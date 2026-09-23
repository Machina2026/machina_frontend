import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, flat, ...props }: React.ComponentProps<"div"> & { flat?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground rounded-xl border p-5 sm:p-6",
        !flat && "shadow-soft border-border/70",
        className
      )}
      {...props}
    />
  )
}

/** Card title row with optional actions on the right. */
function CardHead({
  title,
  actions,
  className,
}: {
  title: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-3", className)}>
      <h3 className="m-0">{title}</h3>
      {actions}
    </div>
  )
}

export { Card, CardHead }
