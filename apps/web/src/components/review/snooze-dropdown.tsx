import { Calendar01Icon, Time01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SNOOZE_PRESETS } from '@/constants'
import type { SnoozeDropdownProps } from '@/types/review'

/**
 * SnoozeDropdown - Dropdown menu for snooze options
 */
export function SnoozeDropdown({ onSnooze, disabled }: SnoozeDropdownProps) {
	const { t } = useTranslation()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					className="text-muted-foreground"
					disabled={disabled}
					size="sm"
					variant="ghost"
				>
					<HugeiconsIcon className="mr-1 size-4" icon={Time01Icon} />
					{t('review.snooze')}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="center">
				{SNOOZE_PRESETS.map(({ key, labelKey }) => (
					<DropdownMenuItem key={key} onClick={() => onSnooze(key)}>
						<HugeiconsIcon className="mr-2 size-4" icon={Calendar01Icon} />
						{t(labelKey)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
