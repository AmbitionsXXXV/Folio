import { LANGUAGE_LABELS } from '@folionote/constants'
import { type SupportedLanguage, supportedLanguages } from '@folionote/locales'
import {
	LanguageCircleIcon,
	Logout03Icon,
	Moon02Icon,
	MoreVerticalIcon,
	Settings01Icon,
	Sun03Icon,
	UserCircle02Icon,
	UserCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

type UserMenuProps = {
	collapsed?: boolean
	/** Dropdown menu position side, defaults to 'top' for sidebar, 'bottom' for mobile */
	side?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Get initials from a name string
 */
function getInitials(name?: string | null): string {
	if (!name) return ''
	return name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

function UserAvatar({
	size = 'sm',
	imageUrl,
	userName,
}: {
	size?: 'sm' | 'md'
	imageUrl?: string | null
	userName?: string | null
}) {
	const sizeClass = size === 'md' ? 'size-10' : 'size-8'
	const iconSize = size === 'md' ? 'size-6' : 'size-5'

	return (
		<Avatar className={cn('rounded-full', sizeClass)}>
			{imageUrl ? <AvatarImage alt={userName || 'Avatar'} src={imageUrl} /> : null}
			<AvatarFallback className="bg-primary/10 text-primary">
				{userName ? (
					<span className="font-medium text-xs">{getInitials(userName)}</span>
				) : (
					<HugeiconsIcon className={iconSize} icon={UserCircleIcon} />
				)}
			</AvatarFallback>
		</Avatar>
	)
}

function LanguageSubmenu() {
	const { t, i18n } = useTranslation()
	const currentLanguage = i18n.language as SupportedLanguage

	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger>
				<HugeiconsIcon className="mr-2 size-4" icon={LanguageCircleIcon} />
				<span>{t('common.language')}</span>
			</DropdownMenuSubTrigger>
			<DropdownMenuPortal>
				<DropdownMenuSubContent>
					{supportedLanguages.map((lang) => (
						<DropdownMenuItem key={lang} onClick={() => i18n.changeLanguage(lang)}>
							<span className={currentLanguage === lang ? 'font-medium' : ''}>
								{LANGUAGE_LABELS[lang] || lang}
							</span>
							{currentLanguage === lang && (
								<span className="ml-auto text-primary">✓</span>
							)}
						</DropdownMenuItem>
					))}
				</DropdownMenuSubContent>
			</DropdownMenuPortal>
		</DropdownMenuSub>
	)
}

function ThemeSubmenu() {
	const { t } = useTranslation()
	const { theme, setTheme, resolvedTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	// 使用 resolvedTheme 来显示图标，避免 hydration 问题
	const currentTheme = mounted ? resolvedTheme : 'light'

	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger>
				{currentTheme === 'dark' ? (
					<HugeiconsIcon className="mr-2 size-4" icon={Moon02Icon} />
				) : (
					<HugeiconsIcon className="mr-2 size-4" icon={Sun03Icon} />
				)}
				<span>{t('common.theme')}</span>
			</DropdownMenuSubTrigger>
			<DropdownMenuPortal>
				<DropdownMenuSubContent>
					<DropdownMenuItem onClick={() => setTheme('light')}>
						<HugeiconsIcon className="mr-2 size-4" icon={Sun03Icon} />
						<span className={theme === 'light' ? 'font-medium' : ''}>
							{t('common.themeLight')}
						</span>
						{theme === 'light' && <span className="ml-auto text-primary">✓</span>}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme('dark')}>
						<HugeiconsIcon className="mr-2 size-4" icon={Moon02Icon} />
						<span className={theme === 'dark' ? 'font-medium' : ''}>
							{t('common.themeDark')}
						</span>
						{theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme('system')}>
						<span className={theme === 'system' ? 'font-medium' : ''}>
							{t('common.themeSystem')}
						</span>
						{theme === 'system' && <span className="ml-auto text-primary">✓</span>}
					</DropdownMenuItem>
				</DropdownMenuSubContent>
			</DropdownMenuPortal>
		</DropdownMenuSub>
	)
}

function SettingsSubmenu() {
	const { t } = useTranslation()

	return (
		<DropdownMenuSub>
			<DropdownMenuSubTrigger>
				<HugeiconsIcon className="mr-2 size-4" icon={Settings01Icon} />
				<span>{t('common.settings')}</span>
			</DropdownMenuSubTrigger>
			<DropdownMenuPortal>
				<DropdownMenuSubContent>
					<DropdownMenuGroup>
						<DropdownMenuLabel>{t('common.settings')}</DropdownMenuLabel>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<LanguageSubmenu />
					<ThemeSubmenu />
				</DropdownMenuSubContent>
			</DropdownMenuPortal>
		</DropdownMenuSub>
	)
}

function UserMenuTrigger({
	collapsed,
	userName,
	userEmail,
	imageUrl,
}: {
	collapsed: boolean
	userName: string
	userEmail: string
	imageUrl?: string | null
}) {
	return (
		<div
			className={cn(
				'inline-flex w-full cursor-pointer items-center justify-start gap-3 rounded-md p-2 font-medium text-sm outline-none transition-all hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
				collapsed && 'size-10 justify-center p-0'
			)}
		>
			<UserAvatar imageUrl={imageUrl} size="sm" userName={userName} />
			{!collapsed && (
				<>
					<div className="flex min-w-0 flex-1 flex-col items-start text-left">
						<span className="truncate font-medium text-sm">{userName}</span>
						<span className="truncate text-muted-foreground text-xs">
							{userEmail}
						</span>
					</div>
					<HugeiconsIcon
						className="size-4 shrink-0 text-muted-foreground"
						icon={MoreVerticalIcon}
					/>
				</>
			)}
		</div>
	)
}

function UserMenuHeader({
	userName,
	userEmail,
	imageUrl,
}: {
	userName: string
	userEmail: string
	imageUrl?: string | null
}) {
	return (
		<div className="flex items-center gap-3 px-2 py-2">
			<UserAvatar imageUrl={imageUrl} size="md" userName={userName} />
			<div className="flex min-w-0 flex-col">
				<span className="truncate font-medium text-sm">{userName}</span>
				<span className="truncate text-muted-foreground text-xs">{userEmail}</span>
			</div>
		</div>
	)
}

/**
 * Render a user account menu that displays a loading placeholder, a sign-in link when unauthenticated, or a dropdown with account details and a sign-out action when authenticated.
 */
export default function UserMenu({ collapsed = false, side }: UserMenuProps) {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { data: session, isPending } = authClient.useSession()

	if (isPending) {
		return (
			<div className={cn('p-2', collapsed && 'flex justify-center')}>
				<Skeleton className={cn('h-10', collapsed ? 'w-10' : 'h-12 w-full')} />
			</div>
		)
	}

	if (!session) {
		return (
			<div className={cn('p-2', collapsed && 'flex justify-center')}>
				<Link to="/login">
					<Button
						className={cn(collapsed && 'size-10 p-0')}
						size={collapsed ? 'icon' : 'default'}
						variant="outline"
					>
						{collapsed ? (
							<HugeiconsIcon className="size-5" icon={UserCircleIcon} />
						) : (
							t('auth.signIn')
						)}
					</Button>
				</Link>
			</div>
		)
	}

	const handleSignOut = async () => {
		// 首先撤销所有其他session，确保彻底登出
		try {
			await authClient.revokeSessions()
		} catch (error) {
			console.warn('Failed to revoke sessions:', error)
		}

		// 然后执行标准的signOut
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					navigate({ to: '/' })
				},
			},
		})
	}

	// Default side: 'top' for sidebar (non-collapsed), 'bottom' for mobile (collapsed)
	const menuSide = side ?? (collapsed ? 'bottom' : 'top')

	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<UserMenuTrigger
					collapsed={collapsed}
					imageUrl={session.user.image}
					userEmail={session.user.email}
					userName={session.user.name}
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-56"
				side={menuSide}
				sideOffset={8}
			>
				<UserMenuHeader
					imageUrl={session.user.image}
					userEmail={session.user.email}
					userName={session.user.name}
				/>

				<DropdownMenuSeparator />

				<DropdownMenuItem>
					<Link className="flex w-full items-center gap-2" to="/profile">
						<HugeiconsIcon className="mr-2 size-4" icon={UserCircle02Icon} />
						{t('nav.profile', 'Profile')}
					</Link>
				</DropdownMenuItem>

				<SettingsSubmenu />

				<DropdownMenuSeparator />

				<DropdownMenuItem onClick={handleSignOut} variant="destructive">
					<HugeiconsIcon className="mr-2 size-4" icon={Logout03Icon} />
					{t('auth.signOut')}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
