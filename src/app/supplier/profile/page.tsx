import { SupplierProfile } from "@/features/supplier/profile"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("companyProfile")

export default function Page() {
  return <SupplierProfile />
}
