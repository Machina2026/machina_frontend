import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const variants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border font-semibold whitespace-nowrap no-underline transition-colors duration-150 outline-none select-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ink/25 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-border-strong bg-card text-foreground hover:border-foreground/50 hover:bg-secondary",
        primary:
          "border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover",
        dark: "border-ink bg-ink text-white hover:bg-ink-2 hover:text-white",
        /** Outline button for dark panels. */
        glass: "border-white/30 bg-transparent text-white hover:border-white/60 hover:bg-white/10",
        ok: "border-ok bg-ok text-white hover:bg-ok/90",
        danger: "border-[#f0c4bf] bg-card text-bad hover:bg-bad-soft",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-muted",
        link: "border-0 bg-transparent text-foreground underline decoration-foreground/30 hover:decoration-foreground",
      },
      size: {
        default: "min-h-11 px-4 py-2 text-[0.95rem]",
        sm: "min-h-9 px-3 py-1 text-[0.88rem]",
        lg: "min-h-12 px-6 py-3 text-[1rem]",
        icon: "size-9 p-0",
      },
      block: { true: "w-full", false: "" },
    },
    compoundVariants: [{ variant: "link", class: "min-h-0 px-0 py-0.5" }],
    defaultVariants: { variant: "default", size: "default", block: false },
  }
)

type ButtonVariantProps = VariantProps<typeof variants>

/** Button classes, also used to style links as buttons. */
function buttonVariants(props: ButtonVariantProps & { className?: string } = {}) {
  const { className, ...rest } = props
  return cn(variants(rest), className)
}

function Button({
  className,
  variant,
  size,
  block,
  type = "button",
  ...props
}: ButtonPrimitive.Props & ButtonVariantProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      type={type}
      className={buttonVariants({ variant, size, block, className: className as string })}
      {...props}
    />
  )
}

export { Button, buttonVariants }
