import { createContext } from "@folionote/api/context"
import { appRouter } from "@folionote/api/routers/index"
import { auth } from "@folionote/auth"
import { defaultLanguage, supportedLanguages } from "@folionote/locales"
import { createHonoLogger, createLogger } from "@folionote/log"
import { OpenAPIHandler } from "@orpc/openapi/fetch"
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins"
import { onError } from "@orpc/server"
import { RPCHandler } from "@orpc/server/fetch"
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { languageDetector } from "hono/language"
import { logger } from "hono/logger"
import { prettyJSON } from "hono/pretty-json"
import type { RequestIdVariables } from "hono/request-id"
import { requestId } from "hono/request-id"
import { timeout } from "hono/timeout"

import { registerRoutes } from "./routes"
import { isAllowedOrigin } from "./utils/allowed-origin"
import { convertToSupportedLanguage } from "./utils/language"

const log = createLogger({ prefix: "server" })

// Define custom variables for Hono context
type AppVariables = RequestIdVariables & {
  language: string
}

log.info("CORS_ORIGIN", process.env.CORS_ORIGIN)

export const app = new Hono<{
  Variables: AppVariables
}>()

// Request ID middleware - generates unique ID for each request
app.use("*", requestId())

// Response compression is handled at the edge by Caddy (`encode gzip zstd`).
// Compressing here as well would waste CPU on the loopback hop and risks
// buffering the SSE AI stream, so it is intentionally omitted.

// Language detection middleware - detects user's preferred language
app.use(
  "*",
  languageDetector({
    supportedLanguages: [...supportedLanguages],
    fallbackLanguage: defaultLanguage,
    order: ["querystring", "header"],
    lookupQueryString: "lang",
    lookupFromHeaderKey: "accept-language",
    caches: false // Server-side doesn't need cookie caching
  })
)

app.use(prettyJSON())
app.use(logger(createHonoLogger()))
app.use(
  "/*",
  cors({
    // Reflects the origin only when allowed (CORS_ORIGIN, or localhost
    // outside production) — see utils/allowed-origin, shared with the
    // collab server's WebSocket upgrade, which CORS doesn't cover.
    origin: (origin) => (isAllowedOrigin(origin) ? origin : null),
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Locale",
      "Accept-Language"
    ],
    credentials: true
  }),
  timeout(30_000)
)

// Auth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))

// oRPC handlers
export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()]
    })
  ],
  interceptors: [
    onError((error) => {
      log.error("API error:", error)
    })
  ]
})

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      log.error("RPC error:", error)
    })
  ]
})

// RPC/API middleware
app.use("/*", async (c, next) => {
  // Get detected language from middleware and convert to BCP47 format
  const detectedLanguage = c.get("language")
  const locale = convertToSupportedLanguage(detectedLanguage)

  const context = await createContext({ context: c, locale })

  // Add Request ID to response header for tracing
  const reqId = c.get("requestId")
  if (reqId) {
    c.header("X-Request-Id", reqId)
  }

  c.header("Vary", "Accept-Language, X-Locale")

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context
  })

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response)
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context
  })

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response)
  }

  await next()
})

// Register application routes
registerRoutes(app)
