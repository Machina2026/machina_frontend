"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

/** Closing call-to-action above the footer links; hidden inside the role areas. */
export function FooterCta() {
  const pathname = usePathname()
  if (pathname.startsWith("/buyer") || pathname.startsWith("/supplier")) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-6 border-b border-white/10 py-10">
      <div>
        <p className="font-heading m-0 text-[1.6rem] leading-tight font-medium text-white sm:text-[1.9rem]">
          Ready to get your site moving?
        </p>
        <p className="text-ink-foreground/65 m-0 mt-1.5">
          Compare offers from several rental companies in minutes.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/catalog"
          className="from-primary inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-b to-[#a84b12] px-5 font-medium text-white no-underline shadow-[0_10px_24px_-10px_rgb(236_116_48/0.8)] hover:text-white hover:no-underline"
        >
          Browse the catalogue <ArrowRight aria-hidden className="size-4" />
        </Link>
        <Link
          href="/assistant"
          className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 font-medium text-white no-underline hover:border-white/40 hover:bg-white/5 hover:text-white hover:no-underline"
        >
          Describe your job
        </Link>
      </div>
    </div>
  )
}
