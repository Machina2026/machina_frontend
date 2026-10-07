import type { Metadata } from "next"

import { AdminCompany } from "@/features/admin/companies"

export const metadata: Metadata = { title: "Company" }

export default async function Page({ params }: PageProps<"/admin/companies/[id]">) {
  const { id } = await params
  return <AdminCompany id={id} />
}
