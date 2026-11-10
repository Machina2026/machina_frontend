import type { NextConfig } from "next"

/** Machina API (machina_backend). Unset: the built-in mock API serves everything. */
const apiUrl = process.env.MACHINA_API_URL?.replace(/\/+$/, "")

/**
 * Routes the real API implements. The rest stay on the mock (src/app/api/[...path]):
 * the offer comparison, the assistant, and the partner's profile, plan and attachments.
 */
const API_ROUTES = [
  "auth",
  "account",
  "team",
  "admin",
  "health",
  "meta",
  "catalog",
  "models",
  "accessories",
  "photos",
  "estimate",
  "client",
  "orders",
  "partner/offers",
  "partner/prices",
  "partner/summary",
  "partner/quotes",
  "partner/orders",
  "partner/documents",
  "partner/commissions",
]

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiUrl) return []
    return {
      // beforeFiles: checked before src/app/api/[...path], which would otherwise answer.
      beforeFiles: [
        ...API_ROUTES.map((name) => ({
          source: `/api/${name}/:path*`,
          destination: `${apiUrl}/api/${name}/:path*`,
        })),
        // Order files ("of-…") are the API's; other files (partner attachments) are the mock's.
        {
          source: "/api/files/:id(of-[a-zA-Z0-9_-]+)",
          destination: `${apiUrl}/api/files/:id`,
        },
      ],
      afterFiles: [],
      fallback: [],
    }
  },
}

export default nextConfig
