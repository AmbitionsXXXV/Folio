import type { Entry, Rating, ReviewRule, SnoozePreset } from "."

/**
 * Props for ReviewSession component
 */
export interface ReviewSessionProps {
  selectedRule: ReviewRule
  currentIndex: number
  onIndexChange: (index: number | ((prev: number) => number)) => void
  onStop: () => void
}

/**
 * Props for ReviewSessionHeader component
 */
export interface ReviewSessionHeaderProps {
  ruleLabel: string
  currentIndex: number
  totalInQueue: number
  reviewedToday: number
  onStop: () => void
}

/**
 * Props for ReviewProgressBar component
 */
export interface ReviewProgressBarProps {
  currentIndex: number
  totalInQueue: number
}

/**
 * Props for ReviewEmptyState component
 */
export interface ReviewEmptyStateProps {
  selectedRule: ReviewRule
  ruleLabel: string
  onStop: () => void
}

/**
 * Props for ReviewDashboard component
 */
export interface ReviewDashboardProps {
  onStartReview: (rule: ReviewRule) => void
}

/**
 * Props for StatsContent component
 */
export interface StatsContentProps {
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
export interface StatsCardProps {
  value: number
  description: string
  icon: import("@hugeicons/react").IconSvgElement
  iconColor?: string
}

/**
 * Props for ReviewCard component
 */
export interface ReviewCardProps {
  entry: Entry
  onRate: (rating: Rating) => void
  onSkip: () => void
  onSnooze: (preset: SnoozePreset) => void
  isLoading: boolean
}

/**
 * Props for RatingButtons component
 */
export interface RatingButtonsProps {
  onRate: (rating: Rating) => void
  isLoading: boolean
}

/**
 * Props for SnoozeDropdown component
 */
export interface SnoozeDropdownProps {
  onSnooze: (preset: SnoozePreset) => void
  disabled: boolean
}

/**
 * Rating button configuration
 */
export interface RatingButtonConfig {
  key: Rating
  labelKey: string
  hintKey: string
  variant: "destructive" | "outline" | "default"
  className?: string
}

/**
 * Snooze preset configuration
 */
export interface SnoozePresetConfig {
  key: SnoozePreset
  labelKey: string
}
