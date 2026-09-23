import type { Metadata } from "next"

import { InvoiceDraftView } from "@/features/orders/invoice-draft"

export const metadata: Metadata = { title: "Draft invoice" }

export default async function Page({ params }: PageProps<"/buyer/orders/[id]/draft-invoice">) {
  const { id } = await params
  return <InvoiceDraftView orderId={id} backHref={`/buyer/orders/${id}`} />
}
