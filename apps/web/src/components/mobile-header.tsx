import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useCommandPalette } from '@/contexts/command-palette-context'
import { SettingsMenu } from './settings-menu'
import { Button } from './ui/button'
import { SidebarTrigger } from './ui/sidebar'
import UserMenu from './user-menu'

/**
 * Mobile-first header with sidebar trigger, logo, and essential actions.
 * Visible only on mobile/tablet screens (md breakpoint and below).
 */
export function MobileHeader() {
	const { t } = useTranslation()
	const { setOpen } = useCommandPalette()

	return (
		<header className="sticky top-0 z-50 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/60 md:hidden">
			<SidebarTrigger />

			<Link className="flex-1 font-bold font-script text-primary text-xl" to="/">
				FolioNote
			</Link>

			<div className="flex items-center gap-1">
				<Button
					className="size-9"
					onClick={() => setOpen(true)}
					size="icon"
					variant="ghost"
				>
					<HugeiconsIcon className="size-5" icon={Search01Icon} />
					<span className="sr-only">{t('nav.search')}</span>
				</Button>
				<SettingsMenu />
				<UserMenu />
			</div>
		</header>
	)
}
