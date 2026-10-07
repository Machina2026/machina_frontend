import type { NextConfig } from "next"

/** Machina API (machina_backend). Unset: the built-in mock API serves everything. */
const apiUrl = process.env.MACHINA_API_URL?.replace(/\/+$/, "")

/**
 * Routes the real API implements. The rest stay on the mock (src/app/api/[...path]).
 * Partner routes are listed one by one: quotes, orders and documents are still mocked.
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
  "partner/offers",
  "partner/prices",
]

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiUrl) return []
    return {
      // beforeFiles: checked before src/app/api/[...path], which would otherwise answer.
      beforeFiles: API_ROUTES.map((name) => ({
        source: `/api/${name}/:path*`,
        destination: `${apiUrl}/api/${name}/:path*`,
      })),
      afterFiles: [],
      fallback: [],
    }
  },
}

export default nextConfig
