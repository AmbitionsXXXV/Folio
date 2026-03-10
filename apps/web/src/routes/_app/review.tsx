import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ReviewDashboard, ReviewSession } from '@/components/review'
import type { ReviewRule } from '@/types'

export const Route = createFileRoute('/_app/review')({
	component: ReviewPage,
})

function ReviewPage() {
	const [selectedRule, setSelectedRule] = useState<ReviewRule>('due')
	const [currentIndex, setCurrentIndex] = useState(0)
	const [isReviewing, setIsReviewing] = useState(false)

	const handleStartReview = (rule: ReviewRule) => {
		setSelectedRule(rule)
		setCurrentIndex(0)
		setIsReviewing(true)
	}

	const handleStopReview = () => {
		setIsReviewing(false)
		setCurrentIndex(0)
	}

	return (
		<div className="py-6">
			{isReviewing ? (
				<ReviewSession
					currentIndex={currentIndex}
					onIndexChange={setCurrentIndex}
					onStop={handleStopReview}
					selectedRule={selectedRule}
				/>
			) : (
				<ReviewDashboard onStartReview={handleStartReview} />
			)}
		</div>
	)
}
