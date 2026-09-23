import type { Metadata } from "next"

import { SupplierQuotes } from "@/features/supplier/lists"
import { toQuery } from "@/lib/search-params"

export const metadata: Metadata = { title: "Requests and quotes" }

export default async function Page({ searchParams }: PageProps<"/supplier/quotes">) {
  return <SupplierQuotes tab={toQuery(await searchParams).tab} />
}
