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

export type AiModelProviderId = 'openai' | 'deepseek' | 'gemini' | 'claude' | 'qwen'

const AI_PROVIDER_ICONS: Record<AiModelProviderId, string> = {
	openai: '/svg/models/openai.svg',
	deepseek: '/svg/models/deepseek.svg',
	gemini: '/svg/models/gemini.svg',
	claude: '/svg/models/claude.svg',
	qwen: '/svg/models/qwen.svg',
}

/**
 * Built-in model catalog (curated, not exhaustive).
 *
 * - Gemini model ids follow the AI SDK Google provider docs:
 *   https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
 * - Other providers include the models currently used by FolioNote defaults.
 */
export const AI_MODEL_SELECTOR_GROUPS: ModelSelectorGroup[] = [
	{
		id: 'openai',
		name: 'OpenAI',
		options: [
			{ id: 'gpt-4o-mini', name: 'GPT-4o mini', iconSrc: AI_PROVIDER_ICONS.openai },
			{ id: 'gpt-4o', name: 'GPT-4o', iconSrc: AI_PROVIDER_ICONS.openai },
		],
	},
	{
		id: 'deepseek',
		name: 'DeepSeek',
		options: [
			{
				id: 'deepseek-chat',
				name: 'DeepSeek Chat',
				iconSrc: AI_PROVIDER_ICONS.deepseek,
			},
		],
	},
	{
		id: 'gemini',
		name: 'Gemini',
		options: [
			{
				id: 'gemini-2.5-flash-lite',
				name: 'Gemini 2.5 Flash Lite',
				iconSrc: AI_PROVIDER_ICONS.gemini,
			},
			{
				id: 'gemini-2.5-flash',
				name: 'Gemini 2.5 Flash',
				iconSrc: AI_PROVIDER_ICONS.gemini,
			},
			{
				id: 'gemini-2.5-pro',
				name: 'Gemini 2.5 Pro',
				iconSrc: AI_PROVIDER_ICONS.gemini,
			},
			{
				id: 'gemini-2.0-flash',
				name: 'Gemini 2.0 Flash',
				iconSrc: AI_PROVIDER_ICONS.gemini,
			},
			{
				id: 'gemini-1.5-flash',
				name: 'Gemini 1.5 Flash',
				iconSrc: AI_PROVIDER_ICONS.gemini,
			},
			{
				id: 'gemini-1.5-pro',
				name: 'Gemini 1.5 Pro',
				iconSrc: AI_PROVIDER_ICONS.gemini,
			},
		],
	},
	{
		id: 'claude',
		name: 'Claude',
		options: [
			{
				id: 'claude-sonnet-4-20250514',
				name: 'Claude Sonnet 4 (2025-05-14)',
				iconSrc: AI_PROVIDER_ICONS.claude,
			},
		],
	},
	{
		id: 'qwen',
		name: 'Qwen',
		options: [
			{
				id: 'qwen-turbo',
				name: 'Qwen Turbo',
				iconSrc: AI_PROVIDER_ICONS.qwen,
			},
		],
	},
]

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
	provider?: AiModelProviderId | 'all'
}

/**
 * Opinionated selector that ships with a built-in model catalog.
 */
export function AiModelSelector({
	provider = 'all',
	...props
}: AiModelSelectorProps) {
	const groups = useMemo(() => {
		if (provider === 'all') return AI_MODEL_SELECTOR_GROUPS
		return AI_MODEL_SELECTOR_GROUPS.filter((g) => g.id === provider)
	}, [provider])

	return <ModelSelector groups={groups} {...props} />
}
