"use client"

import Image from "next/image"

import { photoUrl } from "@/lib/machina/api"
import { useCatalogText } from "@/i18n/catalog"
import { useFormat, useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages } from "@/i18n/messages"
import type { PublicModel } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

/**
 * Where the machine sits in each category photo, so cropped frames keep it in view
 * instead of cutting from the centre. `zoom` enlarges photos where the machine is
 * small or shares the shot with something else (the platform photo has a cage in it).
 */
const PHOTO_FOCUS: Record<string, { at: string; zoom?: number }> = {
  "/img/aerial_work_platform.png": { at: "12% 38%", zoom: 1.45 },
  "/img/backhoe_loader.png": { at: "55% 65%" },
  "/img/compaction_roller.png": { at: "42% 45%", zoom: 1.1 },
  "/img/dumper.png": { at: "50% 55%" },
  "/img/excavator.png": { at: "60% 50%" },
  "/img/mobile_crane.png": { at: "45% 52%" },
  "/img/site_generator.png": { at: "38% 45%", zoom: 1.1 },
  "/img/telehandler.png": { at: "45% 55%" },
  "/img/wheel_loader.png": { at: "48% 62%", zoom: 1.15 },
}

/**
 * Photo that fills its (positioned) parent. Category photos in /public/img are
 * multi-megabyte originals, so they go through Next's optimiser; SVGs and partner
 * uploads served by the API are passed through as they are.
 *
 * `cover` crops to the frame around the machine; `contain` shows the whole photo
 * over a blurred copy of itself, for frames whose shape is far from the photo's.
 */
export function MachinePhoto({
  src,
  alt,
  sizes,
  fit = "cover",
  className,
  eager,
}: {
  src: string
  alt: string
  /** Rendered width, e.g. "(min-width: 1024px) 33vw, 100vw". */
  sizes: string
  fit?: "cover" | "contain"
  className?: string
  /** Above-the-fold image: load straight away. */
  eager?: boolean
}) {
  const common = {
    src,
    fill: true,
    unoptimized: !src.startsWith("/img/"),
  } as const
  const focus = PHOTO_FOCUS[src]
  const photo = (
    <Image
      {...common}
      alt={alt}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      style={
        fit === "cover"
          ? {
              objectPosition: focus?.at,
              transformOrigin: focus?.at,
              transform: focus?.zoom ? `scale(${focus.zoom})` : undefined,
            }
          : undefined
      }
      className={cn(fit === "cover" ? "object-cover" : "object-contain", className)}
    />
  )
  if (fit === "cover") return photo
  return (
    <>
      <Image
        {...common}
        alt=""
        aria-hidden
        sizes="96px"
        loading={eager ? "eager" : "lazy"}
        className="scale-150 object-cover opacity-45 blur-3xl"
      />
      {photo}
    </>
  )
}

const M = defineMessages({
  en: { machinePhoto: "Machine photo", partnerPhoto: "Partner's photo" },
  it: { machinePhoto: "Foto della macchina", partnerPhoto: "Foto del noleggiatore" },
})

/** Category photo (or the partner's photo), always labelled as such. */
export function ModelImage({
  src,
  alt,
  note,
  sizes = "(min-width: 1024px) 420px, 100vw",
  className,
}: {
  src: string
  alt: string
  note?: string
  sizes?: string
  className?: string
}) {
  const c = useCommon()
  return (
    <div
      className={cn(
        "border-border bg-muted relative aspect-[16/10] overflow-hidden rounded-xl border",
        className
      )}
    >
      <MachinePhoto src={src} alt={alt} sizes={sizes} />
      <span className="text-muted-foreground absolute right-1.5 bottom-1.5 rounded bg-white/85 px-1.5 text-[0.7rem]">
        {note ?? c.illustrativePhoto}
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
  const t = useMessages(M)
  if (photos?.length)
    return (
      <ModelImage
        src={photoUrl(photos[0])}
        alt={t.machinePhoto}
        note={t.partnerPhoto}
        className={className}
      />
    )
  return (
    <ModelImage src={model.image} alt={`${model.brand} ${model.model}`} className={className} />
  )
}

export function SpecChips({ model, max = 4 }: { model: PublicModel; max?: number }) {
  const ct = useCatalogText()
  const { num } = useFormat()
  return (
    <div className="my-2 flex flex-wrap gap-1.5">
      {model.specList.slice(0, max).map((s) => (
        <span
          key={s.key}
          className="bg-muted text-muted-foreground rounded-md border px-2 py-0.5 text-[0.8rem]"
        >
          {ct.spec(s.label)}:{" "}
          <b className="text-foreground">
            {typeof s.value === "number" ? num(s.value) : s.value}
            {s.unit && ` ${s.unit}`}
          </b>
        </span>
      ))}
    </div>
  )
}
