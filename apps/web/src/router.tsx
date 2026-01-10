import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { DefaultErrorBoundary } from './components/error-boundary'
import { NotFound } from './components/not-found'
import './index.css'
import { routeTree } from './routeTree.gen'
import { orpc, queryClient } from './utils/orpc'

export const getRouter = () => {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		// Enable preloading on hover with 50ms delay for better UX
		defaultPreload: 'intent',
		defaultPreloadDelay: 50,
		// Use stale time to prevent unnecessary refetches
		defaultPreloadStaleTime: 30_000,
		// Use shorter pending time to show loading state only for slow navigations
		defaultPendingMinMs: 0,
		defaultPendingMs: 150,
		context: { orpc, queryClient },
		defaultNotFoundComponent: () => <NotFound />,
		defaultErrorComponent: DefaultErrorBoundary,
		Wrap: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	})
	return router
}

declare module '@tanstack/react-router' {
	// @ts-expect-error
	type Register = {
		router: ReturnType<typeof getRouter>
	}
}
