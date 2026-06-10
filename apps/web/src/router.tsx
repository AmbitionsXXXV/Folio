import { QueryClientProvider } from "@tanstack/react-query"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"

import { DefaultErrorBoundary } from "./components/error-boundary"
import { NotFound } from "./components/not-found"
import { RoutePageSkeleton } from "./components/route-page-skeleton"

import "./index.css"
import { routeTree } from "./routeTree.gen"
import { orpc, queryClient } from "./utils/orpc"

export const getRouter = () => {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 30_000,
    defaultPendingMinMs: 200,
    defaultPendingMs: 0,
    defaultPendingComponent: RoutePageSkeleton,
    context: { orpc, queryClient },
    defaultNotFoundComponent: () => <NotFound />,
    defaultErrorComponent: DefaultErrorBoundary,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  })
  return router
}

declare module "@tanstack/react-router" {
  // @ts-expect-error
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
