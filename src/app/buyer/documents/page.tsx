import { BuyerDocuments } from "@/features/buyer/lists"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("customerDocuments")

export default function Page() {
  return <BuyerDocuments />
}
