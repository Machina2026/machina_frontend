import { SupplierChanges } from "@/features/supplier/lists"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("rentalChanges")

export default function Page() {
  return <SupplierChanges />
}
