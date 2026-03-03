import { Tooltip, TooltipContent, TooltipTrigger } from '@folionote/ui/tooltip'
import {
	AccountSetting01Icon,
	AiBeautifyIcon,
	ArrowLeft02Icon,
	ArrowRight02Icon,
	Settings02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

type SettingsNavItem = {
	id: string
	labelKey: string
	descriptionKey: string
	icon: typeof Settings02Icon
	to: string
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
	{
		id: 'general',
		labelKey: 'settings.nav.general',
		descriptionKey: 'settings.nav.generalDesc',
		icon: AccountSetting01Icon,
		to: '/settings/general',
	},
	{
		id: 'models',
		labelKey: 'settings.nav.models',
		descriptionKey: 'settings.nav.modelsDesc',
		icon: AiBeautifyIcon,
		to: '/settings/models',
	},
]

/**
 * Collapsible settings sidebar navigation (desktop)
 */
export function SettingsSidebar() {
	const { t } = useTranslation()
	const matchRoute = useMatchRoute()
	const [isCollapsed, setIsCollapsed] = useState(false)

	return (
		<aside
			className={cn(
				'flex h-full shrink-0 flex-col border-r bg-sidebar transition-all duration-300 ease-in-out',
				isCollapsed ? 'w-16' : 'w-64'
			)}
		>
			{/* Header */}
			<div
				className={cn(
					'flex h-14 items-center border-b transition-all duration-300',
					isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'
				)}
			>
				<HugeiconsIcon
					className="size-5 shrink-0 text-primary"
					icon={Settings02Icon}
				/>
				{!isCollapsed && (
					<div className="flex-1 overflow-hidden">
						<h2 className="truncate font-semibold text-sm">{t('settings.title')}</h2>
						<p className="truncate text-muted-foreground text-xs">
							{t('settings.subtitle')}
						</p>
					</div>
				)}
			</div>

			{/* Navigation */}
			<nav className="flex-1 overflow-y-auto p-2">
				{!isCollapsed && (
					<div className="mb-2 px-2">
						<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							{t('settings.nav.menu')}
						</span>
					</div>
				)}
				<ul className="flex flex-col gap-1">
					{SETTINGS_NAV_ITEMS.map((item) => {
						const isActive = matchRoute({ to: item.to, fuzzy: true })

						if (isCollapsed) {
							return (
								<li key={item.id}>
									<Tooltip>
										<TooltipTrigger
											render={
												<Link
													className={cn(
														'relative flex size-10 items-center justify-center rounded-lg transition-colors',
														'hover:bg-accent/50',
														'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
														isActive && 'bg-accent'
													)}
													to={item.to}
												/>
											}
										>
											{isActive && (
												<span className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
											)}
											<HugeiconsIcon
												className={cn(
													'size-5',
													isActive ? 'text-primary' : 'text-muted-foreground'
												)}
												icon={item.icon}
											/>
										</TooltipTrigger>
										<TooltipContent side="right" sideOffset={8}>
											<p className="font-medium">{t(item.labelKey)}</p>
											<p className="text-muted-foreground text-xs">
												{t(item.descriptionKey)}
											</p>
										</TooltipContent>
									</Tooltip>
								</li>
							)
						}

						return (
							<li key={item.id}>
								<Link
									className={cn(
										'relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
										'hover:bg-accent/50',
										'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
										isActive && 'bg-accent'
									)}
									to={item.to}
								>
									{isActive && (
										<span className="absolute top-1/2 left-0 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
									)}
									<HugeiconsIcon
										className={cn(
											'size-5 shrink-0',
											isActive ? 'text-primary' : 'text-muted-foreground'
										)}
										icon={item.icon}
									/>
									<div className="flex-1 overflow-hidden">
										<span
											className={cn(
												'block truncate text-sm',
												isActive
													? 'font-medium text-foreground'
													: 'text-muted-foreground'
											)}
										>
											{t(item.labelKey)}
										</span>
										<span className="block truncate text-muted-foreground/70 text-xs">
											{t(item.descriptionKey)}
										</span>
									</div>
								</Link>
							</li>
						)
					})}
				</ul>
			</nav>

			{/* Collapse toggle */}
			<div className="border-t p-2">
				<Tooltip>
					<TooltipTrigger
						className={cn(
							'flex w-full items-center justify-center rounded-md p-2 text-muted-foreground transition-colors',
							'hover:bg-accent hover:text-accent-foreground',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
						)}
						onClick={() => setIsCollapsed((prev) => !prev)}
					>
						<HugeiconsIcon
							className="size-4"
							icon={isCollapsed ? ArrowRight02Icon : ArrowLeft02Icon}
						/>
					</TooltipTrigger>
					<TooltipContent side="right">
						<p>{t('common.navigation')}</p>
					</TooltipContent>
				</Tooltip>
			</div>
		</aside>
	)
}

/**
 * Settings navigation tabs (mobile)
 */
export function SettingsNavTabs() {
	const { t } = useTranslation()
	const matchRoute = useMatchRoute()

	return (
		<nav className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
			<div className="flex items-center gap-3 px-4 pt-4 pb-2">
				<HugeiconsIcon className="size-5 text-primary" icon={Settings02Icon} />
				<div>
					<h1 className="font-semibold text-base">{t('settings.title')}</h1>
					<p className="text-muted-foreground text-xs">{t('settings.subtitle')}</p>
				</div>
			</div>

			<div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
				{SETTINGS_NAV_ITEMS.map((item) => {
					const isActive = matchRoute({ to: item.to, fuzzy: true })
					return (
						<Link
							className={cn(
								'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-medium text-sm transition-colors',
								'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
								isActive
									? 'bg-primary text-primary-foreground'
									: 'bg-muted/60 text-muted-foreground hover:bg-accent'
							)}
							key={item.id}
							to={item.to}
						>
							<HugeiconsIcon className="size-4 shrink-0" icon={item.icon} />
							<span>{t(item.labelKey)}</span>
						</Link>
					)
				})}
			</div>
		</nav>
	)
}
