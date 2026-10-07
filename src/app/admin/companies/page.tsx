import type { Metadata } from "next"

import { AdminCompanies } from "@/features/admin/companies"
import { toQuery } from "@/lib/search-params"

export const metadata: Metadata = { title: "Companies" }

export default async function Page({ searchParams }: PageProps<"/admin/companies">) {
  return <AdminCompanies query={toQuery(await searchParams)} />
}
