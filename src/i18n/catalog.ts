import { catalogText, type CatalogText } from "./catalog-text"
import { useLocale } from "./client"
import type { Locale } from "./config"

export type { CatalogText }

const BY_LOCALE: Record<Locale, CatalogText> = { it: catalogText("it"), en: catalogText("en") }

/** Category, machine type, spec and province names in the current language. */
export function useCatalogText(): CatalogText {
  return BY_LOCALE[useLocale()]
}
