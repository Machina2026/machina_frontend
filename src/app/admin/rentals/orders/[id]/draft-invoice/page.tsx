import { InvoiceDraftView } from "@/features/orders/invoice-draft"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("draftInvoice")

export default async function Page({
  params,
}: PageProps<"/admin/rentals/orders/[id]/draft-invoice">) {
  const { id } = await params
  return <InvoiceDraftView orderId={id} backHref={`/admin/rentals/orders/${id}`} />
}
