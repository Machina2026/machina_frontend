import { SupplierOverview } from "@/features/supplier/lists"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("partnerArea")

export default function Page() {
  return <SupplierOverview />
}
