import { Add01Icon, MailOpen01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react-native'
import { FlashList } from '@shopify/flash-list'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Card, TextField, useThemeColor } from 'heroui-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native'
import { Container } from '@/components/container'
import { EntryCard } from '@/components/entry-card'
import { LocalModePlaceholder } from '@/components/local-mode-placeholder'
import { useLocalMode } from '@/contexts/local-mode-context'
import { authClient } from '@/lib/auth-client'
import { client, orpc, queryClient } from '@/utils/orpc'

type QuickCaptureProps = {
	onCapture: (value: string) => void
	isPending: boolean
}

function QuickCapture({ onCapture, isPending }: QuickCaptureProps) {
	const { t } = useTranslation()
	const [inputValue, setInputValue] = useState('')
	const foregroundColor = useThemeColor('foreground')

	const handleSubmit = () => {
		const trimmedValue = inputValue.trim()
		if (trimmedValue) {
			onCapture(trimmedValue)
			setInputValue('')
		}
	}

	return (
		<Card className="p-4" variant="secondary">
			<View className="flex-row items-center">
				<TextField className="mr-3 flex-1">
					<TextField.Input
						onChangeText={setInputValue}
						onSubmitEditing={handleSubmit}
						placeholder={t('entry.quickCapture')}
						returnKeyType="done"
						value={inputValue}
					/>
				</TextField>
				<Button
					className="size-12 items-center justify-center bg-accent active:opacity-70"
					isDisabled={!inputValue.trim() || isPending}
					onPress={handleSubmit}
					style={{
						opacity: !inputValue.trim() || isPending ? 0.5 : 1,
					}}
				>
					{isPending ? (
						<ActivityIndicator color={foregroundColor} size="small" />
					) : (
						<HugeiconsIcon color={foregroundColor} icon={Add01Icon} size={24} />
					)}
				</Button>
			</View>
		</Card>
	)
}

export default function InboxScreen() {
	const { t } = useTranslation()
	const { data: session } = authClient.useSession()
	const { isLocalMode } = useLocalMode()
	const mutedColor = useThemeColor('muted')
	const accentColor = useThemeColor('accent')

	// Fetch inbox entries (only when authenticated)
	const { data, isLoading, isRefetching, refetch } = useQuery({
		...orpc.entries.list.queryOptions({ input: { filter: 'inbox', limit: 50 } }),
		enabled: !!session?.user,
	})

	// Create entry mutation - must be called before any early returns
	const createEntryMutation = useMutation({
		mutationFn: (title: string) => client.entries.create({ title, isInbox: true }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['entries', 'list'] })
		},
	})

	// Show local mode placeholder for unauthenticated users in local mode
	if (!session?.user && isLocalMode) {
		return <LocalModePlaceholder />
	}

	// This shouldn't happen but handle edge case
	if (!session?.user) {
		return <LocalModePlaceholder />
	}

	const handleCapture = (text: string) => {
		createEntryMutation.mutate(text)
	}

	const entries = data?.items ?? []

	if (isLoading) {
		return (
			<Container className="flex-1 items-center justify-center" disableTopInset>
				<ActivityIndicator color={accentColor} size="large" />
			</Container>
		)
	}

	return (
		<Container className="flex-1" disableScroll>
			<FlashList
				contentContainerStyle={{
					paddingHorizontal: 16,
					// paddingBottom: 16,
					// paddingTop: headerHeight + 8,
				}}
				data={entries}
				ItemSeparatorComponent={() => <View className="h-3" />}
				keyExtractor={(item) => item.id}
				ListEmptyComponent={() => (
					<View className="flex-1 items-center justify-center py-20">
						<HugeiconsIcon color={mutedColor} icon={MailOpen01Icon} size={64} />
						<Text className="mt-4 text-center text-lg text-muted">
							{t('entry.emptyInbox')}
						</Text>
						<Text className="mt-2 px-8 text-center text-muted text-sm">
							{t('home.actionDescription.newEntry')}
						</Text>
					</View>
				)}
				ListHeaderComponent={() => (
					<View className="mb-4">
						<QuickCapture
							isPending={createEntryMutation.isPending}
							onCapture={handleCapture}
						/>

						{entries.length > 0 && (
							<Text className="mt-4 text-muted text-sm">
								{t('entry.count', { count: entries.length })}
							</Text>
						)}
					</View>
				)}
				refreshControl={
					<RefreshControl
						onRefresh={refetch}
						refreshing={isRefetching}
						tintColor={accentColor}
					/>
				}
				renderItem={({ item }) => <EntryCard entry={item} />}
			/>
		</Container>
	)
}
