import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import ResetPasswordForm from '@/components/reset-password-form'

const resetPasswordSearchSchema = z.object({
	token: z.string().optional(),
})

export const Route = createFileRoute('/reset-password')({
	validateSearch: resetPasswordSearchSchema,
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
