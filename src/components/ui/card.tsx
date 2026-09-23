import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, flat, ...props }: React.ComponentProps<"div"> & { flat?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground rounded-lg border p-[18px]",
        !flat && "shadow-[0_1px_2px_rgba(0,0,0,.05),0_2px_8px_rgba(0,0,0,.04)]",
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
    <div className={cn("mb-3 flex flex-wrap items-center justify-between gap-3", className)}>
      <h3 className="m-0">{title}</h3>
      {actions}
    </div>
  )
}

export { Card, CardHead }
