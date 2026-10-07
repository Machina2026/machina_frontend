import type { Metadata } from "next"

import { AdminUsers } from "@/features/admin/users"
import { toQuery } from "@/lib/search-params"

export const metadata: Metadata = { title: "Users" }

export default async function Page({ searchParams }: PageProps<"/admin/users">) {
  return <AdminUsers query={toQuery(await searchParams)} />
}
