"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

import { PageHead, Small, TableWrap } from "@/components/app/bits"
import { QueryView } from "@/components/app/query-view"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/machina/api"
import { eur } from "@/lib/machina/format"
import type { AccessoryListing } from "@/lib/machina/types"

export function AccessoriesView() {
  const q = useQuery({
    queryKey: ["accessories"],
    queryFn: () => api.get<{ accessories: AccessoryListing[] }>("/api/accessories"),
  })
  return (
    <>
      <PageHead title="Compatible accessories">
        Accessories are rented together with a compatible machine. Demo prices, excluding VAT.
      </PageHead>
      <QueryView query={q}>
        {({ accessories }) => {
          const groups = new Map<string, AccessoryListing[]>()
          for (const a of accessories) groups.set(a.group, [...(groups.get(a.group) ?? []), a])
          return [...groups].map(([group, items]) => (
            <section key={group} className="mb-6">
              <h2>{group}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((a) => (
                  <Card key={a.id} flat>
                    <h3>{a.name}</h3>
                    <Small className="mb-2">{a.description}</Small>
                    <div className="text-sm">
                      <b>Compatible with:</b>{" "}
                      {a.compatibleModels.map((m, i) => (
                        <span key={m.id}>
                          {i > 0 && ", "}
                          <Link href={`/models/${m.id}`}>{m.label}</Link>
                        </span>
                      ))}
                    </div>
                    {a.availability.length ? (
                      <TableWrap className="mt-2.5">
                        <thead>
                          <tr>
                            <th>Partner</th>
                            <th>With machine</th>
                            <th className="num">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {a.availability.map((x) => (
                            <tr key={x.offerId}>
                              <td>{x.partner}</td>
                              <td>
                                <Link href={`/models/${x.modelId}`}>{x.model}</Link>
                              </td>
                              <td className="num">
                                {x.included ? "Included" : `${eur(x.day)}/day`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </TableWrap>
                    ) : (
                      <Small className="mt-2">No partner lists it at the moment.</Small>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          ))
        }}
      </QueryView>
    </>
  )
}
