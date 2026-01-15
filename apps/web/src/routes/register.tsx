import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'
import SignUpForm from '@/components/sign-up-form'

const registerSearchSchema = z.object({
	redirect: z.string().optional(),
})

export const Route = createFileRoute('/register')({
	validateSearch: registerSearchSchema,
	component: RouteComponent,
})

/**
 * Renders the sign-up form used by the /register route.
 *
 * @returns The JSX element that renders the SignUpForm component.
 */
function RouteComponent() {
	return <SignUpForm />
}
