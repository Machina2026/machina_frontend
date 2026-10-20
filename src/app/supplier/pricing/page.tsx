import { SupplierPricing } from "@/features/supplier/equipment"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("pricing")

export default function Page() {
  return <SupplierPricing />
}
