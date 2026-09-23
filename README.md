# Machina Frontend

Web app for **Machina Rent**, a B2B marketplace for construction equipment rental in Turin and Piedmont. Customers compare offers from several rental companies, send one request, and manage quotes, orders, extensions, charges and documents. Rental companies manage their catalogue, price quotes and follow orders.

This is an English port of the Italian demo in `E:\work\Archive` (Python backend + vanilla JS). It runs on **mock data**: the demo backend's rules are ported to TypeScript and served by Next.js route handlers, so no separate server is needed.

## Getting started

Requires Node.js 24+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Sign in at `/login` with a demo account (password `demo1234`) or the "Enter" buttons:

| Role           | Company (fictitious)        | Email                    |
| -------------- | --------------------------- | ------------------------ |
| Customer       | Edilizia Monviso S.r.l.     | client@demo.machina.it   |
| Customer       | Costruzioni Val Susa S.r.l. | client2@demo.machina.it  |
| Rental company | Noleggi Dora S.r.l.         | dora@demo.machina.it     |
| Rental company | Sangone Macchine S.p.A.     | sangone@demo.machina.it  |
| Rental company | Canavese Rent S.r.l.        | canavese@demo.machina.it |

Tip: use a normal and a private window to see the customer and the rental company side by side. `/demo` restores the demo data.

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

- **Public:** home, catalogue with filters, model pages, accessories, side-by-side comparison, request draft (several machines, several partners, live estimate), "Describe your job" assistant, sign-in/registration, become a partner, demo tools.
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

## Mock backend

- Data lives **in server memory**: it survives page reloads but resets when the server restarts (or via `/demo`).
- Sessions use an httpOnly `machina_session` cookie; `machina_role` lets `proxy.ts` redirect early. The API checks roles and data ownership on every call.
- The assistant uses the rule-based **demo engine** (English keywords). The original's optional Claude engine isn't ported.
- To use a real backend later: keep the `/api/*` contract (see `src/lib/machina/types.ts`), delete `src/app/api/[...path]` and `src/server/mock`, and point the client at the new API.

## Conventions

- Next.js 16 differs from older versions: read `node_modules/next/dist/docs/` before using an API (see `AGENTS.md`).
- Money is in euros, VAT excluded unless the field says gross. Prices, availability and specs shown to customers always come from the data, never from the assistant.
