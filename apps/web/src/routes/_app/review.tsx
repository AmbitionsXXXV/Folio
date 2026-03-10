import { Button } from '@folionote/ui/button'
import { ButtonGroup } from '@folionote/ui/button-group'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	JapaneseTypingPractice,
	ReviewDashboard,
	ReviewSession,
} from '@/components/review'
import type { ReviewRule } from '@/types'

type ReviewPageMode = 'spaced' | 'jp-typing'
type ReviewPageSearchParams = {
	mode?: ReviewPageMode
}

export const Route = createFileRoute('/_app/review')({
	validateSearch: (search: Record<string, unknown>): ReviewPageSearchParams => {
		if (search.mode === 'spaced' || search.mode === 'jp-typing') {
			return { mode: search.mode }
		}

		return {}
	},
	component: ReviewPage,
})

/**
 * ReviewPage - Main review page component
 * Handles state management and switches between dashboard and session views
 */
function ReviewPage() {
	const { t } = useTranslation()
	const navigate = useNavigate({ from: '/review' })
	const { mode } = Route.useSearch()
	const activeMode = mode ?? 'spaced'
	const [selectedRule, setSelectedRule] = useState<ReviewRule>('due')
	const [currentIndex, setCurrentIndex] = useState(0)
	const [isReviewing, setIsReviewing] = useState(false)

	const handleModeChange = useCallback(
		(nextMode: ReviewPageMode) => {
			navigate({
				to: '/review',
				search: nextMode === 'spaced' ? {} : { mode: nextMode },
			})
		},
		[navigate]
	)

	const handleStartReview = (rule: ReviewRule) => {
		setSelectedRule(rule)
		setCurrentIndex(0)
		setIsReviewing(true)
	}

	const handleStopReview = () => {
		setIsReviewing(false)
		setCurrentIndex(0)
	}

	let reviewContent = <JapaneseTypingPractice />

	if (activeMode === 'spaced') {
		reviewContent = isReviewing ? (
			<ReviewSession
				currentIndex={currentIndex}
				onIndexChange={setCurrentIndex}
				onStop={handleStopReview}
				selectedRule={selectedRule}
			/>
		) : (
			<ReviewDashboard onStartReview={handleStartReview} />
		)
	}

	return (
		<div className="py-6">
			<div className="container mx-auto max-w-6xl px-4">
				<ButtonGroup className="mb-6">
					<Button
						aria-pressed={activeMode === 'spaced'}
						onClick={() => handleModeChange('spaced')}
						size="sm"
						type="button"
						variant={activeMode === 'spaced' ? 'default' : 'outline'}
					>
						{t('review.modes.spaced')}
					</Button>
					<Button
						aria-pressed={activeMode === 'jp-typing'}
						onClick={() => handleModeChange('jp-typing')}
						size="sm"
						type="button"
						variant={activeMode === 'jp-typing' ? 'default' : 'outline'}
					>
						{t('review.modes.japaneseTyping')}
					</Button>
				</ButtonGroup>
			</div>

			{reviewContent}
		</div>
	)
}
