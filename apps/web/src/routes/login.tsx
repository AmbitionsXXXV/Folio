import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'
import SignInForm from '@/components/sign-in-form'

const loginSearchSchema = z.object({
	redirect: z.string().optional(),
})

export const Route = createFileRoute('/login')({
	validateSearch: loginSearchSchema,
	component: RouteComponent,
})

/**
 * React route component for the "/login" route that renders the sign-in form.
 *
 * @returns The JSX element that renders the `SignInForm` component.
 */
function RouteComponent() {
	return <SignInForm />
}
