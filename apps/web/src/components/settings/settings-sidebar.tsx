import {
	AccountSetting01Icon,
	AiBeautifyIcon,
	ArrowLeft02Icon,
	ArrowRight02Icon,
	Settings02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type SettingsNavItem = {
	id: string
	labelKey: string
	descriptionKey: string
	icon: typeof Settings02Icon
	to: string
	gradient: string
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
	{
		id: 'general',
		labelKey: 'settings.nav.general',
		descriptionKey: 'settings.nav.generalDesc',
		icon: AccountSetting01Icon,
		to: '/settings/general',
		gradient: 'from-violet-500/20 to-purple-500/20',
	},
	{
		id: 'models',
		labelKey: 'settings.nav.models',
		descriptionKey: 'settings.nav.modelsDesc',
		icon: AiBeautifyIcon,
		to: '/settings/models',
		gradient: 'from-blue-500/20 to-cyan-500/20',
	},
]

/**
 * Modern collapsible settings sidebar navigation component (desktop)
 */
export function SettingsSidebar() {
	const { t } = useTranslation()
	const matchRoute = useMatchRoute()
	const [isCollapsed, setIsCollapsed] = useState(false)

	return (
		<aside
			className={cn(
				'relative flex h-dvh shrink-0 flex-col border-r bg-linear-to-b from-sidebar to-sidebar/80 transition-all duration-300 ease-in-out',
				isCollapsed ? 'w-[72px]' : 'w-72'
			)}
		>
			{/* Decorative gradient orb */}
			<div className="pointer-events-none absolute top-0 right-0 size-48 translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br from-primary/20 via-purple-500/10 to-transparent blur-3xl" />

			{/* Header */}
			<div
				className={cn(
					'relative flex h-16 items-center border-b transition-all duration-300',
					isCollapsed ? 'justify-center px-3' : 'gap-3 px-5'
				)}
			>
				<AnimatePresence mode="wait">
					{isCollapsed ? (
						<motion.div
							animate={{ opacity: 1, scale: 1 }}
							className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-purple-500/20"
							exit={{ opacity: 0, scale: 0.8 }}
							initial={{ opacity: 0, scale: 0.8 }}
							key="collapsed-icon"
						>
							<HugeiconsIcon className="size-5 text-primary" icon={Settings02Icon} />
						</motion.div>
					) : (
						<motion.div
							animate={{ opacity: 1, x: 0 }}
							className="flex flex-1 items-center gap-3"
							exit={{ opacity: 0, x: -10 }}
							initial={{ opacity: 0, x: -10 }}
							key="expanded-header"
						>
							<div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-purple-500/20">
								<HugeiconsIcon
									className="size-5 text-primary"
									icon={Settings02Icon}
								/>
							</div>
							<div className="flex-1 overflow-hidden">
								<h2 className="truncate font-semibold">{t('settings.title')}</h2>
								<p className="truncate text-muted-foreground text-xs">
									{t('settings.subtitle')}
								</p>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Navigation */}
			<nav className="flex-1 overflow-y-auto p-3">
				{!isCollapsed && (
					<motion.div
						animate={{ opacity: 1 }}
						className="mb-3 px-2"
						initial={{ opacity: 0 }}
						transition={{ delay: 0.1 }}
					>
						<span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
							{t('settings.nav.menu')}
						</span>
					</motion.div>
				)}
				<ul className="flex flex-col gap-2">
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
														'group relative flex size-12 items-center justify-center rounded-xl transition-all duration-200',
														'hover:bg-accent/50',
														'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
														isActive && 'bg-accent shadow-sm'
													)}
													to={item.to}
												/>
											}
										>
											{/* Active indicator */}
											{isActive && (
												<motion.div
													animate={{ opacity: 1, scaleY: 1 }}
													className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
													initial={{ opacity: 0, scaleY: 0 }}
													transition={{ duration: 0.2 }}
												/>
											)}
											<div
												className={cn(
													'flex size-10 items-center justify-center rounded-xl bg-linear-to-br transition-transform duration-200 group-hover:scale-105',
													item.gradient,
													isActive && 'shadow-sm'
												)}
											>
												<HugeiconsIcon
													className={cn(
														'size-5 transition-colors',
														isActive ? 'text-primary' : 'text-muted-foreground'
													)}
													icon={item.icon}
												/>
											</div>
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
										'group relative flex items-center gap-4 rounded-xl p-3 transition-all duration-200',
										'hover:bg-accent/50',
										'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
										isActive && 'bg-accent shadow-sm'
									)}
									to={item.to}
								>
									{/* Active indicator */}
									{isActive && (
										<motion.div
											animate={{ opacity: 1, scaleY: 1 }}
											className="absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary"
											initial={{ opacity: 0, scaleY: 0 }}
											transition={{ duration: 0.2 }}
										/>
									)}

									{/* Icon with gradient background */}
									<div
										className={cn(
											'flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br transition-transform duration-200 group-hover:scale-105',
											item.gradient,
											isActive && 'shadow-sm'
										)}
									>
										<HugeiconsIcon
											className={cn(
												'size-5 transition-colors',
												isActive ? 'text-primary' : 'text-muted-foreground'
											)}
											icon={item.icon}
										/>
									</div>

									{/* Text content */}
									<div className="flex-1 overflow-hidden">
										<span
											className={cn(
												'block truncate font-medium text-sm transition-colors',
												isActive ? 'text-foreground' : 'text-muted-foreground'
											)}
										>
											{t(item.labelKey)}
										</span>
										<span className="block truncate text-muted-foreground/70 text-xs">
											{t(item.descriptionKey)}
										</span>
									</div>

									{/* Hover arrow */}
									<motion.div
										animate={isActive ? { x: 0, opacity: 1 } : {}}
										className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
										initial={false}
									>
										<svg
											aria-hidden="true"
											className="size-4"
											fill="none"
											stroke="currentColor"
											strokeWidth={2}
											viewBox="0 0 24 24"
										>
											<path
												d="M9 5l7 7-7 7"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</motion.div>
								</Link>
							</li>
						)
					})}
				</ul>
			</nav>

			{/* Tip section - only show when expanded */}
			<AnimatePresence>
				{!isCollapsed && (
					<motion.div
						animate={{ opacity: 1, height: 'auto' }}
						className="border-t p-4"
						exit={{ opacity: 0, height: 0 }}
						initial={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.2 }}
					>
						<div className="rounded-xl bg-linear-to-r from-primary/10 via-purple-500/10 to-pink-500/10 p-4">
							<div className="mb-2 flex items-center gap-2">
								<div className="flex size-8 items-center justify-center rounded-lg bg-primary/20">
									<span className="text-sm">💡</span>
								</div>
								<span className="font-medium text-sm">
									{t('settings.tip.title')}
								</span>
							</div>
							<p className="text-muted-foreground text-xs leading-relaxed">
								{t('settings.tip.description')}
							</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Collapse toggle button */}
			<div className="border-t p-3">
				{isCollapsed ? (
					<Tooltip>
						<TooltipTrigger
							className={cn(
								'flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 font-medium text-sm transition-colors',
								'hover:bg-accent hover:text-accent-foreground',
								'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
							)}
							onClick={() => setIsCollapsed(false)}
						>
							<HugeiconsIcon className="size-4" icon={ArrowRight02Icon} />
						</TooltipTrigger>
						<TooltipContent side="right">
							<p>{t('common.navigation')}</p>
						</TooltipContent>
					</Tooltip>
				) : (
					<Button
						className="w-full justify-center gap-2"
						onClick={() => setIsCollapsed(true)}
						size="sm"
						variant="ghost"
					>
						<HugeiconsIcon className="size-4" icon={ArrowLeft02Icon} />
						<span className="text-muted-foreground text-xs">
							{t('common.navigation')}
						</span>
					</Button>
				)}
			</div>
		</aside>
	)
}

/**
 * Settings navigation tabs for mobile with new design
 */
export function SettingsNavTabs() {
	const { t } = useTranslation()
	const matchRoute = useMatchRoute()

	return (
		<nav className="sticky top-0 z-10 border-b bg-linear-to-b from-background to-muted/30 backdrop-blur-sm">
			{/* Header */}
			<div className="flex items-center justify-between px-4 pt-4 pb-2">
				<div className="flex items-center gap-3">
					<div className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-purple-500/20">
						<HugeiconsIcon className="size-4 text-primary" icon={Settings02Icon} />
					</div>
					<div>
						<h1 className="font-semibold text-lg">{t('settings.title')}</h1>
						<p className="text-muted-foreground text-xs">{t('settings.subtitle')}</p>
					</div>
				</div>
			</div>

			{/* Tab pills */}
			<div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
				{SETTINGS_NAV_ITEMS.map((item) => {
					const isActive = matchRoute({ to: item.to, fuzzy: true })
					return (
						<Link
							className={cn(
								'relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 font-medium text-sm transition-all duration-200',
								'hover:bg-accent',
								'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
								isActive
									? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
									: 'bg-muted/60 text-muted-foreground'
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
