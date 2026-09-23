import type { Metadata } from "next"

import { CatalogView } from "@/features/public/catalog"

import { toQuery } from "@/lib/search-params"

export const metadata: Metadata = { title: "Catalogue" }

export default async function CatalogPage({ searchParams }: PageProps<"/catalog">) {
  const query = toQuery(await searchParams)
  // Keyed on the query so the filter form resets when the URL changes.
  return <CatalogView key={JSON.stringify(query)} query={query} />
}
