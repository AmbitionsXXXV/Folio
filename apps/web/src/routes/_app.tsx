import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileHeader } from '@/components/mobile-header'
import { SidebarInset, SidebarProvider } from '@/components/sidebar'
import { getUser } from '@/functions/get-user'

export const Route = createFileRoute('/_app')({
	beforeLoad: async ({ location }) => {
		const session = await getUser()
		if (!session) {
			throw redirect({
				to: '/login',
				search: { redirect: location.href },
			})
		}
		return { session }
	},
	component: AppLayout,
})

/**
 * App layout with sidebar for authenticated product pages.
 * This layout wraps all product pages (inbox, library, tags, etc.)
 */
function AppLayout() {
	return (
		<SidebarProvider>
			<AppSidebar />

			<SidebarInset>
				<MobileHeader />

				<div
					className="flex-1 overflow-y-auto overscroll-contain scroll-smooth"
					id="main-content"
					role="main"
				>
					<div className="animate-fade-in-scale">
						<Outlet />
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
