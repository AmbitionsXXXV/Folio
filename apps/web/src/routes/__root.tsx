import { useIsMobile } from '@folionote/ui/hooks/use-mobile'
import { Toaster } from '@folionote/ui/sonner'
import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import { ThemeProvider } from 'next-themes'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { CommandPalette } from '@/components/command-palette'
import { RouterPendingIndicator } from '@/components/router-pending-indicator'
import { CommandPaletteProvider } from '@/contexts/command-palette-context'
import i18n from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { orpc } from '@/utils/orpc'
import appCss from '../index.css?url'

export type RouterAppContext = {
	orpc: typeof orpc
	queryClient: QueryClient
}

const TITLE = import.meta.env.DEV ? 'FolioNote Dev' : 'FolioNote'

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8',
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			{
				title: TITLE,
			},
		],
		links: [
			{
				rel: 'stylesheet',
				href: appCss,
			},
			{ rel: 'icon', href: '/favicon.ico' },
			{
				rel: 'apple-touch-icon',
				sizes: '180x180',
				href: '/apple-touch-icon.png',
			},
			{
				rel: 'icon',
				type: 'image/png',
				sizes: '32x32',
				href: '/favicon-32x32.png',
			},
			{
				rel: 'icon',
				type: 'image/png',
				sizes: '16x16',
				href: '/favicon-16x16.png',
			},
		],
	}),

	component: RootDocument,
})

function RootDocumentInner() {
	const isMobile = useIsMobile()
	const { i18n: i18nInstance } = useTranslation()
	const currentLang = i18nInstance.language

	// Map language codes to CSS class names for font switching
	const getLangClass = (lang: string) => {
		if (lang.startsWith('zh')) return 'lang-zh'
		if (lang.startsWith('ja')) return 'lang-ja'
		return 'lang-en'
	}
	const langClass = getLangClass(currentLang)

	return (
		<html
			className={cn('no-scrollbar bg-background')}
			lang={currentLang}
			suppressHydrationWarning
		>
			<head>
				<HeadContent />
			</head>
			<body className={cn('min-h-svh bg-background', langClass)}>
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					disableTransitionOnChange
					enableSystem
				>
					<RouterPendingIndicator />
					<CommandPaletteProvider>
						<Outlet />
						<CommandPalette />
					</CommandPaletteProvider>
					<Toaster richColors />
				</ThemeProvider>
				<TanStackRouterDevtools position={isMobile ? 'bottom-left' : 'top-right'} />
				<ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
				<Scripts />
			</body>
		</html>
	)
}

function RootDocument() {
	return (
		<RootProvider search={{ enabled: false }}>
			<I18nextProvider i18n={i18n}>
				<RootDocumentInner />
			</I18nextProvider>
		</RootProvider>
	)
}
