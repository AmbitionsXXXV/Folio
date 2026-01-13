import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/profile')({
	beforeLoad: () => {
		// Redirect legacy /profile route to new /settings/general
		throw redirect({ to: '/settings/general' })
	},
	component: () => null,
})
