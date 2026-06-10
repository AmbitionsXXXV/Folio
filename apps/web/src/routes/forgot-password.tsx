import { createFileRoute } from "@tanstack/react-router"

import ForgotPasswordForm from "@/components/forgot-password-form"

export const Route = createFileRoute("/forgot-password")({
  component: RouteComponent
})

/**
 * React route component for the "/forgot-password" route that renders the forgot password form.
 *
 * @returns The JSX element that renders the `ForgotPasswordForm` component.
 */
function RouteComponent() {
  return <ForgotPasswordForm />
}
