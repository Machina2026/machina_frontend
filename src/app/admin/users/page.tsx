import { AdminUsers } from "@/features/admin/users"
import { toQuery } from "@/lib/search-params"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("users")

export default async function Page({ searchParams }: PageProps<"/admin/users">) {
  return <AdminUsers query={toQuery(await searchParams)} />
}
