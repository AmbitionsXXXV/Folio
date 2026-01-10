import { LANGUAGE_LABELS } from '@folionote/constants'
import { type SupportedLanguage, supportedLanguages } from '@folionote/locales'
import {
	Alert01Icon,
	Calendar03Icon,
	ComputerIcon,
	LanguageCircleIcon,
	Logout03Icon,
	Moon02Icon,
	Settings01Icon,
	Sun03Icon,
	UserCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AvatarUploader } from '@/components/avatar-uploader'
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

/**
 * Format date for display
 */
function formatDate(date: Date | string | undefined): string {
	if (!date) return '-'
	const d = typeof date === 'string' ? new Date(date) : date
	return new Intl.DateTimeFormat(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	}).format(d)
}

function ProfilePage() {
	const { t, i18n } = useTranslation()
	const { theme, setTheme } = useTheme()
	const [mounted, setMounted] = useState(false)
	const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)
	const { currentImageUrl, setLocalImageUrl, user } = useAvatarState()
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
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HugeiconsIcon className="size-5" icon={Settings01Icon} />
						{t('profile.settings')}
					</CardTitle>
					<CardDescription>{t('profile.avatarHelp')}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
						{/* Avatar Uploader */}
						<AvatarUploader
							avatarClassName="size-20!"
							currentImageUrl={currentImageUrl}
							onAvatarChange={setLocalImageUrl}
							size="lg"
							userName={user?.name}
						/>

						{/* User Info */}
						<div className="flex-1 text-center sm:text-left">
							<h3 className="font-semibold text-xl">{user?.name}</h3>
							<p className="mb-4 text-muted-foreground">{user?.email}</p>

							<div className="space-y-2 text-sm">
								<div className="flex items-center justify-center gap-2 sm:justify-start">
									<HugeiconsIcon
										className="size-4 text-muted-foreground"
										icon={Calendar03Icon}
									/>
									<span className="text-muted-foreground">
										{t('profile.memberSince')}:
									</span>
									<span>{formatDate(user?.createdAt)}</span>
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
						{t('profile.dangerZone', 'Danger Zone')}
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
