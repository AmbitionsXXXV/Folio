import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	ApiEnvironmentSettings,
	AppearanceSettings,
	DangerZone,
	LanguageSettings,
	ProfileCard,
} from '@/components/profile'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/_app/settings/general')({
	component: GeneralSettingsPage,
})

function GeneralSettingsPage() {
	const { t } = useTranslation()
	const [mounted, setMounted] = useState(false)
	const router = useRouter()

	useEffect(() => {
		setMounted(true)
	}, [])

	const handleSignOut = async () => {
		await authClient.signOut()
		router.navigate({ to: '/', reloadDocument: true })
	}

	return (
		<div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-10">
			<div className="mb-8">
				<h1 className="font-bold text-xl md:text-2xl">
					{t('settings.general.title')}
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					{t('settings.general.description')}
				</p>
			</div>

			<div className="space-y-5">
				<ProfileCard />
				<AppearanceSettings mounted={mounted} />
				<LanguageSettings />
				{import.meta.env.MODE === 'development' && <ApiEnvironmentSettings />}
				<DangerZone onSignOut={handleSignOut} />
			</div>

			<div className="h-8" />
		</div>
	)
}
