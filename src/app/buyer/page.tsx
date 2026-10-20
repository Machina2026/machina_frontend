import { BuyerOverview } from "@/features/buyer/lists"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("customerArea")

export default function Page() {
  return <BuyerOverview />
}
