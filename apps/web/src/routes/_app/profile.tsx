import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
	AppearanceSettings,
	DangerZone,
	LanguageSettings,
	ProfileCard,
	ProfileHeader,
} from '@/components/profile'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/_app/profile')({
	component: ProfilePage,
})

function ProfilePage() {
	const [mounted, setMounted] = useState(false)
	const router = useRouter()

	// Avoid hydration mismatch
	useEffect(() => {
		setMounted(true)
	}, [])

	const handleSignOut = async () => {
		await authClient.signOut()
		router.navigate({ to: '/', reloadDocument: true })
	}

	return (
		<div className="container mx-auto max-w-3xl px-4 py-8">
			<ProfileHeader />
			<ProfileCard />
			<AppearanceSettings mounted={mounted} />
			<LanguageSettings />
			<DangerZone onSignOut={handleSignOut} />
		</div>
	)
}
