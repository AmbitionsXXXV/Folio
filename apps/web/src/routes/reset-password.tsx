import { createFileRoute } from '@tanstack/react-router'
import ResetPasswordForm from '@/components/reset-password-form'

export const Route = createFileRoute('/reset-password')({
	component: RouteComponent,
})

/**
 * React route component for the "/reset-password" route that renders the reset password form.
 *
 * @returns The JSX element that renders the `ResetPasswordForm` component.
 */
function RouteComponent() {
	return <ResetPasswordForm />
}
