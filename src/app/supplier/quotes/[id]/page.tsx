import { SupplierQuoteDetail } from "@/features/supplier/quote-editor"

export default async function Page({ params }: PageProps<"/supplier/quotes/[id]">) {
  const { id } = await params
  return <SupplierQuoteDetail id={id} />
}
