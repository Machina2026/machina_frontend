import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-px text-xs leading-relaxed font-semibold whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        ok: "border-[#c4e3d1] bg-ok-soft text-ok",
        warn: "border-[#f0dca5] bg-warn-soft text-warn",
        bad: "border-[#f1c7c2] bg-bad-soft text-bad",
        info: "border-[#c9dcec] bg-info-soft text-info",
        accent: "border-[#f5d2b0] bg-primary-soft text-primary-hover",
        demo: "border-ink bg-ink text-[#ffd2a8]",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
)

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>

function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { Badge, badgeVariants }
