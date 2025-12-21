import {
	BookOpen01Icon,
	Home01Icon,
	InboxIcon,
	Link01Icon,
	Rocket01Icon,
	Search01Icon,
	Tag01Icon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useCommandPalette } from '@/contexts/command-palette-context'
import { Button } from './ui/button'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
	useSidebar,
} from './ui/sidebar'
import UserMenu from './user-menu'

type NavItem = {
	to: string
	labelKey: string
	icon: IconSvgElement
}

const mainNavItems: NavItem[] = [
	{ to: '/inbox', labelKey: 'nav.inbox', icon: InboxIcon },
	{ to: '/library', labelKey: 'nav.library', icon: BookOpen01Icon },
]

const secondaryNavItems: NavItem[] = [
	{ to: '/tags', labelKey: 'nav.tags', icon: Tag01Icon },
	{ to: '/sources', labelKey: 'nav.sources', icon: Link01Icon },
	{ to: '/review', labelKey: 'nav.review', icon: Rocket01Icon },
]

function NavItems({ items }: { items: NavItem[] }) {
	const { t } = useTranslation()
	const matchRoute = useMatchRoute()

	return (
		<SidebarMenu>
			{items.map(({ to, labelKey, icon }) => {
				const isActive = matchRoute({ to, fuzzy: true })

				return (
					<SidebarMenuItem key={to}>
						<SidebarMenuButton isActive={!!isActive} tooltip={t(labelKey)}>
							<Link className="flex w-full items-center gap-3" to={to}>
								<HugeiconsIcon
									className="size-5"
									icon={icon}
									strokeWidth={isActive ? 2.5 : 2}
								/>
								<span>{t(labelKey)}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				)
			})}
		</SidebarMenu>
	)
}

function SearchButton() {
	const { t } = useTranslation()
	const { setOpen } = useCommandPalette()
	const { state } = useSidebar()
	const isCollapsed = state === 'collapsed'

	return (
		<Button
			className="w-full justify-start gap-3 bg-muted text-muted-foreground"
			onClick={() => setOpen(true)}
			size={isCollapsed ? 'icon' : 'default'}
			variant="ghost"
		>
			<HugeiconsIcon className="size-5" icon={Search01Icon} />
			{!isCollapsed && (
				<>
					<span className="flex-1 text-left">{t('nav.search')}</span>
					<kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium font-mono text-[10px] opacity-100 md:flex">
						<span className="text-xs">⌘</span>K
					</kbd>
				</>
			)}
		</Button>
	)
}

export function AppSidebar() {
	const matchRoute = useMatchRoute()
	const isHomeActive = matchRoute({ to: '/', fuzzy: false })
	const { state } = useSidebar()
	const isCollapsed = state === 'collapsed'

	return (
		<Sidebar collapsible="icon" variant="sidebar">
			<SidebarHeader className="p-4">
				<Link
					className="flex items-center gap-3 font-bold font-script text-2xl text-primary"
					to="/"
				>
					<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
						<HugeiconsIcon
							className="size-5 text-primary"
							icon={Home01Icon}
							strokeWidth={isHomeActive ? 2.5 : 2}
						/>
					</div>
					<span className="group-data-[collapsible=icon]:hidden">FolioNote</span>
				</Link>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup className="px-2">
					<SidebarGroupContent>
						<div className="mb-2 group-data-[collapsible=icon]:hidden">
							<SearchButton />
						</div>
						<NavItems items={mainNavItems} />
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarSeparator className="mx-4" />

				<SidebarGroup className="px-2">
					<SidebarGroupContent>
						<NavItems items={secondaryNavItems} />
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="border-sidebar-border border-t p-2">
				<UserMenu collapsed={isCollapsed} />
			</SidebarFooter>
		</Sidebar>
	)
}
