import * as React from "react"

import { cn } from "@/lib/utils"

import { controlClass } from "./input"

export type Option = readonly [value: string, label: string]

/** Native select: best keyboard and mobile behaviour for simple option lists. */
function Select({
  className,
  options,
  ...props
}: React.ComponentProps<"select"> & { options: readonly Option[] }) {
  return (
    <select data-slot="select" className={cn(controlClass, "min-h-11 pr-8", className)} {...props}>
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  )
}

export { Select }
