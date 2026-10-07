import type { Metadata } from "next"

import { AdminAudit } from "@/features/admin/audit"
import { toQuery } from "@/lib/search-params"

export const metadata: Metadata = { title: "Activity log" }

export default async function Page({ searchParams }: PageProps<"/admin/audit">) {
  return <AdminAudit query={toQuery(await searchParams)} />
}
