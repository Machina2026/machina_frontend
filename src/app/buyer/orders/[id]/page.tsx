import { OrderDetail } from "@/features/orders/order-detail"

export default async function Page({ params }: PageProps<"/buyer/orders/[id]">) {
  const { id } = await params
  return <OrderDetail id={id} role="client" />
}
