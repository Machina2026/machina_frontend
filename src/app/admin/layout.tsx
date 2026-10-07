import { DashShell } from "@/components/layout/dash-shell"
import { requireArea } from "@/lib/auth/require-area"

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireArea("admin")
  return <DashShell area="admin">{children}</DashShell>
}
