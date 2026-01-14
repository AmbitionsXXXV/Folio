import { AccountSetting01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { motion } from 'motion/react'
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

/**
 * Enhanced general settings page with modern design.
 * Contains profile, appearance, language, and danger zone settings.
 */
function GeneralSettingsPage() {
	const { t } = useTranslation()
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
		<div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
			{/* Page Header */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="mb-10"
				initial={{ opacity: 0, y: -10 }}
				transition={{ duration: 0.4, delay: 0.1 }}
			>
				<div className="mb-4 flex items-center gap-3">
					<div className="flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500/20 to-purple-500/20 shadow-sm">
						<HugeiconsIcon
							className="size-6 text-primary"
							icon={AccountSetting01Icon}
						/>
					</div>
					<div>
						<h1 className="text-balance font-bold text-2xl md:text-3xl">
							{t('settings.general.title')}
						</h1>
						<p className="text-pretty text-muted-foreground text-sm">
							{t('settings.general.description')}
						</p>
					</div>
				</div>

				{/* Breadcrumb / Progress indicator */}
				<div className="flex items-center gap-2 text-muted-foreground text-xs">
					<span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
						1
					</span>
					<span className="font-medium text-foreground">
						{t('settings.nav.general')}
					</span>
					<span className="text-muted-foreground/50">—</span>
					<span>{t('settings.general.sections', { count: 4 })}</span>
				</div>
			</motion.div>

			{/* Settings Sections with staggered animation */}
			<div className="space-y-6">
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					initial={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.4, delay: 0.2 }}
				>
					<ProfileCard />
				</motion.div>

				<motion.div
					animate={{ opacity: 1, y: 0 }}
					initial={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.4, delay: 0.3 }}
				>
					<AppearanceSettings mounted={mounted} />
				</motion.div>

				<motion.div
					animate={{ opacity: 1, y: 0 }}
					initial={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.4, delay: 0.4 }}
				>
					<LanguageSettings />
				</motion.div>

				{/* API Environment Settings - Development only */}
				{import.meta.env.MODE === 'development' && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						initial={{ opacity: 0, y: 20 }}
						transition={{ duration: 0.4, delay: 0.45 }}
					>
						<ApiEnvironmentSettings />
					</motion.div>
				)}

				<motion.div
					animate={{ opacity: 1, y: 0 }}
					initial={{ opacity: 0, y: 20 }}
					transition={{ duration: 0.4, delay: 0.5 }}
				>
					<DangerZone onSignOut={handleSignOut} />
				</motion.div>
			</div>

			{/* Bottom spacer for scroll comfort */}
			<div className="h-8" />
		</div>
	)
}
