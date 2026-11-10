import { describe, expect, it } from "vitest"

import { emptyState, needsFor, parse, runAssistant } from "./assistant"
import { seed } from "./seed"
import { Store } from "./store"

// 2030-06-05 is a Wednesday.
const REF = "2030-06-05"

describe("assistant parser", () => {
  it("reads place, period, job and height from a sentence", () => {
    const s = parse(
      "Gutter maintenance on a warehouse in Turin, height 12 m, outdoors, for 3 days from next week",
      emptyState(),
      REF
    )
    expect(s).toMatchObject({
      location: "Turin",
      province: "TO",
      from: "2030-06-10",
      to: "2030-06-12",
      heightM: 12,
      indoor: false,
    })
    expect(s.jobs).toContain("height")
  })

  it("reads digging depth, passage width and weekday starts", () => {
    const s = parse(
      "Dig a trench in Chieri, depth 1.5 m, narrowest passage 1,2 m, from Monday for 2 weeks",
      emptyState(),
      REF
    )
    expect(s).toMatchObject({
      province: "TO",
      depthM: 1.5,
      accessWidthM: 1.2,
      from: "2030-06-10",
      to: "2030-06-23",
    })
  })

  it("reads dates like 12/10 and transport/operator answers", () => {
    const s = parse(
      "From 12/10 to 14/10. No, I'll collect from the depot. No, dry hire (without operator)",
      emptyState(),
      REF
    )
    expect(s).toMatchObject({
      from: "2030-10-12",
      to: "2030-10-14",
      transport: false,
      operator: false,
    })
  })

  it("maps demolition to an excavator with a breaker and an optional dumper", () => {
    const s = parse("I need to break up concrete paving", emptyState(), REF)
    expect(needsFor(s)).toEqual([
      {
        category: "excavators",
        why: expect.any(String),
        accessoryGroup: "Demolition",
        optional: false,
      },
      { category: "dumpers", why: expect.any(String), accessoryGroup: null, optional: true },
    ])
  })
})

describe("runAssistant", () => {
  it("only suggests catalogue models that fit the constraints, with real offers", () => {
    const store = new Store()
    seed(store)
    const r = runAssistant(
      store,
      "Dig foundations in Turin, 1.5 m deep, passage 1.2 m, from tomorrow for 5 days",
      null
    )
    const excavator = r.suggestions.find((s) => s.category === "excavators")
    // Only the ~1 m wide mini excavator fits through a 1.2 m passage.
    expect(excavator?.modelId).toBe("m-kx019")
    expect(excavator?.offers.map((o) => o.offerId).sort()).toEqual(["o1", "o2"])
    expect(r.mode).toBe("demo")
  })
})

describe("assistant in Italian", () => {
  it("reads place, period, job and sizes from an Italian sentence", () => {
    const s = parse(
      "Devo scavare una trincea per la fognatura a Moncalieri da lunedì per 2 settimane, profonda 1,5 m, il cancello è largo 1,2 m",
      emptyState(),
      REF,
      "it"
    )
    expect(s).toMatchObject({
      location: "Moncalieri",
      province: "TO",
      from: "2030-06-10",
      to: "2030-06-23",
      depthM: 1.5,
      accessWidthM: 1.2,
    })
    expect(s.jobs).toEqual(["dig"])
  })

  it("reads Italian dates, height, delivery and operator answers", () => {
    const s = parse(
      "Pulizia delle grondaie di un capannone a Torino dal 3 al 7 luglio, altezza 12 m, all'aperto. Sì, consegna e ritiro. No, nolo a freddo (senza operatore)",
      emptyState(),
      REF,
      "it"
    )
    expect(s).toMatchObject({
      location: "Torino",
      from: "2030-07-03",
      to: "2030-07-07",
      heightM: 12,
      indoor: false,
      transport: true,
      operator: false,
    })
    expect(s.jobs).toContain("height")
  })

  it("does not take Grugliasco for a crane job", () => {
    const s = parse("Lavori a Grugliasco", emptyState(), REF, "it")
    expect(s).toMatchObject({ location: "Grugliasco", jobs: [] })
  })

  it("answers in Italian with the steps it took and real offers", () => {
    const store = new Store()
    seed(store)
    const r = runAssistant(
      store,
      "Scavo per fondazioni a Torino, profondità 1,5 m, passaggio 1,2 m, da domani per 5 giorni",
      null,
      "it",
      REF
    )
    expect(r.steps.map((s) => s.kind)).toEqual(["read", "search", "offers", "dates", "check"])
    expect(r.suggestions.find((s) => s.category === "excavators")?.modelId).toBe("m-kx019")
    expect(r.reply).toMatch(/La scelta migliore è Kubota KX019-4/)
    expect(r.summary[0]).toEqual({ label: "Luogo", value: "Torino (TO)" })
    expect(r.questions.every((q) => /[àèéìòù]|\?/.test(q.text))).toBe(true)
  })
})

describe("assistant answers in a few words", () => {
  it.each([
    ["Terreno piano, con consegna e operatore", "it", { transport: true, operator: true }],
    ["Delivery and an operator please", "en", { transport: true, operator: true }],
    ["No, nolo a freddo (senza operatore)", "it", { operator: false }],
  ] as const)("%s", (text, locale, expected) => {
    expect(parse(text, emptyState(), REF, locale)).toMatchObject(expected)
  })
})
