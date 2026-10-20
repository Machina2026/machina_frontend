import { BuyerChanges } from "@/features/buyer/lists"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("changesToApprove")

export default function Page() {
  return <BuyerChanges />
}
