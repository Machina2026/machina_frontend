import { AdminCompany } from "@/features/admin/companies"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("company")

export default async function Page({ params }: PageProps<"/admin/companies/[id]">) {
  const { id } = await params
  return <AdminCompany id={id} />
}
