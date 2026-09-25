import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const variants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border font-medium tracking-[0.005em] whitespace-nowrap no-underline transition-[background-color,border-color,box-shadow,transform] duration-150 outline-none select-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/35 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-border-strong bg-card text-foreground shadow-[0_1px_2px_rgb(20_18_14/0.05)] hover:border-foreground/40 hover:bg-secondary",
        primary:
          "border-primary-hover bg-gradient-to-b from-[#d4671f] to-primary text-primary-foreground shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_8px_20px_-8px_rgb(208_98_26/0.75)] hover:from-primary hover:to-primary-hover hover:shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_12px_26px_-10px_rgb(208_98_26/0.85)]",
        dark: "border-ink bg-ink text-ink-foreground shadow-[0_6px_16px_-8px_rgb(0_0_0/0.6)] hover:bg-ink-2",
        /** Translucent button for dark panels. */
        glass:
          "border-white/20 bg-white/[0.08] text-white backdrop-blur-sm hover:border-white/35 hover:bg-white/[0.14]",
        ok: "border-ok bg-ok text-white hover:bg-ok/90",
        danger: "border-[#e7c0bc] bg-card text-bad hover:bg-bad-soft",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-muted",
        link: "border-0 bg-transparent text-primary-hover hover:underline",
      },
      size: {
        default: "min-h-11 px-4 py-2 text-[0.95rem]",
        sm: "min-h-9 px-3 py-1 text-[0.88rem]",
        lg: "min-h-13 px-6 py-3 text-[1.02rem]",
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
