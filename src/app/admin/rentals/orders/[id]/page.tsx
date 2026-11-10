import { OrderDetail } from "@/features/orders/order-detail"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("orders")

export default async function Page({ params }: PageProps<"/admin/rentals/orders/[id]">) {
  const { id } = await params
  return <OrderDetail id={id} role="admin" />
}
