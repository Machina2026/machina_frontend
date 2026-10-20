import { AdminCompanies } from "@/features/admin/companies"
import { toQuery } from "@/lib/search-params"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("companies")

export default async function Page({ searchParams }: PageProps<"/admin/companies">) {
  return <AdminCompanies query={toQuery(await searchParams)} />
}
