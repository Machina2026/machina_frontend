"use client"

import { useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useState, useTransition } from "react"

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "./config"
import { formatFor } from "./format"
import type { Messages } from "./messages"

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; pending: boolean }

const LocaleContext = createContext<Ctx | null>(null)

/** Holds the language for client components; the root layout passes the request's language. */
export function I18nProvider({
  locale: initial,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const router = useRouter()
  const [locale, setState] = useState(initial)
  const [pending, startTransition] = useTransition()

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`
      document.documentElement.lang = next
      setState(next)
      // Server-rendered parts (page titles, <html lang>) follow on the refresh.
      startTransition(() => router.refresh())
    },
    [router]
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, pending }}>
      {children}
    </LocaleContext.Provider>
  )
}

function useCtx() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error("I18nProvider is missing")
  return ctx
}

export function useLocale() {
  return useCtx().locale
}

/** Switch language: `const { locale, setLocale } = useLocaleSwitch()`. */
export function useLocaleSwitch() {
  return useCtx()
}

/** The texts of `messages` in the current language. */
export function useMessages<T>(messages: Messages<T>): T {
  return messages[useCtx().locale]
}

/** Money, number and date formatters for the current language. */
export function useFormat() {
  return formatFor(useCtx().locale)
}
