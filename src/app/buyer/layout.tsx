import { DashShell } from "@/components/layout/dash-shell"
import { requireArea } from "@/lib/auth/require-area"

export default async function BuyerLayout({ children }: LayoutProps<"/buyer">) {
  await requireArea("buyer")
  return <DashShell area="buyer">{children}</DashShell>
}
