import { BuyerQuoteDetail } from "@/features/buyer/request-quote"

export default async function Page({ params }: PageProps<"/buyer/quotes/[id]">) {
  const { id } = await params
  return <BuyerQuoteDetail id={id} />
}
