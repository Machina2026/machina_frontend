import { InviteView } from "@/features/public/invite"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("invitation", { robots: { index: false } })

export default async function Page({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params
  return <InviteView token={token} />
}
