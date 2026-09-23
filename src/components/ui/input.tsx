import * as React from "react"

import { cn } from "@/lib/utils"

export const controlClass =
  "w-full min-w-0 rounded-lg border border-input bg-white px-3.5 py-2 text-base text-foreground transition-colors outline-none placeholder:text-faint focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-bad aria-invalid:bg-[#fffafa]"

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(controlClass, "min-h-11", className)}
      {...props}
    />
  )
}

export { Input }
