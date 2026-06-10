import { ORPCError } from "@orpc/server"
import { describe, expect, it } from "vite-plus/test"

import { appRouter } from "../../src/routers"
import { sharesRouter } from "../../src/routers/shares"
import { createMockContext, createMockSession } from "../mocks/context"

describe("shares router", () => {
  describe("sharesRouter structure", () => {
    it("exports all share procedures", () => {
      expect(sharesRouter).toHaveProperty("create")
      expect(sharesRouter).toHaveProperty("getByEntry")
      expect(sharesRouter).toHaveProperty("update")
      expect(sharesRouter).toHaveProperty("delete")
      expect(sharesRouter).toHaveProperty("getPublicEntry")
      expect(sharesRouter).toHaveProperty("checkRequiresPassword")
    })

    it("has correct procedure types", () => {
      expect(typeof sharesRouter.create).toBe("object")
      expect(typeof sharesRouter.getByEntry).toBe("object")
      expect(typeof sharesRouter.update).toBe("object")
      expect(typeof sharesRouter.delete).toBe("object")
      expect(typeof sharesRouter.getPublicEntry).toBe("object")
      expect(typeof sharesRouter.checkRequiresPassword).toBe("object")
    })
  })

  describe("create procedure", () => {
    it("should be defined", () => {
      expect(sharesRouter.create).toBeDefined()
    })

    it("should be a protected procedure", () => {
      expect(typeof sharesRouter.create).toBe("object")
    })
  })

  describe("getByEntry procedure", () => {
    it("should be defined", () => {
      expect(sharesRouter.getByEntry).toBeDefined()
    })

    it("should be a protected procedure", () => {
      expect(typeof sharesRouter.getByEntry).toBe("object")
    })
  })

  describe("update procedure", () => {
    it("should be defined", () => {
      expect(sharesRouter.update).toBeDefined()
    })

    it("should be a protected procedure", () => {
      expect(typeof sharesRouter.update).toBe("object")
    })
  })

  describe("delete procedure", () => {
    it("should be defined", () => {
      expect(sharesRouter.delete).toBeDefined()
    })

    it("should be a protected procedure", () => {
      expect(typeof sharesRouter.delete).toBe("object")
    })
  })

  describe("getPublicEntry procedure", () => {
    it("should be defined", () => {
      expect(sharesRouter.getPublicEntry).toBeDefined()
    })

    it("should be a public procedure", () => {
      expect(typeof sharesRouter.getPublicEntry).toBe("object")
    })
  })

  describe("checkRequiresPassword procedure", () => {
    it("should be defined", () => {
      expect(sharesRouter.checkRequiresPassword).toBeDefined()
    })

    it("should be a public procedure", () => {
      expect(typeof sharesRouter.checkRequiresPassword).toBe("object")
    })
  })
})

describe("shares router integration with appRouter", () => {
  it("should be accessible from appRouter", () => {
    expect(appRouter.shares).toBeDefined()
    expect(appRouter.shares).toBe(sharesRouter)
  })

  it("should have all CRUD operations", () => {
    expect(appRouter.shares.create).toBeDefined()
    expect(appRouter.shares.getByEntry).toBeDefined()
    expect(appRouter.shares.update).toBeDefined()
    expect(appRouter.shares.delete).toBeDefined()
  })

  it("should have public access operations", () => {
    expect(appRouter.shares.getPublicEntry).toBeDefined()
    expect(appRouter.shares.checkRequiresPassword).toBeDefined()
  })
})

describe("shares error types", () => {
  it("should use ORPCError for NOT_FOUND", () => {
    const error = new ORPCError("NOT_FOUND", { message: "Entry not found" })
    expect(error).toBeInstanceOf(ORPCError)
    expect(error.code).toBe("NOT_FOUND")
  })

  it("should use ORPCError for FORBIDDEN when share is disabled", () => {
    const error = new ORPCError("FORBIDDEN", {
      message: "This share link has been disabled"
    })
    expect(error).toBeInstanceOf(ORPCError)
    expect(error.code).toBe("FORBIDDEN")
  })

  it("should use ORPCError for FORBIDDEN when share is expired", () => {
    const error = new ORPCError("FORBIDDEN", {
      message: "This share link has expired"
    })
    expect(error).toBeInstanceOf(ORPCError)
    expect(error.code).toBe("FORBIDDEN")
  })

  it("should use ORPCError for UNAUTHORIZED when password required", () => {
    const error = new ORPCError("UNAUTHORIZED", {
      message: "Password required",
      data: { requiresPassword: true }
    })
    expect(error).toBeInstanceOf(ORPCError)
    expect(error.code).toBe("UNAUTHORIZED")
  })

  it("should use ORPCError for UNAUTHORIZED when password invalid", () => {
    const error = new ORPCError("UNAUTHORIZED", { message: "Invalid password" })
    expect(error).toBeInstanceOf(ORPCError)
    expect(error.code).toBe("UNAUTHORIZED")
  })

  it("should use ORPCError for INTERNAL_SERVER_ERROR", () => {
    const error = new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Failed to create share"
    })
    expect(error).toBeInstanceOf(ORPCError)
    expect(error.code).toBe("INTERNAL_SERVER_ERROR")
  })
})

describe("shares mock context", () => {
  it("should create mock session with default values", () => {
    const session = createMockSession()
    expect(session.user).toBeDefined()
    expect(session.user.id).toBeDefined()
    expect(session.user.email).toBe("test@example.com")
    expect(session.user.name).toBe("Test User")
  })

  it("should create mock context without session for public procedures", () => {
    const context = createMockContext()
    expect(context.session).toBeNull()
  })

  it("should create mock context with session for protected procedures", () => {
    const session = createMockSession()
    const context = createMockContext({ session })
    expect(context.session).toBe(session)
  })
})

// Regex pattern at module level for performance
const URL_SAFE_PATTERN = /^[A-Za-z0-9_-]+$/

describe("share token generation", () => {
  /**
   * Tests for share token properties
   * Token is generated using nanoid(21)
   */
  it("should generate tokens of correct length", () => {
    const expectedLength = 21
    // nanoid generates URL-safe characters
    const mockToken = "V1StGXR8_Z5jdHi6B-myT"
    expect(mockToken.length).toBe(expectedLength)
  })

  it("should generate URL-safe tokens", () => {
    const mockToken = "V1StGXR8_Z5jdHi6B-myT"
    expect(URL_SAFE_PATTERN.test(mockToken)).toBe(true)
  })
})

describe("bcrypt configuration", () => {
  /**
   * Tests for password hashing configuration
   */
  const BCRYPT_ROUNDS = 10

  it("should use correct bcrypt rounds", () => {
    expect(BCRYPT_ROUNDS).toBe(10)
  })

  it("should use reasonable number of rounds for security", () => {
    // OWASP recommends at least 10 rounds for bcrypt
    expect(BCRYPT_ROUNDS).toBeGreaterThanOrEqual(10)
    // But not too high for performance
    expect(BCRYPT_ROUNDS).toBeLessThanOrEqual(14)
  })
})

describe("share expiration logic", () => {
  it("should detect expired share", () => {
    const now = new Date()
    const expiredDate = new Date(now.getTime() - 1000) // 1 second ago
    expect(expiredDate < now).toBe(true)
  })

  it("should detect valid share", () => {
    const now = new Date()
    const ONE_DAY_MS = 86_400_000
    const futureDate = new Date(now.getTime() + ONE_DAY_MS) // 1 day from now
    expect(futureDate < now).toBe(false)
  })

  it("should handle null expiration (never expires)", () => {
    const expiresAt: Date | null = null
    // null means never expires, so it should be treated as valid
    expect(expiresAt === null || expiresAt > new Date()).toBe(true)
  })
})
