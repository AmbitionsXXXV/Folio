import type { Entry, Rating, ReviewRule, SnoozePreset } from '.'

/**
 * Props for ReviewSession component
 */
export type ReviewSessionProps = {
	selectedRule: ReviewRule
	currentIndex: number
	onIndexChange: (index: number | ((prev: number) => number)) => void
	onStop: () => void
}

/**
 * Props for ReviewSessionHeader component
 */
export type ReviewSessionHeaderProps = {
	ruleLabel: string
	currentIndex: number
	totalInQueue: number
	reviewedToday: number
	onStop: () => void
}

/**
 * Props for ReviewProgressBar component
 */
export type ReviewProgressBarProps = {
	currentIndex: number
	totalInQueue: number
}

/**
 * Props for ReviewEmptyState component
 */
export type ReviewEmptyStateProps = {
	selectedRule: ReviewRule
	ruleLabel: string
	onStop: () => void
}

/**
 * Props for ReviewDashboard component
 */
export type ReviewDashboardProps = {
	onStartReview: (rule: ReviewRule) => void
}

/**
 * Props for StatsContent component
 */
export type StatsContentProps = {
	isLoading: boolean
	isError: boolean
	errorMessage?: string
	onRetry: () => void
	stats?: {
		reviewedToday: number
		totalEntries: number
		starredEntries: number
		unreviewedEntries: number
		streak: number
	}
	dueStats?: {
		overdue: number
		dueToday: number
		upcoming: number
		newCount: number
	}
}

/**
 * Props for StatsCard component
 */
export type StatsCardProps = {
	value: number
	description: string
	icon: import('@hugeicons/react').IconSvgElement
	iconColor?: string
}

/**
 * Props for ReviewCard component
 */
export type ReviewCardProps = {
	entry: Entry
	onRate: (rating: Rating) => void
	onSkip: () => void
	onSnooze: (preset: SnoozePreset) => void
	isLoading: boolean
}

/**
 * Props for RatingButtons component
 */
export type RatingButtonsProps = {
	onRate: (rating: Rating) => void
	isLoading: boolean
}

/**
 * Props for SnoozeDropdown component
 */
export type SnoozeDropdownProps = {
	onSnooze: (preset: SnoozePreset) => void
	disabled: boolean
}

/**
 * Rating button configuration
 */
export type RatingButtonConfig = {
	key: Rating
	labelKey: string
	hintKey: string
	variant: 'destructive' | 'outline' | 'default'
	className?: string
}

/**
 * Snooze preset configuration
 */
export type SnoozePresetConfig = {
	key: SnoozePreset
	labelKey: string
}
