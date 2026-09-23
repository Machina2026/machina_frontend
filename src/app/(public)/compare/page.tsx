import type { Metadata } from "next"

import { CompareView } from "@/features/public/compare"

import { toQuery } from "@/lib/search-params"

export const metadata: Metadata = { title: "Compare offers" }

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const query = toQuery(await searchParams)
  return <CompareView key={JSON.stringify(query)} query={query} />
}
