import { AdminAudit } from "@/features/admin/audit"
import { toQuery } from "@/lib/search-params"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("activityLog")

export default async function Page({ searchParams }: PageProps<"/admin/audit">) {
  return <AdminAudit query={toQuery(await searchParams)} />
}
