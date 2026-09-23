import type { Metadata } from "next"

import { LoginView } from "@/features/public/auth"

import { toQuery } from "@/lib/search-params"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  return <LoginView next={toQuery(await searchParams).next} />
}
