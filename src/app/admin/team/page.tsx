import type { Metadata } from "next"

import { AdminTeam } from "@/features/admin/team"

export const metadata: Metadata = { title: "Admins" }

export default function Page() {
  return <AdminTeam />
}
