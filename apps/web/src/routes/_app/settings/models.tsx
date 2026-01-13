import { DEFAULT_MODEL_PROVIDER_LIST } from '@folionote/model-list'
import {
	AiBeautifyIcon,
	InformationCircleIcon,
	Key01Icon,
	Rocket01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ModelProviderCard } from '@/components/settings/model-provider-card'
import { Skeleton } from '@/components/ui/skeleton'
import {
	type ModelProviderConfig,
	useModelProviderConfig,
} from '@/hooks/use-model-provider-config'

export const Route = createFileRoute('/_app/settings/models')({
	component: ModelsSettingsPage,
})

/**
 * Enhanced models settings page with modern BYOK design.
 * Uses data from @folionote/model-list package.
 */
function ModelsSettingsPage() {
	const { t } = useTranslation()
	const {
		config,
		isLoaded,
		getProviderConfig,
		updateProviderConfig,
		removeProviderConfig,
		setDefaultProvider,
	} = useModelProviderConfig()

	const handleConfigure = useCallback(
		(providerId: string, providerConfig: ModelProviderConfig) => {
			updateProviderConfig(providerId, providerConfig)
		},
		[updateProviderConfig]
	)

	const handleRemove = useCallback(
		(providerId: string) => {
			removeProviderConfig(providerId)
		},
		[removeProviderConfig]
	)

	const handleSetDefault = useCallback(
		(providerId: string) => {
			setDefaultProvider(providerId)
		},
		[setDefaultProvider]
	)

	const configuredCount = Object.values(config.providers || {}).filter((p) =>
		p?.apiKey?.trim()
	).length

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
					<div className="flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500/20 to-cyan-500/20 shadow-sm">
						<HugeiconsIcon className="size-6 text-primary" icon={AiBeautifyIcon} />
					</div>
					<div>
						<h1 className="text-balance font-bold text-2xl md:text-3xl">
							{t('settings.models.title')}
						</h1>
						<p className="text-pretty text-muted-foreground text-sm">
							{t('settings.models.description')}
						</p>
					</div>
				</div>

				{/* Stats indicator */}
				<div className="flex items-center gap-4 text-sm">
					<div className="flex items-center gap-2">
						<span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
							{configuredCount}
						</span>
						<span className="text-muted-foreground">
							{t('settings.models.configuredProviders', { count: configuredCount })}
						</span>
					</div>
					<span className="text-muted-foreground/30">|</span>
					<div className="flex items-center gap-2 text-muted-foreground">
						<span>{DEFAULT_MODEL_PROVIDER_LIST.length}</span>
						<span>{t('settings.models.availableProviders')}</span>
					</div>
				</div>
			</motion.div>

			{/* BYOK Info Banner */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="mb-8"
				initial={{ opacity: 0, y: 20 }}
				transition={{ duration: 0.4, delay: 0.2 }}
			>
				<div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-r from-primary/5 via-purple-500/5 to-pink-500/5 p-5">
					{/* Decorative element */}
					<div className="pointer-events-none absolute top-0 right-0 size-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-2xl" />

					<div className="relative flex flex-col gap-4 md:flex-row md:items-start">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
							<HugeiconsIcon className="size-5 text-primary" icon={Key01Icon} />
						</div>
						<div className="flex-1">
							<h2 className="mb-1 font-semibold">
								{t('settings.models.byokTitle')}
							</h2>
							<p className="mb-3 text-muted-foreground text-sm leading-relaxed">
								{t('settings.models.byokDescription')}
							</p>

							{/* Feature list */}
							<div className="flex flex-wrap gap-3">
								<div className="flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs">
									<span className="size-1.5 rounded-full bg-green-500" />
									<span>{t('settings.models.feature.secure')}</span>
								</div>
								<div className="flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs">
									<span className="size-1.5 rounded-full bg-blue-500" />
									<span>{t('settings.models.feature.private')}</span>
								</div>
								<div className="flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs">
									<span className="size-1.5 rounded-full bg-purple-500" />
									<span>{t('settings.models.feature.flexible')}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</motion.div>

			{/* Quick start tip */}
			{configuredCount === 0 && (
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className="mb-6"
					initial={{ opacity: 0, scale: 0.95 }}
					transition={{ duration: 0.3, delay: 0.3 }}
				>
					<div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
						<HugeiconsIcon
							className="mt-0.5 size-5 shrink-0 text-amber-500"
							icon={Rocket01Icon}
						/>
						<div>
							<p className="font-medium text-sm">
								{t('settings.models.getStarted')}
							</p>
							<p className="text-muted-foreground text-xs">
								{t('settings.models.getStartedHint')}
							</p>
						</div>
					</div>
				</motion.div>
			)}

			{/* Provider Cards */}
			<div className="space-y-4">
				{isLoaded ? (
					DEFAULT_MODEL_PROVIDER_LIST.map((provider, index) => (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							initial={{ opacity: 0, y: 20 }}
							key={provider.id}
							transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
						>
							<ModelProviderCard
								config={getProviderConfig(provider.id)}
								isDefault={config.defaultProvider === provider.id}
								onConfigure={handleConfigure}
								onRemove={handleRemove}
								onSetDefault={handleSetDefault}
								provider={provider}
							/>
						</motion.div>
					))
				) : (
					<div className="space-y-4">
						{[1, 2, 3, 4].map((i) => (
							<motion.div
								animate={{ opacity: 1, y: 0 }}
								initial={{ opacity: 0, y: 20 }}
								key={i}
								transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
							>
								<Skeleton className="h-24 w-full rounded-xl" />
							</motion.div>
						))}
					</div>
				)}
			</div>

			{/* Help section */}
			<motion.div
				animate={{ opacity: 1 }}
				className="mt-8"
				initial={{ opacity: 0 }}
				transition={{ duration: 0.4, delay: 0.6 }}
			>
				<div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
					<HugeiconsIcon
						className="mt-0.5 size-5 shrink-0 text-muted-foreground"
						icon={InformationCircleIcon}
					/>
					<div>
						<p className="mb-1 font-medium text-sm">
							{t('settings.models.helpTitle')}
						</p>
						<p className="text-muted-foreground text-xs leading-relaxed">
							{t('settings.models.helpDescription')}
						</p>
					</div>
				</div>
			</motion.div>

			{/* Bottom spacer for scroll comfort */}
			<div className="h-8" />
		</div>
	)
}
