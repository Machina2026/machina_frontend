import type { Metadata } from "next"

import { RegisterView } from "@/features/public/auth"

import { toQuery } from "@/lib/search-params"

export const metadata: Metadata = { title: "Register" }

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const role = toQuery(await searchParams).role === "partner" ? "partner" : "client"
  return <RegisterView key={role} role={role} />
}
