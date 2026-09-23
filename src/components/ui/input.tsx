import * as React from "react"

import { cn } from "@/lib/utils"

export const controlClass =
  "w-full min-w-0 rounded-md border border-input bg-white px-3 py-2 text-[0.95rem] text-foreground transition-colors outline-none placeholder:text-faint focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-bad aria-invalid:bg-[#fffafa]"

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(controlClass, "min-h-10", className)}
      {...props}
    />
  )
}

export { Input }
