import {
	DEFAULT_MODEL_PROVIDER_LIST,
	MODEL_TYPES,
	type ModelType,
} from '@folionote/model-list'
import { Button } from '@folionote/ui/button'
import { Input } from '@folionote/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@folionote/ui/select'
import { Skeleton } from '@folionote/ui/skeleton'
import { Switch } from '@folionote/ui/switch'
import {
	AiBeautifyIcon,
	Cancel01Icon,
	InformationCircleIcon,
	Key01Icon,
	Rocket01Icon,
	Search01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModelProviderCard } from '@/components/settings/model-provider-card'
import {
	type CatalogModel,
	type CatalogProvider,
	useAiModelCatalog,
	useSetModelEnabled,
	useSetProviderEnabled,
} from '@/hooks/use-ai-model-catalog'
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

	// Model catalog state
	const {
		providers: catalogProviders,
		models: catalogModels,
		isLoading: isCatalogLoading,
	} = useAiModelCatalog()
	const setModelEnabled = useSetModelEnabled()
	const setProviderEnabled = useSetProviderEnabled()

	// Filter state for model list
	const [searchQuery, setSearchQuery] = useState('')
	const [typeFilter, setTypeFilter] = useState<ModelType | 'all'>('all')

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

	const handleToggleModel = useCallback(
		(model: CatalogModel) => {
			setModelEnabled.mutate({
				providerId: model.providerId,
				id: model.id,
				type: model.type as ModelType,
				enabled: !model.enabled,
			})
		},
		[setModelEnabled]
	)

	const handleToggleProvider = useCallback(
		(provider: CatalogProvider) => {
			setProviderEnabled.mutate({
				providerId: provider.id,
				enabled: !provider.enabled,
			})
		},
		[setProviderEnabled]
	)

	const configuredCount = Object.values(config.providers || {}).filter((p) =>
		p?.apiKey?.trim()
	).length

	// Filter models based on search and type
	const filteredModels = useMemo(() => {
		let result = catalogModels

		// Filter by type
		if (typeFilter !== 'all') {
			result = result.filter((m) => m.type === typeFilter)
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim()
			result = result.filter(
				(m) =>
					m.displayName.toLowerCase().includes(query) ||
					m.id.toLowerCase().includes(query) ||
					m.providerId.toLowerCase().includes(query)
			)
		}

		return result
	}, [catalogModels, typeFilter, searchQuery])

	// Group models by provider
	const modelsByProvider = useMemo(() => {
		const grouped = new Map<string, CatalogModel[]>()
		for (const model of filteredModels) {
			const existing = grouped.get(model.providerId) || []
			existing.push(model)
			grouped.set(model.providerId, existing)
		}
		return grouped
	}, [filteredModels])

	// Get provider info by id
	const getProviderInfo = useCallback(
		(providerId: string): CatalogProvider => {
			return (
				catalogProviders.find((p) => p.id === providerId) || {
					id: providerId,
					name: providerId,
					enabled: false,
				}
			)
		},
		[catalogProviders]
	)

	// Stats
	const enabledCount = catalogModels.filter((m) => m.enabled).length
	const totalCount = catalogModels.length

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

			{/* Model List Section */}
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="mt-12"
				initial={{ opacity: 0, y: 20 }}
				transition={{ duration: 0.4, delay: 0.7 }}
			>
				{/* Section Header */}
				<div className="mb-6">
					<h2 className="mb-1 font-semibold text-xl">
						{t('settings.models.modelList.title')}
					</h2>
					<p className="text-muted-foreground text-sm">
						{t('settings.models.modelList.description')}
					</p>
				</div>

				{/* Stats and Filters */}
				<div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					{/* Stats */}
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<span>
							{t('settings.models.modelList.enabledCount', {
								count: enabledCount,
							})}
						</span>
						<span className="text-muted-foreground/30">/</span>
						<span>
							{t('settings.models.modelList.totalCount', {
								count: totalCount,
							})}
						</span>
					</div>

					{/* Filters */}
					<div className="flex items-center gap-2">
						{/* Type filter */}
						<Select
							onValueChange={(value) => setTypeFilter(value as ModelType | 'all')}
							value={typeFilter}
						>
							<SelectTrigger className="h-9 w-[130px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									{t('settings.models.modelList.allTypes')}
								</SelectItem>
								{MODEL_TYPES.map((type) => (
									<SelectItem key={type} value={type}>
										{t(`settings.models.modelList.type.${type}`)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{/* Search */}
						<div className="relative">
							<HugeiconsIcon
								className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
								icon={Search01Icon}
							/>
							<Input
								className="h-9 w-[200px] pr-8 pl-9"
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder={t('settings.models.modelList.searchPlaceholder')}
								value={searchQuery}
							/>
							{searchQuery && (
								<Button
									className="absolute top-1/2 right-1 size-6 -translate-y-1/2"
									onClick={() => setSearchQuery('')}
									size="icon"
									variant="ghost"
								>
									<HugeiconsIcon className="size-3.5" icon={Cancel01Icon} />
								</Button>
							)}
						</div>
					</div>
				</div>

				{/* Model List */}
				<div className="divide-y rounded-xl border bg-card">
					<ModelListContent
						filteredModels={filteredModels}
						getProviderInfo={getProviderInfo}
						isCatalogLoading={isCatalogLoading}
						modelsByProvider={modelsByProvider}
						onToggleModel={handleToggleModel}
						onToggleProvider={handleToggleProvider}
						t={t}
					/>
				</div>
			</motion.div>

			{/* Bottom spacer for scroll comfort */}
			<div className="h-8" />
		</div>
	)
}

/**
 * Model list content - handles loading, empty, and populated states
 */
function ModelListContent({
	isCatalogLoading,
	filteredModels,
	modelsByProvider,
	getProviderInfo,
	onToggleModel,
	onToggleProvider,
	t,
}: {
	isCatalogLoading: boolean
	filteredModels: CatalogModel[]
	modelsByProvider: Map<string, CatalogModel[]>
	getProviderInfo: (id: string) => CatalogProvider
	onToggleModel: (model: CatalogModel) => void
	onToggleProvider: (provider: CatalogProvider) => void
	t: ReturnType<typeof useTranslation>['t']
}) {
	if (isCatalogLoading) {
		return (
			<div className="space-y-2 p-4">
				{[1, 2, 3, 4, 5].map((i) => (
					<Skeleton className="h-14 w-full" key={i} />
				))}
			</div>
		)
	}

	if (filteredModels.length === 0) {
		return (
			<div className="p-8 text-center text-muted-foreground text-sm">
				{t('settings.models.modelList.noResults')}
			</div>
		)
	}

	return (
		<>
			{Array.from(modelsByProvider.entries()).map(([providerId, models]) => (
				<ModelProviderGroup
					getProviderInfo={getProviderInfo}
					key={providerId}
					models={models}
					onToggleModel={onToggleModel}
					onToggleProvider={onToggleProvider}
					providerId={providerId}
					t={t}
				/>
			))}
		</>
	)
}

/**
 * Model group by provider
 */
function ModelProviderGroup({
	providerId,
	models,
	getProviderInfo,
	onToggleModel,
	onToggleProvider,
	t,
}: {
	providerId: string
	models: CatalogModel[]
	getProviderInfo: (id: string) => CatalogProvider
	onToggleModel: (model: CatalogModel) => void
	onToggleProvider: (provider: CatalogProvider) => void
	t: ReturnType<typeof useTranslation>['t']
}) {
	const provider = getProviderInfo(providerId)

	return (
		<div>
			{/* Provider header */}
			<div className="flex items-center justify-between bg-muted/30 px-4 py-2">
				<div className="flex items-center gap-2">
					{provider.logo && (
						<img
							alt={provider.name}
							className="size-4 rounded-sm object-contain dark:brightness-0 dark:invert"
							src={provider.logo}
						/>
					)}
					<span className="font-medium text-sm">{provider.name}</span>
					<span className="text-muted-foreground text-xs">({models.length})</span>
				</div>
				<Switch
					aria-label={t('settings.models.modelList.toggleProvider', {
						provider: provider.name,
					})}
					checked={provider.enabled}
					onCheckedChange={() => onToggleProvider(provider)}
				/>
			</div>

			{/* Model list - always show regardless of provider enabled state */}
			<div className="divide-y divide-border/50">
				{models.map((model) => (
					<ModelRow
						key={`${model.providerId}-${model.id}-${model.type}`}
						model={model}
						onToggle={onToggleModel}
						t={t}
					/>
				))}
			</div>
		</div>
	)
}

/**
 * Individual model row
 */
function ModelRow({
	model,
	onToggle,
	t,
}: {
	model: CatalogModel
	onToggle: (model: CatalogModel) => void
	t: ReturnType<typeof useTranslation>['t']
}) {
	return (
		<div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/20">
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate font-medium text-sm">{model.displayName}</span>
					<span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
						{t(`settings.models.modelList.type.${model.type}`)}
					</span>
				</div>
				<div className="mt-0.5 truncate text-muted-foreground text-xs">
					{model.id}
				</div>
			</div>
			<Switch
				checked={model.enabled}
				className="ml-4 shrink-0"
				onCheckedChange={() => onToggle(model)}
			/>
		</div>
	)
}
