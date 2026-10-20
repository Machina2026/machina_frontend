import "server-only"

import type { Metadata } from "next"
import { cookies, headers } from "next/headers"

import { LOCALE_COOKIE, pickLocale, type Locale } from "./config"
import { formatFor } from "./format"
import type { Messages } from "./messages"
import { PAGE_TITLES, type PageTitle } from "./titles"

/** The request's language: the visitor's choice, else their browser's. */
export async function getLocale(): Promise<Locale> {
  const [c, h] = await Promise.all([cookies(), headers()])
  return pickLocale(c.get(LOCALE_COOKIE)?.value, h.get("accept-language"))
}

export async function getMessages<T>(messages: Messages<T>): Promise<T> {
  return messages[await getLocale()]
}

export async function getFormat() {
  return formatFor(await getLocale())
}

/** `export const generateMetadata = pageMetadata("catalog")` gives the page its title. */
export function pageMetadata(key: PageTitle, extra: Metadata = {}) {
  return async (): Promise<Metadata> => ({
    ...extra,
    title: PAGE_TITLES[await getLocale()][key],
  })
}
