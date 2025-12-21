import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileHeader } from '@/components/mobile-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { getUser } from '@/functions/get-user'

export const Route = createFileRoute('/_app')({
	beforeLoad: async () => {
		const session = await getUser()
		if (!session) {
			throw redirect({ to: '/login' })
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
			{/* Desktop Sidebar - hidden on mobile */}
			<AppSidebar />

			{/* Main Content Area */}
			<SidebarInset>
				{/* Mobile Header - visible only on mobile, inside SidebarInset */}
				<MobileHeader />

				<main className="flex-1">
					<div className="animate-fade-in-scale">
						<Outlet />
					</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	)
}
