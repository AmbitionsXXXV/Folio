import { Toaster } from '@folionote/ui/sonner'
import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { RootProvider } from 'fumadocs-ui/provider/tanstack'
import { ThemeProvider } from 'next-themes'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { CommandPalette } from '@/components/command-palette'
import { RouterPendingIndicator } from '@/components/router-pending-indicator'
import { CommandPaletteProvider } from '@/contexts/command-palette-context'
import i18n from '@/lib/i18n'
import { siteConfig } from '@/lib/site-config'
import { cn } from '@/lib/utils'
import type { orpc } from '@/utils/orpc'
import appCss from '../index.css?url'

export type RouterAppContext = {
	orpc: typeof orpc
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			{ title: siteConfig.name },
			{ name: 'description', content: siteConfig.description },
			{ name: 'theme-color', content: '#0D9488' },
			// Open Graph
			{ property: 'og:type', content: 'website' },
			{ property: 'og:site_name', content: siteConfig.name },
			{ property: 'og:title', content: siteConfig.name },
			{ property: 'og:description', content: siteConfig.description },
			{ property: 'og:image', content: siteConfig.ogImage },
			{ property: 'og:url', content: siteConfig.url },
			{ property: 'og:locale', content: siteConfig.locale },
			// Twitter Card
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:title', content: siteConfig.name },
			{ name: 'twitter:description', content: siteConfig.description },
			{ name: 'twitter:image', content: siteConfig.ogImage },
			{ name: 'twitter:site', content: siteConfig.twitter },
		],
		links: [
			{ rel: 'stylesheet', href: appCss },
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

function RootDocument() {
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
		<I18nextProvider i18n={i18n}>
			<html
				className={cn('no-scrollbar bg-background')}
				lang={currentLang}
				suppressHydrationWarning
			>
				<head>
					<HeadContent />
				</head>
				<body className={cn('min-h-svh bg-background', langClass)}>
					<RootProvider search={{ enabled: false }}>
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
					</RootProvider>
					<TanStackDevtools
						config={{ hideUntilHover: true }}
						plugins={[
							{
								name: 'TanStack Query',
								render: <ReactQueryDevtoolsPanel />,
								defaultOpen: true,
							},
							{
								name: 'TanStack Router',
								render: <TanStackRouterDevtoolsPanel />,
								defaultOpen: false,
							},
						]}
					/>
					<Scripts />
				</body>
			</html>
		</I18nextProvider>
	)
}
