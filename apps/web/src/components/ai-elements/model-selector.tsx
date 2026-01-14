import type { ModelProviderId } from '@folionote/model-list'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command'
import type { CatalogModel, CatalogProvider } from '@/hooks/use-ai-model-catalog'
import { cn } from '@/lib/utils'

export type ModelSelectorOption = {
	id: string
	name: string
	iconSrc?: string
}

export type ModelSelectorGroup = {
	id: string
	name: string
	options: ModelSelectorOption[]
}

/**
 * Convert catalog data to ModelSelector format (using enabled models only)
 */
export function createModelSelectorGroups(
	providers: CatalogProvider[],
	models: CatalogModel[]
): ModelSelectorGroup[] {
	return providers
		.filter((provider) => provider.enabled)
		.map((provider) => {
			const providerModels = models.filter(
				(model) =>
					model.providerId === provider.id && model.enabled && model.type === 'chat'
			)

			return {
				id: provider.id,
				name: provider.name,
				options: providerModels.map((model) => ({
					id: model.id,
					name: model.displayName || model.id,
					iconSrc: provider.logo,
				})),
			}
		})
		.filter((group) => group.options.length > 0)
}

type ModelSelectorProps = {
	options?: ModelSelectorOption[]
	groups?: ModelSelectorGroup[]
	value: string | null
	onValueChange: (nextValue: string) => void
	placeholder?: string
	disabled?: boolean
	className?: string
	dialogTitle?: string
	dialogDescription?: string
}

/**
 * A minimal Model Selector inspired by Vercel AI Elements.
 *
 * It uses the existing `cmdk`-based Command UI to provide searchable selection.
 */
export function ModelSelector({
	options,
	groups,
	value,
	onValueChange,
	placeholder = 'Select a model…',
	disabled = false,
	className,
	dialogTitle = 'Model Selector',
	dialogDescription = 'Search and select a model',
}: ModelSelectorProps) {
	const [open, setOpen] = useState(false)

	const resolvedGroups = useMemo<ModelSelectorGroup[]>(() => {
		if (groups && groups.length > 0) return groups
		return [
			{
				id: 'default',
				name: 'Models',
				options: options ?? [],
			},
		]
	}, [groups, options])

	const selected = useMemo(() => {
		if (!value) return null
		for (const group of resolvedGroups) {
			const match = group.options.find((option) => option.id === value)
			if (match) return match
		}
		return null
	}, [resolvedGroups, value])

	return (
		<>
			<Button
				className={cn('w-full justify-between', className)}
				disabled={disabled}
				onClick={() => setOpen(true)}
				type="button"
				variant="outline"
			>
				<span className="inline-flex items-center gap-2">
					{selected?.iconSrc ? (
						<img
							alt=""
							aria-hidden="true"
							className="size-4"
							src={selected.iconSrc}
						/>
					) : null}
					<span className="line-clamp-1">{selected?.name ?? placeholder}</span>
				</span>
				<span aria-hidden="true" className="text-muted-foreground">
					⌘K
				</span>
			</Button>

			<CommandDialog
				description={dialogDescription}
				onOpenChange={setOpen}
				open={open}
				showCloseButton
				title={dialogTitle}
			>
				<Command>
					<CommandInput placeholder="Search…" />
					<CommandList>
						<CommandEmpty>No results.</CommandEmpty>
						{resolvedGroups.map((group) => (
							<CommandGroup heading={group.name} key={group.id}>
								{group.options.map((option) => (
									<CommandItem
										data-checked={value === option.id}
										key={option.id}
										onSelect={() => {
											onValueChange(option.id)
											setOpen(false)
										}}
										value={`${option.name} ${option.id}`}
									>
										<span className="inline-flex items-center gap-2">
											{option.iconSrc ? (
												<img
													alt=""
													aria-hidden="true"
													className="size-4"
													src={option.iconSrc}
												/>
											) : null}
											<span>{option.name}</span>
											<span className="text-muted-foreground text-xs">
												{option.id}
											</span>
										</span>
									</CommandItem>
								))}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</CommandDialog>
		</>
	)
}

type AiModelSelectorProps = Omit<ModelSelectorProps, 'options' | 'groups'> & {
	provider?: ModelProviderId | 'all'
	/** Catalog providers from useAiModelCatalog */
	catalogProviders: CatalogProvider[]
	/** Catalog models from useAiModelCatalog */
	catalogModels: CatalogModel[]
}

/**
 * Create filtered groups based on provider filter
 */
function createFilteredGroups(
	allGroups: ModelSelectorGroup[],
	provider?: ModelProviderId | 'all'
): ModelSelectorGroup[] {
	if (provider === 'all' || !provider) {
		return allGroups
	}

	return allGroups.filter((group) => group.id === provider)
}

/**
 * Opinionated selector that ships with dynamic model catalog from server.
 * Only enabled models are shown.
 */
export function AiModelSelector({
	provider = 'all',
	catalogProviders,
	catalogModels,
	...props
}: AiModelSelectorProps) {
	const groups = useMemo(() => {
		const allGroups = createModelSelectorGroups(catalogProviders, catalogModels)
		return createFilteredGroups(allGroups, provider)
	}, [catalogProviders, catalogModels, provider])

	return <ModelSelector groups={groups} {...props} />
}
