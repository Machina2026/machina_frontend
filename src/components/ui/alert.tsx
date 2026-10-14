import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva("rounded-xl border px-4 py-3.5 text-[0.95rem] leading-relaxed", {
  variants: {
    tone: {
      neutral: "border-border bg-secondary",
      info: "border-[#d3e3f1] bg-info-soft",
      warn: "border-[#f6e2a4] bg-warn-soft",
      bad: "border-[#f5cdc8] bg-bad-soft",
      ok: "border-[#cde8d9] bg-ok-soft",
    },
    size: { default: "", sm: "text-sm" },
  },
  defaultVariants: { tone: "neutral", size: "default" },
})

type AlertProps = Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof alertVariants> & { title?: React.ReactNode }

function Alert({ className, tone, size, title, children, ...props }: AlertProps) {
  return (
    <div
      role={tone === "bad" ? "alert" : undefined}
      className={cn(alertVariants({ tone, size }), className)}
      {...props}
    >
      {title && <strong className="mb-0.5 block">{title}</strong>}
      {children}
    </div>
  )
}

export { Alert }
