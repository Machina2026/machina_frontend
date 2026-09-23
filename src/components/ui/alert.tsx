import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva("rounded-lg border px-3.5 py-3 text-[0.92rem]", {
  variants: {
    tone: {
      neutral: "border-border bg-muted",
      info: "border-[#c9dcec] bg-info-soft",
      warn: "border-[#f0dca5] bg-warn-soft",
      bad: "border-[#f1c7c2] bg-bad-soft",
      ok: "border-[#c4e3d1] bg-ok-soft",
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
