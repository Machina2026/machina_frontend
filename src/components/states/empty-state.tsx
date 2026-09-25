import { Inbox, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon?: LucideIcon
  /** Illustration from /public/img, shown instead of the icon. */
  image?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  image,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-border-strong/60 bg-card/70 relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-dashed bg-[radial-gradient(60%_80%_at_50%_0%,#fbeee2,transparent_70%)] px-6 py-14 text-center",
        className
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="mb-1 h-32 w-auto" />
      ) : (
        Icon && (
          <span className="icon-tile mb-1 size-14 rounded-2xl [&_svg]:size-6">
            <Icon aria-hidden />
          </span>
        )
      )}
      <div className="grid gap-1">
        <p className="font-heading m-0 text-[1.45rem] font-medium">{title}</p>
        {description && (
          <p className="text-muted-foreground m-0 max-w-md text-[0.95rem]">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
