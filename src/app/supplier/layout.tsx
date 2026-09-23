import { DashShell } from "@/components/layout/dash-shell"
import { requireArea } from "@/lib/auth/require-area"

export default async function SupplierLayout({ children }: LayoutProps<"/supplier">) {
  await requireArea("supplier")
  return <DashShell area="supplier">{children}</DashShell>
}
