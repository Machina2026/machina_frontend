import { LoginView } from "@/features/public/auth"

import { toQuery } from "@/lib/search-params"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("signIn")

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  return <LoginView next={toQuery(await searchParams).next} />
}
