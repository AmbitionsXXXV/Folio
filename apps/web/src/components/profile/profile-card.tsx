import { formatUserNo, getDaysSince } from '@folionote/constants'
import {
	Calendar03Icon,
	Edit02Icon,
	UserAccountIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { AvatarUploader, type AvatarUploaderRef } from '@/components/avatar-uploader'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useAvatarState } from '@/hooks/use-avatar-state'

/**
 * Profile card component displaying user avatar and information
 */
export function ProfileCard() {
	const { t } = useTranslation()
	const avatarUploaderRef = useRef<AvatarUploaderRef>(null)
	const {
		currentImageUrl,
		setLocalImageUrl: onLocalImageUrlChange,
		user,
	} = useAvatarState()

	return (
		<Card className="mb-6 bg-radial-[at_50%_100%] from-[#A78BFA] via-[#DDD6FE] to-[#E9D5FF] dark:from-[#C0AAFD] dark:via-[#1E1B4B] dark:to-[#05040A]">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<HugeiconsIcon className="size-5" icon={UserAccountIcon} />
					{t('profile.settings')}
				</CardTitle>
				<CardDescription className="text-pretty">
					{t('profile.avatarHelp')}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col items-center gap-8">
					{/* Avatar Section */}
					<div className="flex aspect-square flex-col items-center gap-4">
						<div className="flex items-center justify-center rounded-full bg-white p-1 shadow-xl">
							<AvatarUploader
								avatarClassName="size-24!"
								currentImageUrl={currentImageUrl}
								onAvatarChange={onLocalImageUrlChange}
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
							<span className="truncate text-muted-foreground">{user?.email}</span>
						</div>

						{/* Founding Member */}
						{user?.no && (
							<div className="flex items-center justify-between rounded-lg p-3">
								<span className="text-muted-foreground text-sm">
									{t('profile.foundingMember')}
								</span>
								<span className="rounded bg-muted px-1.5 py-0.5 font-number font-semibold text-lg text-primary tabular-nums dark:bg-transparent">
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
												<span className="font-number font-semibold text-lg text-primary tabular-nums" />
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
	)
}
