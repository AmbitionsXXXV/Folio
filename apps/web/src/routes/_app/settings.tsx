import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { SettingsNavTabs, SettingsSidebar } from '@/components/settings'

export const Route = createFileRoute('/_app/settings')({
	beforeLoad: ({ location }) => {
		// Redirect /settings to /settings/general
		if (location.pathname === '/settings') {
			throw redirect({ to: '/settings/general' })
		}
	},
	component: SettingsLayout,
})

/**
 * Modern settings layout with glassmorphism and smooth transitions.
 * Contains General and Models settings sections.
 * - Desktop: Collapsible sidebar navigation
 * - Mobile: Sticky tab navigation at top
 */
function SettingsLayout() {
	return (
		<div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-dvh md:flex-row">
			{/* Secondary Sidebar - hidden on mobile */}
			<div className="hidden md:flex">
				<SettingsSidebar />
			</div>

			{/* Mobile Navigation Tabs - visible only on mobile */}
			<div className="md:hidden">
				<SettingsNavTabs />
			</div>

			{/* Main Content Area with decorative elements */}
			<div className="relative flex-1 overflow-hidden bg-linear-to-br from-background via-background to-muted/20">
				{/* Decorative background elements */}
				<div className="pointer-events-none absolute top-0 right-0 size-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br from-primary/5 via-purple-500/5 to-transparent blur-3xl" />
				<div className="pointer-events-none absolute bottom-0 left-0 size-96 -translate-x-1/2 translate-y-1/2 rounded-full bg-linear-to-tr from-blue-500/5 via-cyan-500/5 to-transparent blur-3xl" />

				{/* Scrollable content */}
				<div className="no-scrollbar relative h-full overflow-y-auto">
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						initial={{ opacity: 0, y: 8 }}
						key={Route.fullPath}
						transition={{ duration: 0.3, ease: 'easeOut' }}
					>
						<Outlet />
					</motion.div>
				</div>
			</div>
		</div>
	)
}
