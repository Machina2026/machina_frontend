import * as React from "react"

import { cn } from "@/lib/utils"

type FieldProps = {
  label: React.ReactNode
  htmlFor?: string
  error?: string
  hint?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/** Label + control + hint + error. Pass `aria-invalid` on the control when `error` is set. */
export function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn("mb-3.5", className)} data-invalid={error ? "" : undefined}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[0.88rem] font-semibold">
        {label}
      </label>
      {children}
      {hint && <div className="text-muted-foreground mt-1 text-[0.84rem]">{hint}</div>}
      {error && (
        <div role="alert" className="text-bad mt-1 text-[0.84rem]">
          {error}
        </div>
      )}
    </div>
  )
}

/** Checkbox with its label on the right. */
export function Check({
  label,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { label: React.ReactNode }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2 text-[0.92rem] font-medium",
        props.disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <input type="checkbox" className="mt-[3px] size-4 shrink-0" {...props} />
      <span>{label}</span>
    </label>
  )
}

/** Pill-style checkbox, for picking several options (provinces, accessories). */
export function ChipCheck({
  label,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { label: React.ReactNode }) {
  return (
    <label
      className={cn(
        "border-border-strong has-checked:border-primary has-checked:bg-primary-soft inline-flex cursor-pointer items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-sm font-medium transition-colors",
        props.disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input type="checkbox" {...props} />
      {label}
    </label>
  )
}
