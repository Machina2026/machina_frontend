import * as React from "react"

import { cn } from "@/lib/utils"

import { controlClass } from "./input"

function Textarea({ className, rows = 3, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(controlClass, "resize-y", className)}
      {...props}
    />
  )
}

export { Textarea }
