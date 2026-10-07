import type { Metadata } from "next"

import { InviteView } from "@/features/public/invite"

export const metadata: Metadata = { title: "Invitation", robots: { index: false } }

export default async function Page({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params
  return <InviteView token={token} />
}
