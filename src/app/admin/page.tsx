import { AdminOverview } from "@/features/admin/overview"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("admin")

export default function Page() {
  return <AdminOverview />
}
