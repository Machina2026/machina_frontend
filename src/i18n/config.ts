// Languages of the web app. Kept free of server-only imports so proxy.ts and
// client components can use it.

export const LOCALES = ["it", "en"] as const
export type Locale = (typeof LOCALES)[number]

/** For visitors whose browser asks for neither language: the market is Italian. */
export const DEFAULT_LOCALE: Locale = "it"

/** The visitor's chosen language. Not httpOnly: the language switcher sets it. */
export const LOCALE_COOKIE = "machina_locale"
export const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 3600

export const LOCALE_NAMES: Record<Locale, string> = { it: "Italiano", en: "English" }

/** Intl locale for numbers, money and dates. */
export const INTL_LOCALE: Record<Locale, string> = { it: "it-IT", en: "en-GB" }

export const isLocale = (v: unknown): v is Locale => (LOCALES as readonly unknown[]).includes(v)

/** The cookie's language, else the first supported one in Accept-Language, else Italian. */
export function pickLocale(cookie: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookie)) return cookie
  const wanted = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";")
      const q = params.find((p) => p.trim().startsWith("q="))
      return { lang: tag.trim().slice(0, 2).toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 }
    })
    .filter((x) => x.lang && x.q > 0)
    .sort((a, b) => b.q - a.q)
  return wanted.map((x) => x.lang).find(isLocale) ?? DEFAULT_LOCALE
}
