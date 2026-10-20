import { SupplierQuotes } from "@/features/supplier/lists"
import { toQuery } from "@/lib/search-params"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("requestsAndQuotes")

export default async function Page({ searchParams }: PageProps<"/supplier/quotes">) {
  return <SupplierQuotes tab={toQuery(await searchParams).tab} />
}
