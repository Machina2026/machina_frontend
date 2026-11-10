import { AdminRequest } from "@/features/admin/rentals"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("rentals")

export default async function Page({ params }: PageProps<"/admin/rentals/requests/[id]">) {
  const { id } = await params
  return <AdminRequest id={id} />
}
