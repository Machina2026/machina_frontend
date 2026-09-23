import { fileUrl } from "@/lib/machina/api"
import { num } from "@/lib/machina/format"
import type { PublicModel } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

/** Category illustration (or the partner's photo), always labelled as such. */
export function ModelImage({
  src,
  alt,
  note = "Illustrative image",
  className,
}: {
  src: string
  alt: string
  note?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "bg-accent relative aspect-[16/10] overflow-hidden rounded-md border",
        className
      )}
    >
      {/* Plain img: SVG illustrations and user uploads served by the API. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="size-full object-cover" />
      <span className="text-muted-foreground absolute right-1.5 bottom-1.5 rounded bg-white/85 px-1.5 text-[0.7rem]">
        {note}
      </span>
    </div>
  )
}

export function PhotoOrImage({
  photos,
  model,
  className,
}: {
  photos?: string[]
  model: PublicModel
  className?: string
}) {
  if (photos?.length)
    return (
      <ModelImage
        src={fileUrl(photos[0])}
        alt="Machine photo"
        note="Partner's photo"
        className={className}
      />
    )
  return (
    <ModelImage src={model.image} alt={`${model.brand} ${model.model}`} className={className} />
  )
}

export function SpecChips({ model, max = 4 }: { model: PublicModel; max?: number }) {
  return (
    <div className="my-2 flex flex-wrap gap-1.5">
      {model.specList.slice(0, max).map((s) => (
        <span
          key={s.key}
          className="bg-muted text-muted-foreground rounded-md border px-2 py-0.5 text-[0.8rem]"
        >
          {s.label}:{" "}
          <b className="text-foreground">
            {typeof s.value === "number" ? num(s.value) : s.value}
            {s.unit && ` ${s.unit}`}
          </b>
        </span>
      ))}
    </div>
  )
}
