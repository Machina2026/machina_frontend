import { BuyerOrders } from "@/features/buyer/lists"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("orders")

export default function Page() {
  return <BuyerOrders />
}
