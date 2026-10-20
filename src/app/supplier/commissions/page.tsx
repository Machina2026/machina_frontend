import { SupplierCommissions } from "@/features/supplier/lists"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("commissions")

export default function Page() {
  return <SupplierCommissions />
}
