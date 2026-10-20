import { CompareView } from "@/features/public/compare"

import { toQuery } from "@/lib/search-params"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("compare")

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const query = toQuery(await searchParams)
  return <CompareView key={JSON.stringify(query)} query={query} />
}
