import { SupplierDocuments } from "@/features/supplier/lists"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("partnerDocuments")

export default function Page() {
  return <SupplierDocuments />
}
