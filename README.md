# Machina Frontend

Web app for **Machina Rent**, a B2B marketplace for construction equipment rental in Turin and Piedmont. Customers compare offers from several rental companies, send one request, and manage quotes, orders, extensions, charges and documents. Rental companies manage their catalogue, price quotes and follow orders.

Accounts (sign-in, registration, teams, admin) are served by the Machina API in `../machina_backend`. The rest of the marketplace still runs on a built-in mock API (see below) until the API implements it.

## Getting started

Requires Node.js 24+.

```bash
npm install
npm run dev        # http://localhost:3000
```

To sign in with real accounts, set `MACHINA_API_URL` first: see [Machina API](#machina-api-machina_backend).

## Scripts

| Command                           | What it does                                                                |
| --------------------------------- | --------------------------------------------------------------------------- |
| `npm run dev`                     | Start the dev server                                                        |
| `npm run build` / `npm run start` | Production build / serve it                                                 |
| `npm run lint`                    | ESLint                                                                      |
| `npm run typecheck`               | Generate route types and run `tsc`                                          |
| `npm test`                        | Unit tests (Vitest): pricing, quote/order rules, data separation, assistant |
| `npm run format`                  | Prettier                                                                    |

## What's in it

- **Public:** home, catalogue with filters, model pages, accessories, side-by-side comparison, request draft (several machines, several partners, live estimate), "Describe your job" assistant, sign-in/registration, become a partner.
- **Customer area (`/buyer`):** overview, requests and quotes (accept/reject/cancel), orders (changes, charges, payment, invoices, draft invoice), changes to approve, documents, company and sites.
- **Rental company area (`/supplier`):** overview, equipment catalogue and editor (photos, accessories), CSV import, price list, quote editor (price lines, versions, expiry, decline), orders, changes, documents, commissions and plan, profile.

## Project structure

```
src/
  app/
    (public)/           public pages
    buyer/, supplier/   role areas (layout checks the session)
    api/[...path]/      mock backend: dispatches every /api/* call
  features/             screens: public/, buyer/, supplier/, orders/ (shared order page)
  components/
    ui/                 base components (button, badge, modal, field, …)
    app/                domain components (status badges, quote lines, timeline, …)
    layout/             header, footer, dashboard shell
  lib/
    machina/            API client, types, labels, formatting, request draft
    auth/               roles, cookie names, server session helpers
  server/mock/          in-memory store, seed data, pricing, business rules, routes, assistant
  proxy.ts              redirects to /login or the user's own area
```

## Machina API (machina_backend)

Accounts are served by the real API in `../machina_backend` (NestJS + PostgreSQL) when `MACHINA_API_URL` is set in `.env.local` (see `.env.example`):

```bash
# in machina_backend: start the API on http://localhost:4000
npm run start:dev
# here
echo MACHINA_API_URL=http://localhost:4000 > .env.local
npm run dev
```

- `next.config.ts` proxies `/api/auth`, `/api/account`, `/api/team`, `/api/admin` and `/api/health` to the API. The browser only talks to this app, so the API's session cookie stays first-party.
- Everything else (catalogue, requests, quotes, orders, ...) is still the mock below. It takes the signed-in user from the API (`src/server/mock/bridge.ts`); companies and users registered through the API are added to the mock on first use.
- Partners who register wait for an admin's approval before they can sign in. Admins have no area in the web app yet.
- Without `MACHINA_API_URL`, the mock serves everything, sign-in included.

## Mock backend

- Data lives **in server memory**: it survives page reloads but resets when the server restarts.
- Sessions use an httpOnly `machina_session` cookie; `machina_role` lets `proxy.ts` redirect early. The API checks roles and data ownership on every call.
- The assistant uses the rule-based engine (English keywords). The original's optional Claude engine isn't ported.
- As the API gains each module, add its path to `API_ROUTES` in `next.config.ts` and delete the matching mock routes. When nothing is left, delete `src/app/api/[...path]` and `src/server/mock`.

## Conventions

- Next.js 16 differs from older versions: read `node_modules/next/dist/docs/` before using an API (see `AGENTS.md`).
- Money is in euros, VAT excluded unless the field says gross. Prices, availability and specs shown to customers always come from the data, never from the assistant.
