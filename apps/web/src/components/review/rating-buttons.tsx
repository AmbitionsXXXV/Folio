import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { RATING_BUTTONS } from '@/constants'
import { cn } from '@/lib/utils'
import type { RatingButtonsProps } from '@/types/review'

/**
 * RatingButtons - Rating buttons for review feedback
 */
export function RatingButtons({ onRate, isLoading }: RatingButtonsProps) {
	const { t } = useTranslation()

	return (
		<div className="flex flex-wrap justify-center gap-3">
			{RATING_BUTTONS.map(({ key, labelKey, variant, className }) => (
				<Button
					className={cn('min-w-20', className)}
					disabled={isLoading}
					key={key}
					onClick={() => onRate(key)}
					variant={variant}
				>
					{t(labelKey)}
				</Button>
			))}
		</div>
	)
}
