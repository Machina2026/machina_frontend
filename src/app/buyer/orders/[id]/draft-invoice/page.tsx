import { InvoiceDraftView } from "@/features/orders/invoice-draft"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("draftInvoice")

export default async function Page({ params }: PageProps<"/buyer/orders/[id]/draft-invoice">) {
  const { id } = await params
  return <InvoiceDraftView orderId={id} backHref={`/buyer/orders/${id}`} />
}
