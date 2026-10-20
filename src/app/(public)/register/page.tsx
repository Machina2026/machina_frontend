import { RegisterView } from "@/features/public/auth"

import { toQuery } from "@/lib/search-params"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("register")

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const role = toQuery(await searchParams).role === "partner" ? "partner" : "client"
  return <RegisterView key={role} role={role} />
}
