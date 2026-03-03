import { siteConfig } from './site-config'

type PageHeadOptions = {
	title?: string
	description?: string
	image?: string
	url?: string
	type?: 'website' | 'article'
}

type MetaTag = Record<string, string>

/**
 * Builds a TanStack Router `head`-compatible object with OG + Twitter Card meta tags.
 * Merges provided overrides with defaults from `siteConfig`.
 */
export function createPageHead(options: PageHeadOptions = {}) {
	const title = options.title
		? `${options.title} - ${siteConfig.name}`
		: siteConfig.name
	const description = options.description ?? siteConfig.description
	const image = options.image ?? siteConfig.ogImage
	const url = options.url ?? siteConfig.url
	const type = options.type ?? 'website'

	const meta: MetaTag[] = [
		{ title },
		{ name: 'description', content: description },
		// Open Graph
		{ property: 'og:type', content: type },
		{ property: 'og:site_name', content: siteConfig.name },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		{ property: 'og:image', content: image },
		{ property: 'og:url', content: url },
		{ property: 'og:locale', content: siteConfig.locale },
		// Twitter Card
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:title', content: title },
		{ name: 'twitter:description', content: description },
		{ name: 'twitter:image', content: image },
		{ name: 'twitter:site', content: siteConfig.twitter },
	]

	return { meta }
}
