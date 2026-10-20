import { CatalogView } from "@/features/public/catalog"

import { toQuery } from "@/lib/search-params"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("catalog")

export default async function CatalogPage({ searchParams }: PageProps<"/catalog">) {
  const query = toQuery(await searchParams)
  // Keyed on the query so the filter form resets when the URL changes.
  return <CatalogView key={JSON.stringify(query)} query={query} />
}
