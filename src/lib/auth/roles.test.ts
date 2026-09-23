import { describe, expect, it } from "vitest"

import { areaForPath, canAccessArea, homePathForRole, isRole, safeNextPath } from "./roles"

describe("roles", () => {
  it("maps each role to its area", () => {
    expect(homePathForRole("client")).toBe("/buyer")
    expect(homePathForRole("partner")).toBe("/supplier")
  })

  it("blocks access to the other area", () => {
    expect(canAccessArea("client", "buyer")).toBe(true)
    expect(canAccessArea("client", "supplier")).toBe(false)
    expect(canAccessArea("partner", "buyer")).toBe(false)
  })

  it("finds the area from a pathname", () => {
    expect(areaForPath("/buyer/requests/1")).toBe("buyer")
    expect(areaForPath("/supplier")).toBe("supplier")
    expect(areaForPath("/buyers")).toBeNull()
    expect(areaForPath("/")).toBeNull()
  })

  it("only accepts known roles from the cookie", () => {
    expect(isRole("client")).toBe(true)
    expect(isRole("admin")).toBe(false)
    expect(isRole(undefined)).toBe(false)
  })
})

describe("safeNextPath", () => {
  it("allows same-site paths", () => {
    expect(safeNextPath("/buyer/requests?x=1")).toBe("/buyer/requests?x=1")
  })

  it("rejects external or protocol-relative redirects", () => {
    expect(safeNextPath("https://evil.example")).toBeNull()
    expect(safeNextPath("//evil.example")).toBeNull()
    expect(safeNextPath("/\\evil.example")).toBeNull()
    expect(safeNextPath("")).toBeNull()
    expect(safeNextPath(null)).toBeNull()
  })
})
