import { BuyerRequestDetail } from "@/features/buyer/request-quote"

export default async function Page({ params }: PageProps<"/buyer/requests/[id]">) {
  const { id } = await params
  return <BuyerRequestDetail id={id} />
}
