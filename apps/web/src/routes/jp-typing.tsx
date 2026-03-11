import { createFileRoute, redirect } from '@tanstack/react-router'
import { JapaneseTypingPractice } from '@/components/review'
import { getUser } from '@/functions/get-user'

export const Route = createFileRoute('/jp-typing')({
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
	component: JpTypingPage,
})
function JpTypingPage() {
	return <JapaneseTypingPractice />
}
