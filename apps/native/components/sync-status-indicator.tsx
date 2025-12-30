/**
 * Sync Status Indicator Component
 *
 * Displays current sync status with visual indicators.
 * Shows syncing animation, sync errors, conflicts, and offline state.
 */

import {
	Alert02Icon,
	CheckmarkCircle02Icon,
	CloudIcon,
	Loading03Icon,
	WifiDisconnected01Icon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react-native'
import { HugeiconsIcon } from '@hugeicons/react-native'
import { cn } from 'heroui-native'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, Pressable, Text, View } from 'react-native'
import { useSync } from '@/contexts/sync-context'

interface SyncStatusIndicatorProps {
	/**
	 * Size of the indicator icon
	 */
	size?: number
	/**
	 * Whether to show the label text
	 */
	showLabel?: boolean
	/**
	 * Whether tapping triggers a sync
	 */
	interactive?: boolean
}

export function SyncStatusIndicator({
	size = 20,
	showLabel = false,
	interactive = true,
}: SyncStatusIndicatorProps) {
	const { t } = useTranslation()
	const { syncState, isOnline, metadata, conflicts, sync } = useSync()

	const rotateAnim = useRef(new Animated.Value(0)).current

	// Rotate animation for syncing state
	useEffect(() => {
		if (syncState === 'syncing') {
			const animation = Animated.loop(
				Animated.timing(rotateAnim, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				})
			)
			animation.start()
			return () => animation.stop()
		}
		rotateAnim.setValue(0)
	}, [syncState, rotateAnim])

	const handlePress = useCallback(() => {
		if (interactive && syncState !== 'syncing' && isOnline) {
			sync()
		}
	}, [interactive, syncState, isOnline, sync])

	const spin = rotateAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '360deg'],
	})

	// Determine icon and color based on state
	const getStatusConfig = (): {
		icon: IconSvgElement
		color: string
		label: string
		animated?: boolean
	} => {
		if (!isOnline) {
			return {
				icon: WifiDisconnected01Icon,
				color: '#9CA3AF', // gray-400
				label: t('sync.offline'),
			}
		}

		if (syncState === 'syncing') {
			return {
				icon: Loading03Icon,
				color: '#3B82F6', // blue-500
				label: t('sync.syncing'),
				animated: true,
			}
		}

		if (syncState === 'conflict' || conflicts.length > 0) {
			return {
				icon: Alert02Icon,
				color: '#F59E0B', // amber-500
				label: t('sync.conflict'),
			}
		}

		if (syncState === 'error') {
			return {
				icon: Alert02Icon,
				color: '#EF4444', // red-500
				label: t('sync.error'),
			}
		}

		// Check pending operations
		if (metadata && metadata.pendingOperationsCount > 0) {
			return {
				icon: CloudIcon,
				color: '#F59E0B', // amber-500
				label: t('sync.pending', { count: metadata.pendingOperationsCount }),
			}
		}

		return {
			icon: CheckmarkCircle02Icon,
			color: '#10B981', // green-500
			label: t('sync.synced'),
		}
	}

	const config = getStatusConfig()

	const content = (
		<View className="flex-row items-center gap-2">
			{config.animated ? (
				<Animated.View style={{ transform: [{ rotate: spin }] }}>
					<HugeiconsIcon color={config.color} icon={config.icon} size={size} />
				</Animated.View>
			) : (
				<HugeiconsIcon color={config.color} icon={config.icon} size={size} />
			)}
			{showLabel && (
				<Text className="text-sm" style={{ color: config.color }}>
					{config.label}
				</Text>
			)}
		</View>
	)

	if (interactive && isOnline && syncState !== 'syncing') {
		return (
			<Pressable
				accessibilityLabel={config.label}
				accessibilityRole="button"
				className="rounded-lg p-2 active:bg-gray-100 dark:active:bg-gray-800"
				onPress={handlePress}
			>
				{content}
			</Pressable>
		)
	}

	return (
		<View accessibilityLabel={config.label} className="p-2">
			{content}
		</View>
	)
}

/**
 * Compact sync status badge for headers
 */
export function SyncStatusBadge() {
	const { syncState, isOnline, metadata, conflicts } = useSync()
	const { t } = useTranslation()

	// Only show badge when there's something notable
	if (
		isOnline &&
		syncState === 'idle' &&
		conflicts.length === 0 &&
		(!metadata || metadata.pendingOperationsCount === 0)
	) {
		return null
	}

	const getBadgeConfig = () => {
		if (!isOnline) {
			return {
				text: t('sync.offline'),
				bgColor: 'bg-gray-200 dark:bg-gray-700',
				textColor: 'text-gray-600 dark:text-gray-400',
			}
		}

		if (syncState === 'syncing') {
			return {
				text: t('sync.syncing'),
				bgColor: 'bg-blue-100 dark:bg-blue-900',
				textColor: 'text-blue-600 dark:text-blue-400',
			}
		}

		if (syncState === 'conflict' || conflicts.length > 0) {
			return {
				text: t('sync.conflictCount', { count: conflicts.length }),
				bgColor: 'bg-amber-100 dark:bg-amber-900',
				textColor: 'text-amber-600 dark:text-amber-400',
			}
		}

		if (syncState === 'error') {
			return {
				text: t('sync.error'),
				bgColor: 'bg-red-100 dark:bg-red-900',
				textColor: 'text-red-600 dark:text-red-400',
			}
		}

		if (metadata && metadata.pendingOperationsCount > 0) {
			return {
				text: t('sync.pendingCount', { count: metadata.pendingOperationsCount }),
				bgColor: 'bg-amber-100 dark:bg-amber-900',
				textColor: 'text-amber-600 dark:text-amber-400',
			}
		}

		return null
	}

	const config = getBadgeConfig()
	if (!config) return null

	return (
		<View className={cn('rounded-full px-2 py-1', config.bgColor)}>
			<Text className={cn('font-medium text-xs', config.textColor)}>
				{config.text}
			</Text>
		</View>
	)
}
