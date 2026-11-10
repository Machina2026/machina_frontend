import { ContractPage } from "@/features/orders/contract"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("rentalContract")

export default async function Page({ params }: PageProps<"/supplier/orders/[id]/contract">) {
  const { id } = await params
  return <ContractPage orderId={id} role="partner" />
}
