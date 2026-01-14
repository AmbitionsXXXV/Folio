import { ArrowUp02Icon, Setting06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { CatalogModel, CatalogProvider } from '@/hooks/use-ai-model-catalog'
import { cn } from '@/lib/utils'

export type ChatInputProps = {
	value: string
	onChange: (value: string) => void
	onSubmit: () => void
	disabled?: boolean
	isPending?: boolean
	placeholder?: string
	className?: string
	// Model selection props
	selectedProvider: string
	selectedModel: string
	onProviderChange: (provider: string) => void
	onModelChange: (model: string) => void
	configuredProviders: string[]
	hasApiKey: boolean
	// Model catalog (from useAiModelCatalog)
	catalogProviders: CatalogProvider[]
	catalogModels: CatalogModel[]
}

export function ChatInput({
	value,
	onChange,
	onSubmit,
	disabled = false,
	isPending = false,
	placeholder,
	className,
	selectedProvider,
	selectedModel,
	onProviderChange,
	onModelChange,
	configuredProviders,
	hasApiKey,
	catalogProviders,
	catalogModels,
}: ChatInputProps) {
	const { t } = useTranslation()
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const providerInfo = useMemo(
		() => catalogProviders.find((p) => p.id === selectedProvider),
		[catalogProviders, selectedProvider]
	)

	// Get enabled chat models for the selected provider from catalog
	const providerModels = useMemo(() => {
		return catalogModels.filter(
			(model) =>
				model.providerId === selectedProvider &&
				model.enabled &&
				model.type === 'chat'
		)
	}, [catalogModels, selectedProvider])

	// Find selected model info
	const selectedModelInfo = useMemo(() => {
		return providerModels.find((m) => m.id === selectedModel)
	}, [providerModels, selectedModel])

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			if (!(disabled || isPending) && value.trim()) {
				onSubmit()
			}
		}
	}

	const canSend = !(disabled || isPending) && hasApiKey && value.trim().length > 0

	return (
		<div
			className={cn(
				'relative rounded-2xl border bg-background shadow-sm transition-shadow',
				'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
				'hover:shadow-md',
				className
			)}
		>
			{/* Textarea */}
			<Textarea
				className={cn(
					'max-h-[200px] min-h-[100px] resize-none border-none bg-transparent',
					'px-4 pt-4 pb-16',
					'focus-visible:ring-0 focus-visible:ring-offset-0',
					'placeholder:text-muted-foreground/60'
				)}
				disabled={disabled || isPending || !hasApiKey}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={
					hasApiKey
						? placeholder || t('knowledge.inputPlaceholder')
						: t('knowledge.configureApiKeyFirst')
				}
				ref={textareaRef}
				value={value}
			/>

			{/* Bottom Actions Bar */}
			<div className="absolute right-3 bottom-3 left-3 flex items-center justify-between">
				{/* Left: Model Selector */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button className="h-8 gap-2 rounded-lg px-3 text-xs" variant="ghost">
							{providerInfo?.logo && (
								<img
									alt=""
									aria-hidden="true"
									className="size-4"
									src={providerInfo.logo}
								/>
							)}
							<span className="max-w-[120px] truncate">
								{selectedModelInfo?.displayName ||
									selectedModel ||
									providerInfo?.name ||
									t('knowledge.selectModel')}
							</span>
							<HugeiconsIcon
								className="size-4 text-muted-foreground"
								icon={Setting06Icon}
							/>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-64">
						{/* Provider Section */}
						<div className="px-2 py-1.5 font-medium text-muted-foreground text-xs">
							{t('knowledge.provider')}
						</div>
						{catalogProviders.map((p) => {
							const isConfigured = configuredProviders.includes(p.id)
							const isSelected = selectedProvider === p.id
							return (
								<DropdownMenuItem
									className={cn(isSelected && 'bg-accent')}
									key={p.id}
									onClick={() => {
										onProviderChange(p.id)
										onModelChange('')
									}}
								>
									<span className="flex items-center gap-2">
										{p.logo && (
											<img
												alt=""
												aria-hidden="true"
												className="size-4 dark:brightness-0 dark:invert"
												src={p.logo}
											/>
										)}
										{p.name}
										{!isConfigured && (
											<span className="text-muted-foreground text-xs">
												({t('knowledge.notConfigured')})
											</span>
										)}
									</span>
								</DropdownMenuItem>
							)
						})}
						{/* Model Section */}
						{providerModels.length > 0 && (
							<>
								<div className="mt-2 border-t px-2 pt-2 pb-1.5 font-medium text-muted-foreground text-xs">
									{t('knowledge.model')}
								</div>
								{providerModels.slice(0, 8).map((model) => {
									const isSelected = selectedModel === model.id
									return (
										<DropdownMenuItem
											className={cn(isSelected && 'bg-accent')}
											key={model.id}
											onClick={() => onModelChange(model.id)}
										>
											<span className="flex flex-col">
												<span className="text-sm">
													{model.displayName || model.id}
												</span>
												<span className="text-muted-foreground text-xs">
													{model.id}
												</span>
											</span>
										</DropdownMenuItem>
									)
								})}
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Right: Submit Button */}
				<Button
					aria-label={t('knowledge.send')}
					className="size-8 shrink-0 rounded-lg"
					disabled={!canSend}
					onClick={onSubmit}
					size="icon"
				>
					{isPending ? (
						<Spinner className="size-4" />
					) : (
						<HugeiconsIcon className="size-4" icon={ArrowUp02Icon} />
					)}
				</Button>
			</div>
		</div>
	)
}
