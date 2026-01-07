import BottomSheet, {
	BottomSheetBackdrop,
	type BottomSheetBackdropProps,
	BottomSheetScrollView,
	BottomSheetTextInput,
} from '@gorhom/bottom-sheet'
import {
	Cancel01Icon,
	LockPasswordIcon,
	SquareUnlock01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react-native'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useThemeColor } from 'heroui-native'
import {
	forwardRef,
	useCallback,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, Text, View } from 'react-native'
import { client, orpc, queryClient } from '@/utils/orpc'

type EntryPasswordSheetProps = {
	entryId: string
}

export type EntryPasswordSheetRef = {
	open: () => void
	close: () => void
}

/**
 * EntryPasswordSheet component for managing password protection on Native
 */
export const EntryPasswordSheet = forwardRef<
	EntryPasswordSheetRef,
	EntryPasswordSheetProps
>(({ entryId }, ref) => {
	const { t } = useTranslation()
	const bottomSheetRef = useRef<BottomSheet>(null)

	// Theme colors
	const foregroundColor = useThemeColor('foreground')
	const mutedColor = useThemeColor('muted')
	const accentColor = useThemeColor('accent')
	const surfaceColor = useThemeColor('surface')
	const warningColor = useThemeColor('warning')

	// Form state
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')

	// Snap points
	const snapPoints = useMemo(() => ['50%'], [])

	// Expose ref methods
	useImperativeHandle(ref, () => ({
		open: () => {
			setPassword('')
			setConfirmPassword('')
			bottomSheetRef.current?.expand()
		},
		close: () => bottomSheetRef.current?.close(),
	}))

	// Check if entry has password
	const { data: passwordStatus, refetch: refetchStatus } = useQuery(
		orpc.entries.checkPassword.queryOptions({ input: { id: entryId } })
	)

	// Set password mutation
	const setPasswordMutation = useMutation({
		mutationFn: (newPassword: string) =>
			client.entries.setPassword({ id: entryId, password: newPassword }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['entry-password', entryId] })
			queryClient.invalidateQueries({ queryKey: ['entries', entryId] })
			refetchStatus()
			Alert.alert(t('common.success'), t('privacy.passwordSet'))
			bottomSheetRef.current?.close()
		},
		onError: () => {
			Alert.alert(t('common.error'), t('privacy.setPasswordError'))
		},
	})

	// Remove password mutation
	const removePasswordMutation = useMutation({
		mutationFn: () => client.entries.removePassword({ id: entryId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['entry-password', entryId] })
			queryClient.invalidateQueries({ queryKey: ['entries', entryId] })
			refetchStatus()
			Alert.alert(t('common.success'), t('privacy.passwordRemoved'))
			bottomSheetRef.current?.close()
		},
		onError: () => {
			Alert.alert(t('common.error'), t('privacy.removePasswordError'))
		},
	})

	// Handle set password
	const handleSetPassword = useCallback(() => {
		if (password.length >= 4 && password === confirmPassword) {
			setPasswordMutation.mutate(password)
		}
	}, [password, confirmPassword, setPasswordMutation])

	// Handle remove password
	const handleRemovePassword = useCallback(() => {
		Alert.alert(t('privacy.removePassword'), t('privacy.removeConfirm'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('common.confirm'),
				style: 'destructive',
				onPress: () => removePasswordMutation.mutate(),
			},
		])
	}, [removePasswordMutation, t])

	const passwordsMatch = password === confirmPassword
	const isValidPassword = password.length >= 4

	// Render backdrop
	const renderBackdrop = useCallback(
		(props: BottomSheetBackdropProps) => (
			<BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
		),
		[]
	)

	return (
		<BottomSheet
			backdropComponent={renderBackdrop}
			backgroundStyle={{ backgroundColor: surfaceColor }}
			enablePanDownToClose
			handleIndicatorStyle={{ backgroundColor: mutedColor }}
			index={-1}
			ref={bottomSheetRef}
			snapPoints={snapPoints}
		>
			<BottomSheetScrollView
				contentContainerStyle={{ padding: 16 }}
				style={{ flex: 1 }}
			>
				{/* Header */}
				<View className="mb-4 flex-row items-center justify-between">
					<View className="flex-row items-center gap-2">
						<HugeiconsIcon
							color={foregroundColor}
							icon={LockPasswordIcon}
							size={24}
						/>
						<Text className="font-semibold text-foreground text-lg">
							{t('privacy.title')}
						</Text>
					</View>
					<Pressable onPress={() => bottomSheetRef.current?.close()}>
						<HugeiconsIcon color={mutedColor} icon={Cancel01Icon} size={24} />
					</Pressable>
				</View>

				{/* Content */}
				{passwordStatus?.hasPassword ? (
					// Entry has password
					<View>
						{/* Status indicator */}
						<View
							className="mb-4 flex-row items-center gap-2 rounded-lg p-3"
							style={{ backgroundColor: `${warningColor}20` }}
						>
							<HugeiconsIcon
								color={warningColor}
								icon={LockPasswordIcon}
								size={20}
							/>
							<Text style={{ color: warningColor }}>
								{t('privacy.currentlyProtected')}
							</Text>
						</View>

						{/* New password input */}
						<Text className="mb-2 text-foreground text-sm">
							{t('privacy.newPassword')}
						</Text>
						<BottomSheetTextInput
							autoCapitalize="none"
							className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
							onChangeText={setPassword}
							placeholder={t('privacy.passwordPlaceholder')}
							placeholderTextColor={mutedColor}
							secureTextEntry
							value={password}
						/>

						{password.length > 0 && (
							<>
								<Text className="mb-2 text-foreground text-sm">
									{t('privacy.confirmPassword')}
								</Text>
								<BottomSheetTextInput
									autoCapitalize="none"
									className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
									onChangeText={setConfirmPassword}
									placeholder={t('privacy.confirmPlaceholder')}
									placeholderTextColor={mutedColor}
									secureTextEntry
									value={confirmPassword}
								/>
								{confirmPassword.length > 0 && !passwordsMatch && (
									<Text className="mb-3 text-danger text-sm">
										{t('privacy.passwordMismatch')}
									</Text>
								)}
							</>
						)}

						{/* Action buttons */}
						<View className="mt-4 flex-row gap-3">
							<Pressable
								className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-border py-3"
								disabled={removePasswordMutation.isPending}
								onPress={handleRemovePassword}
							>
								<HugeiconsIcon
									color={foregroundColor}
									icon={SquareUnlock01Icon}
									size={20}
								/>
								<Text className="font-semibold text-foreground">
									{t('privacy.removePassword')}
								</Text>
							</Pressable>
							<Pressable
								className="flex-1 flex-row items-center justify-center gap-2 rounded-lg py-3"
								disabled={
									!(isValidPassword && passwordsMatch) ||
									setPasswordMutation.isPending
								}
								onPress={handleSetPassword}
								style={{
									backgroundColor: accentColor,
									opacity:
										!(isValidPassword && passwordsMatch) ||
										setPasswordMutation.isPending
											? 0.5
											: 1,
								}}
							>
								<HugeiconsIcon color="white" icon={LockPasswordIcon} size={20} />
								<Text className="font-semibold text-white">
									{t('privacy.changePassword')}
								</Text>
							</Pressable>
						</View>
					</View>
				) : (
					// Entry has no password
					<View>
						<Text className="mb-4 text-muted">{t('privacy.setDescription')}</Text>

						{/* Password input */}
						<Text className="mb-2 text-foreground text-sm">
							{t('privacy.password')}
						</Text>
						<BottomSheetTextInput
							autoCapitalize="none"
							className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
							onChangeText={setPassword}
							placeholder={t('privacy.passwordPlaceholder')}
							placeholderTextColor={mutedColor}
							secureTextEntry
							value={password}
						/>
						{password.length > 0 && password.length < 4 && (
							<Text className="mb-3 text-muted text-sm">
								{t('privacy.minLength')}
							</Text>
						)}

						{password.length >= 4 && (
							<>
								<Text className="mb-2 text-foreground text-sm">
									{t('privacy.confirmPassword')}
								</Text>
								<BottomSheetTextInput
									autoCapitalize="none"
									className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
									onChangeText={setConfirmPassword}
									placeholder={t('privacy.confirmPlaceholder')}
									placeholderTextColor={mutedColor}
									secureTextEntry
									value={confirmPassword}
								/>
								{confirmPassword.length > 0 && !passwordsMatch && (
									<Text className="mb-3 text-danger text-sm">
										{t('privacy.passwordMismatch')}
									</Text>
								)}
							</>
						)}

						{/* Set password button */}
						<Pressable
							className="mt-4 flex-row items-center justify-center gap-2 rounded-lg py-3"
							disabled={
								!(isValidPassword && passwordsMatch) || setPasswordMutation.isPending
							}
							onPress={handleSetPassword}
							style={{
								backgroundColor: accentColor,
								opacity:
									!(isValidPassword && passwordsMatch) ||
									setPasswordMutation.isPending
										? 0.5
										: 1,
							}}
						>
							<HugeiconsIcon color="white" icon={LockPasswordIcon} size={20} />
							<Text className="font-semibold text-white">
								{t('privacy.setPassword')}
							</Text>
						</Pressable>
					</View>
				)}
			</BottomSheetScrollView>
		</BottomSheet>
	)
})

EntryPasswordSheet.displayName = 'EntryPasswordSheet'
