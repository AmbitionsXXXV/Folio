import { createMiddleware } from "@tanstack/react-start"

import { authClient } from "@/lib/auth-client"

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    // Resolve the session defensively: a failed or unreachable auth request
    // during SSR must not crash the page (e.g. the public landing route "/").
    // Any failure is treated as "not authenticated".
    const session = await authClient
      .getSession({ fetchOptions: { headers: request.headers } })
      .then((result) => result.data ?? null)
      .catch(() => null)

    return next({ context: { session } })
  }
)
