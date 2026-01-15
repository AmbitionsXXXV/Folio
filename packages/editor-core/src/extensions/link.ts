import Link from '@tiptap/extension-link'

/**
 * Link extension configuration options
 */
export type LinkOptions = {
	/** Enable paste URL auto-conversion */
	linkOnPaste?: boolean
	/** Enable auto-link detection while typing */
	autolink?: boolean
	/** Default protocol for links without one */
	defaultProtocol?: string
	/** Open link on click */
	openOnClick?: boolean
	/** Enable click to select link text */
	enableClickSelection?: boolean
	/** HTML attributes for links */
	HTMLAttributes?: Record<string, string>
}

/**
 * Default link configuration
 */
export const defaultLinkOptions: LinkOptions = {
	linkOnPaste: true,
	autolink: true,
	defaultProtocol: 'https',
	openOnClick: false,
	enableClickSelection: true,
	HTMLAttributes: {
		rel: 'noopener noreferrer',
		target: '_blank',
		class: 'text-primary underline underline-offset-2 hover:text-primary/80',
	},
}

/**
 * Allowed protocols for links
 */
const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']

/**
 * Validate if URL is allowed
 */
function isAllowedUri(
	url: string,
	ctx: { defaultValidate: (url: string) => boolean }
): boolean {
	// Use default validation
	if (!ctx.defaultValidate(url)) {
		return false
	}

	// Don't allow relative paths
	if (url.startsWith('./') || url.startsWith('../')) {
		return false
	}

	// Allow common protocols
	try {
		const parsedUrl = new URL(url)
		return allowedProtocols.includes(parsedUrl.protocol)
	} catch {
		// If can't parse as URL, might be a link without protocol
		return true
	}
}

/**
 * Check if URL should be auto-linked
 */
function shouldAutoLink(url: string): boolean {
	try {
		const parsedUrl = new URL(url)
		return ['http:', 'https:'].includes(parsedUrl.protocol)
	} catch {
		return false
	}
}

/**
 * Create configured Link extension
 */
export function createLinkExtension(options: LinkOptions = {}) {
	const mergedOptions = { ...defaultLinkOptions, ...options }

	return Link.configure({
		linkOnPaste: mergedOptions.linkOnPaste,
		autolink: mergedOptions.autolink,
		defaultProtocol: mergedOptions.defaultProtocol,
		openOnClick: mergedOptions.openOnClick,
		enableClickSelection: mergedOptions.enableClickSelection,
		HTMLAttributes: mergedOptions.HTMLAttributes,
		isAllowedUri,
		shouldAutoLink,
	})
}

/**
 * Pre-configured custom link extension with default options
 */
export const CustomLink = createLinkExtension()
