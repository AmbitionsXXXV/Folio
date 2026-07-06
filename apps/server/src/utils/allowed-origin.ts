const corsOrigins = process.env.CORS_ORIGIN?.split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0) || ["http://localhost:3001"]

/**
 * The same allowlist Hono's CORS middleware enforces in app.ts. Shared so
 * the collab server's WebSocket upgrade — which CORS headers don't cover,
 * since a WS handshake isn't a CORS-checked request — enforces an
 * identical origin check. Without this, a `SameSite=None` session cookie
 * plus no origin check on the socket is a cross-site WebSocket hijack.
 */
export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) {
    return false
  }
  if (corsOrigins.includes(origin)) {
    return true
  }
  return (
    process.env.NODE_ENV !== "production" &&
    origin.startsWith("http://localhost:")
  )
}
