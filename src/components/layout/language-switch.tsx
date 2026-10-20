"use client"

import { useLocaleSwitch, useMessages } from "@/i18n/client"
import { LOCALE_NAMES, LOCALES } from "@/i18n/config"
import { cn } from "@/lib/utils"

import { NAV } from "./nav-text"

/** IT | EN toggle. The choice is remembered in a cookie. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, setLocale, pending } = useLocaleSwitch()
  const t = useMessages(NAV)
  return (
    <div
      role="group"
      aria-label={t.language}
      className={cn(
        "border-border-strong inline-flex rounded-lg border p-0.5",
        pending && "opacity-70",
        className
      )}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          title={LOCALE_NAMES[l]}
          onClick={() => locale !== l && setLocale(l)}
          className={cn(
            "min-w-9 cursor-pointer rounded-md px-2 py-1 text-[0.8rem] font-semibold uppercase transition-colors",
            locale === l
              ? "bg-ink text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
