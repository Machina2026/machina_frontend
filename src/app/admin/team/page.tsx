import { AdminTeam } from "@/features/admin/team"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("admins")

export default function Page() {
  return <AdminTeam />
}
