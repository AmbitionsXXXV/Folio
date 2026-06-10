import { TanStackDevtools } from "@tanstack/react-devtools"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"

/**
 * Dev-only devtools, isolated into their own module so the root never imports
 * them statically. `@tanstack/react-devtools` (via `@tanstack/devtools` /
 * `@solid-primitives/event-listener`) calls a browser-only API at module-load
 * time; importing it during production SSR throws "Client-only API called on
 * the server side" and 500s every page. The root lazy-loads this only on the
 * client in development, so these packages never reach the SSR/production bundle.
 */
export default function DevTools() {
  return (
    <TanStackDevtools
      config={{ hideUntilHover: true }}
      plugins={[
        {
          name: "TanStack Query",
          render: <ReactQueryDevtoolsPanel />,
          defaultOpen: true
        },
        {
          name: "TanStack Router",
          render: <TanStackRouterDevtoolsPanel />,
          defaultOpen: false
        }
      ]}
    />
  )
}
