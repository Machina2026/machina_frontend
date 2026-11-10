import { AdminRentals } from "@/features/admin/rentals"
import { pageMetadata } from "@/i18n/server"
import { toQuery } from "@/lib/search-params"

export const generateMetadata = pageMetadata("rentals")

export default async function Page({ searchParams }: PageProps<"/admin/rentals">) {
  return <AdminRentals query={toQuery(await searchParams)} />
}
