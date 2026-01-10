import { formatUserNo, getDaysSince, LANGUAGE_LABELS } from '@folionote/constants'
import { type SupportedLanguage, supportedLanguages } from '@folionote/locales'
import {
	Alert01Icon,
	Calendar03Icon,
	ComputerIcon,
	Edit02Icon,
	LanguageCircleIcon,
	Logout03Icon,
	Moon02Icon,
	Sun03Icon,
	UserAccountIcon,
	UserCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { AvatarUploader, type AvatarUploaderRef } from '@/components/avatar-uploader'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useAvatarState } from '@/hooks/use-avatar-state'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/_app/profile')({
	component: ProfilePage,
})

function ProfilePage() {
	const { t, i18n } = useTranslation()
	const { theme, setTheme } = useTheme()
	const [mounted, setMounted] = useState(false)
	const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)
	const { currentImageUrl, setLocalImageUrl, user } = useAvatarState()
	const avatarUploaderRef = useRef<AvatarUploaderRef>(null)
	const router = useRouter()

	// Avoid hydration mismatch
	useEffect(() => {
		setMounted(true)
	}, [])

	const handleSignOut = async () => {
		await authClient.signOut()
		router.navigate({ to: '/', reloadDocument: true })
	}

	return (
		<div className="container mx-auto max-w-3xl px-4 py-8">
			{/* Page Header */}
			<div className="mb-8">
				<h1 className="mb-1 flex items-center gap-2 font-bold text-2xl">
					<HugeiconsIcon className="size-7" icon={UserCircleIcon} />
					{t('profile.title')}
				</h1>
				<p className="text-muted-foreground">{t('profile.settingsDescription')}</p>
			</div>

			{/* Profile Card */}
			<Card className="mb-6 bg-radial-[at_50%_100%] from-[#A78BFA] via-[#DDD6FE] to-[#E9D5FF] dark:from-[#C0AAFD] dark:via-[#1E1B4B] dark:to-[#05040A]">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HugeiconsIcon className="size-5" icon={UserAccountIcon} />
						{t('profile.settings')}
					</CardTitle>
					<CardDescription>{t('profile.avatarHelp')}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center gap-8">
						{/* Avatar Section */}
						<div className="flex aspect-square flex-col items-center gap-4">
							<div className="flex items-center justify-center rounded-full bg-white p-1 shadow-xl">
								<AvatarUploader
									avatarClassName="size-24!"
									currentImageUrl={currentImageUrl}
									onAvatarChange={setLocalImageUrl}
									ref={avatarUploaderRef}
									size="lg"
									userName={user?.name}
								/>
							</div>
							<Button
								className="rounded-full shadow-xl"
								onClick={() => avatarUploaderRef.current?.open()}
								size="sm"
								variant="outline"
							>
								<HugeiconsIcon className="mr-2 size-4" icon={Edit02Icon} />
								{t('profile.editPhoto')}
							</Button>
						</div>

						{/* Info Section */}
						<div className="w-full space-y-1">
							{/* Name */}
							<div className="flex items-center justify-between rounded-lg p-3">
								<span className="text-muted-foreground text-sm">
									{t('profile.name')}
								</span>
								<span className="font-bold font-display text-black text-lg text-shadow-[-1px_-1px_0_#fff,1px_-1px_0_#fff,-1px_1px_0_#fff,1px_1px_0_#fff]">
									{user?.name}
								</span>
							</div>

							{/* Email */}
							<div className="flex items-center justify-between rounded-lg p-3">
								<span className="text-muted-foreground text-sm">Email</span>
								<span className="text-muted-foreground">{user?.email}</span>
							</div>

							{/* Founding Member */}
							{user?.no && (
								<div className="flex items-center justify-between rounded-lg p-3">
									<span className="text-muted-foreground text-sm">
										{t('profile.foundingMember')}
									</span>
									<span className="rounded bg-muted px-1.5 py-0.5 font-number font-semibold text-lg text-primary dark:bg-transparent">
										No.{formatUserNo(user.no)}
									</span>
								</div>
							)}

							{/* Joined */}
							<div className="flex items-center justify-between rounded-lg p-3">
								<span className="text-muted-foreground text-sm">
									{t('profile.joined')}
								</span>
								<div className="flex items-center gap-1.5 text-sm">
									<HugeiconsIcon
										className="size-4 text-muted-foreground"
										icon={Calendar03Icon}
									/>
									<span className="text-muted-foreground">
										<Trans
											components={{
												1: (
													<span className="font-number font-semibold text-lg text-primary" />
												),
											}}
											i18nKey="profile.joinedDays"
											values={{ count: getDaysSince(user?.createdAt) }}
										/>
									</span>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Appearance Settings */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HugeiconsIcon className="size-5" icon={Moon02Icon} />
						{t('profile.appearance')}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Theme Selection */}
					<div className="flex items-center justify-between">
						<Label htmlFor="theme">{t('common.theme')}</Label>
						<Select
							onValueChange={(value) => value && setTheme(value)}
							value={mounted ? theme : 'system'}
						>
							<SelectTrigger className="w-40" id="theme">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="light">
									<div className="flex items-center gap-2">
										<HugeiconsIcon className="size-4" icon={Sun03Icon} />
										{t('common.themeLight')}
									</div>
								</SelectItem>
								<SelectItem value="dark">
									<div className="flex items-center gap-2">
										<HugeiconsIcon className="size-4" icon={Moon02Icon} />
										{t('common.themeDark')}
									</div>
								</SelectItem>
								<SelectItem value="system">
									<div className="flex items-center gap-2">
										<HugeiconsIcon className="size-4" icon={ComputerIcon} />
										{t('common.themeSystem')}
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Language & Region */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HugeiconsIcon className="size-5" icon={LanguageCircleIcon} />
						{t('profile.languageAndRegion')}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Language Selection */}
					<div className="flex items-center justify-between">
						<Label htmlFor="language">{t('common.language')}</Label>
						<Select
							onValueChange={(value) => value && i18n.changeLanguage(value)}
							value={i18n.language as SupportedLanguage}
						>
							<SelectTrigger className="w-40" id="language">
								<SelectValue>
									{LANGUAGE_LABELS[i18n.language as SupportedLanguage] ||
										i18n.language}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{supportedLanguages.map((lang) => (
									<SelectItem key={lang} value={lang}>
										{LANGUAGE_LABELS[lang] || lang}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Danger Zone */}
			<Card className="border-destructive/50">
				<CardHeader>
					<CardTitle className="text-destructive">
						{t('profile.dangerZone')}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Sign Out All Devices */}
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="font-medium">{t('profile.signOutAllDevices')}</p>
							<p className="text-muted-foreground text-sm">
								{t('profile.signOutAllDevicesDescription')}
							</p>
						</div>
						<Button onClick={() => setSignOutDialogOpen(true)} variant="outline">
							{t('auth.signOut')}
						</Button>
					</div>

					{/* Sign Out Confirmation Dialog */}
					<AlertDialog onOpenChange={setSignOutDialogOpen} open={signOutDialogOpen}>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle className="flex items-center gap-2">
									<HugeiconsIcon
										className="size-5 text-destructive"
										icon={Alert01Icon}
									/>
									{t('profile.signOutConfirmTitle')}
								</AlertDialogTitle>
								<AlertDialogDescription>
									{t('profile.signOutConfirmDescription')}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
								<AlertDialogAction onClick={handleSignOut} variant="destructive">
									<HugeiconsIcon className="mr-2 size-4" icon={Logout03Icon} />
									{t('auth.signOut')}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>

					<Separator />

					{/* Delete Account */}
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="font-medium">{t('profile.deleteAccount')}</p>
							<p className="text-muted-foreground text-sm">
								{t('profile.deleteAccountDescription')}
							</p>
						</div>
						<Button disabled variant="destructive">
							{t('profile.deleteAccount')}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
