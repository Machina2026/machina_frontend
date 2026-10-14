import { Container } from "@/components/layout/container"

/** Content pages: the site's width, with room above the footer. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <Container className="pt-10 pb-24">{children}</Container>
}
