import type { AIChatModelCard } from '../types'

/**
 * gemini implicit caching not extra cost
 * https://openrouter.ai/docs/features/prompt-caching#implicit-caching
 */

const googleChatModels: AIChatModelCard[] = [
	{
		abilities: {
			functionCall: true,
			reasoning: true,
			search: true,
			structuredOutput: true,
			video: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 65_536,
		description: 'Latest release of Gemini Pro',
		displayName: 'Gemini Pro Latest',
		id: 'gemini-pro-latest',
		maxOutput: 65_536,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					strategy: 'tiered',
					tiers: [
						{ rate: 0.31, upTo: 200_000 },
						{ rate: 0.625, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
				{
					name: 'textInput',
					strategy: 'tiered',
					tiers: [
						{ rate: 1.25, upTo: 200_000 },
						{ rate: 2.5, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
				{
					name: 'textOutput',
					strategy: 'tiered',
					tiers: [
						{ rate: 10, upTo: 200_000 },
						{ rate: 15, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
			],
		},
		settings: {
			extendParams: ['thinkingBudget', 'urlContext'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			functionCall: true,
			reasoning: true,
			search: true,
			video: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 65_536,
		description: 'Latest release of Gemini Flash',
		displayName: 'Gemini Flash Latest',
		id: 'gemini-flash-latest',
		maxOutput: 65_536,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					rate: 0.075,
					strategy: 'fixed',
					unit: 'millionTokens',
				},
				{ name: 'textInput', rate: 0.3, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 2.5, strategy: 'fixed', unit: 'millionTokens' },
			],
		},
		settings: {
			extendParams: ['thinkingBudget', 'urlContext'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			functionCall: true,
			reasoning: true,
			search: true,
			video: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 65_536,
		description: 'Latest release of Gemini Flash-Lite',
		displayName: 'Gemini Flash-Lite Latest',
		id: 'gemini-flash-lite-latest',
		maxOutput: 65_536,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					rate: 0.025,
					strategy: 'fixed',
					unit: 'millionTokens',
				},
				{ name: 'textInput', rate: 0.1, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 0.4, strategy: 'fixed', unit: 'millionTokens' },
			],
		},
		settings: {
			extendParams: ['thinkingBudget', 'urlContext'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			functionCall: true,
			reasoning: true,
			search: true,
			video: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 65_536,
		description:
			'Gemini 3 Pro is Google’s most powerful agent and vibe-coding model, delivering richer visuals and deeper interaction on top of state-of-the-art reasoning.',
		displayName: 'Gemini 3 Pro Preview',
		enabled: true,
		id: 'gemini-3-pro-preview',
		maxOutput: 65_536,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					strategy: 'tiered',
					tiers: [
						{ rate: 0.2, upTo: 200_000 },
						{ rate: 0.4, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
				{
					name: 'textInput',
					strategy: 'tiered',
					tiers: [
						{ rate: 2, upTo: 200_000 },
						{ rate: 4, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
				{
					name: 'textOutput',
					strategy: 'tiered',
					tiers: [
						{ rate: 12, upTo: 200_000 },
						{ rate: 18, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
				{
					lookup: { prices: { '1h': 4.5 }, pricingParams: ['ttl'] },
					name: 'textInput_cacheWrite',
					strategy: 'lookup',
					unit: 'millionTokens',
				},
			],
		},
		releasedAt: '2025-11-18',
		settings: {
			extendParams: ['thinkingLevel2', 'urlContext'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			functionCall: true,
			reasoning: true,
			search: true,
			video: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 65_536,
		description:
			'Gemini 3 Flash is the smartest model built for speed, combining cutting-edge intelligence with excellent search grounding.',
		displayName: 'Gemini 3 Flash Preview',
		enabled: true,
		id: 'gemini-3-flash-preview',
		maxOutput: 65_536,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					rate: 0.05,
					strategy: 'fixed',
					unit: 'millionTokens',
				},
				{ name: 'textInput', rate: 0.5, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 3, strategy: 'fixed', unit: 'millionTokens' },
				{
					lookup: { prices: { '1h': 1 }, pricingParams: ['ttl'] },
					name: 'textInput_cacheWrite',
					strategy: 'lookup',
					unit: 'millionTokens',
				},
			],
		},
		releasedAt: '2025-12-17',
		settings: {
			extendParams: ['thinkingLevel', 'urlContext'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			imageOutput: true,
			reasoning: true,
			search: true,
			vision: true,
		},
		contextWindowTokens: 131_072 + 32_768,
		description:
			'Gemini 3 Pro Image (Nano Banana Pro) is Google’s image generation model and also supports multimodal chat.',
		displayName: 'Nano Banana Pro',
		enabled: true,
		id: 'gemini-3-pro-image-preview',
		maxOutput: 32_768,
		pricing: {
			approximatePricePerImage: 0.134,
			units: [
				{ name: 'imageOutput', rate: 120, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textInput', rate: 2, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 12, strategy: 'fixed', unit: 'millionTokens' },
			],
		},
		releasedAt: '2025-11-20',
		settings: {
			extendParams: ['imageAspectRatio', 'imageResolution'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			functionCall: true,
			reasoning: true,
			search: true,
			video: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 65_536,
		description:
			'Gemini 2.5 Pro is Google’s most advanced reasoning model, able to reason over code, math, and STEM problems and analyze large datasets, codebases, and documents with long context.',
		displayName: 'Gemini 2.5 Pro',
		id: 'gemini-2.5-pro',
		maxOutput: 65_536,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					strategy: 'tiered',
					tiers: [
						{ rate: 0.31, upTo: 200_000 },
						{ rate: 0.625, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
				{
					name: 'textInput',
					strategy: 'tiered',
					tiers: [
						{ rate: 1.25, upTo: 200_000 },
						{ rate: 2.5, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
				{
					name: 'textOutput',
					strategy: 'tiered',
					tiers: [
						{ rate: 10, upTo: 200_000 },
						{ rate: 15, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
				{
					lookup: { prices: { '1h': 4.5 }, pricingParams: ['ttl'] },
					name: 'textInput_cacheWrite',
					strategy: 'lookup',
					unit: 'millionTokens',
				},
			],
		},
		releasedAt: '2025-06-17',
		settings: {
			extendParams: ['thinkingBudget', 'urlContext'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			functionCall: true,
			reasoning: true,
			search: true,
			video: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 65_536,
		description:
			'Gemini 2.5 Pro Preview is Google’s most advanced reasoning model, able to reason over code, math, and STEM problems and analyze large datasets, codebases, and documents with long context.',
		displayName: 'Gemini 2.5 Pro Preview 06-05',
		id: 'gemini-2.5-pro-preview-06-05',
		maxOutput: 65_536,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					strategy: 'tiered',
					tiers: [
						{ rate: 0.31, upTo: 200_000 },
						{ rate: 0.625, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
				{
					name: 'textInput',
					strategy: 'tiered',
					tiers: [
						{ rate: 1.25, upTo: 200_000 },
						{ rate: 2.5, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
				{
					name: 'textOutput',
					strategy: 'tiered',
					tiers: [
						{ rate: 10, upTo: 200_000 },
						{ rate: 15, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
			],
		},
		releasedAt: '2025-06-05',
		settings: {
			extendParams: ['thinkingBudget', 'urlContext'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			functionCall: true,
			reasoning: true,
			search: true,
			video: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 65_536,
		description:
			'Gemini 2.5 Pro Preview is Google’s most advanced reasoning model, able to reason over code, math, and STEM problems and analyze large datasets, codebases, and documents with long context.',
		displayName: 'Gemini 2.5 Pro Preview 05-06',
		id: 'gemini-2.5-pro-preview-05-06',
		maxOutput: 65_536,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					strategy: 'tiered',
					tiers: [
						{ rate: 0.31, upTo: 200_000 },
						{ rate: 0.625, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
				{
					name: 'textInput',
					strategy: 'tiered',
					tiers: [
						{ rate: 1.25, upTo: 200_000 },
						{ rate: 2.5, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
				{
					name: 'textOutput',
					strategy: 'tiered',
					tiers: [
						{ rate: 10, upTo: 200_000 },
						{ rate: 15, upTo: 'infinity' },
					],
					unit: 'millionTokens',
				},
			],
		},
		releasedAt: '2025-05-06',
		settings: {
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			functionCall: true,
			reasoning: true,
			search: true,
			video: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 65_536,
		description:
			'Gemini 2.5 Flash is Google’s best-value model with full capabilities.',
		displayName: 'Gemini 2.5 Flash',
		id: 'gemini-2.5-flash',
		maxOutput: 65_536,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					rate: 0.075,
					strategy: 'fixed',
					unit: 'millionTokens',
				},
				{ name: 'textInput', rate: 0.3, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 2.5, strategy: 'fixed', unit: 'millionTokens' },
			],
		},
		releasedAt: '2025-06-17',
		settings: {
			extendParams: ['thinkingBudget', 'urlContext'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			functionCall: true,
			reasoning: true,
			search: true,
			video: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 65_536,
		description: 'Preview release (Septempber 25th, 2025) of Gemini 2.5 Flash',
		displayName: 'Gemini 2.5 Flash Preview Sep 2025',
		id: 'gemini-2.5-flash-preview-09-2025',
		maxOutput: 65_536,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					rate: 0.075,
					strategy: 'fixed',
					unit: 'millionTokens',
				},
				{ name: 'textInput', rate: 0.3, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 2.5, strategy: 'fixed', unit: 'millionTokens' },
			],
		},
		releasedAt: '2025-09-25',
		settings: {
			extendParams: ['thinkingBudget', 'urlContext'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			functionCall: true,
			reasoning: true,
			search: true,
			video: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 65_536,
		description:
			'Gemini 2.5 Flash-Lite is Google’s smallest, best-value model, designed for large-scale use.',
		displayName: 'Gemini 2.5 Flash-Lite',
		id: 'gemini-2.5-flash-lite',
		maxOutput: 65_536,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					rate: 0.025,
					strategy: 'fixed',
					unit: 'millionTokens',
				},
				{ name: 'textInput', rate: 0.1, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 0.4, strategy: 'fixed', unit: 'millionTokens' },
			],
		},
		releasedAt: '2025-07-22',
		settings: {
			extendParams: ['thinkingBudget', 'urlContext'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			functionCall: true,
			reasoning: true,
			search: true,
			video: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 65_536,
		description: 'Preview release (September 25th, 2025) of Gemini 2.5 Flash-Lite',
		displayName: 'Gemini 2.5 Flash-Lite Preview Sep 2025',
		id: 'gemini-2.5-flash-lite-preview-09-2025',
		maxOutput: 65_536,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					rate: 0.025,
					strategy: 'fixed',
					unit: 'millionTokens',
				},
				{ name: 'textInput', rate: 0.1, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 0.4, strategy: 'fixed', unit: 'millionTokens' },
			],
		},
		releasedAt: '2025-09-25',
		settings: {
			extendParams: ['thinkingBudget', 'urlContext'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			functionCall: true,
			search: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 8192,
		description:
			'Gemini 2.0 Flash delivers next-gen features including exceptional speed, native tool use, multimodal generation, and a 1M-token context window.',
		displayName: 'Gemini 2.0 Flash',
		id: 'gemini-2.0-flash',
		maxOutput: 8192,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					rate: 0.025,
					strategy: 'fixed',
					unit: 'millionTokens',
				},
				{ name: 'textInput', rate: 0.1, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 0.4, strategy: 'fixed', unit: 'millionTokens' },
			],
		},
		releasedAt: '2025-02-05',
		settings: {
			extendParams: ['urlContext'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			functionCall: true,
			search: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 8192,
		description:
			'Gemini 2.0 Flash delivers next-gen features including exceptional speed, native tool use, multimodal generation, and a 1M-token context window.',
		displayName: 'Gemini 2.0 Flash 001',
		id: 'gemini-2.0-flash-001',
		maxOutput: 8192,
		pricing: {
			units: [
				{
					name: 'textInput_cacheRead',
					rate: 0.025,
					strategy: 'fixed',
					unit: 'millionTokens',
				},
				{ name: 'textInput', rate: 0.1, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 0.4, strategy: 'fixed', unit: 'millionTokens' },
			],
		},
		releasedAt: '2025-02-05',
		settings: {
			extendParams: ['urlContext'],
			searchImpl: 'params',
			searchProvider: 'google',
		},
		type: 'chat',
	},
	{
		abilities: {
			imageOutput: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 8192,
		description:
			'Gemini 2.0 Flash experimental model with image generation support.',
		displayName: 'Gemini 2.0 Flash (Image Generation) Experimental',
		id: 'gemini-2.0-flash-exp-image-generation',
		maxOutput: 8192,
		pricing: {
			units: [
				{ name: 'textInput', rate: 0, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 0, strategy: 'fixed', unit: 'millionTokens' },
			],
		},
		releasedAt: '2025-03-14',
		type: 'chat',
	},
	{
		abilities: {
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 8192,
		description:
			'A Gemini 2.0 Flash variant optimized for cost efficiency and low latency.',
		displayName: 'Gemini 2.0 Flash-Lite',
		id: 'gemini-2.0-flash-lite',
		maxOutput: 8192,
		pricing: {
			units: [
				{ name: 'textInput', rate: 0.075, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 0.3, strategy: 'fixed', unit: 'millionTokens' },
			],
		},
		releasedAt: '2025-02-05',
		type: 'chat',
	},
	{
		abilities: {
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 8192,
		description:
			'A Gemini 2.0 Flash variant optimized for cost efficiency and low latency.',
		displayName: 'Gemini 2.0 Flash-Lite 001',
		id: 'gemini-2.0-flash-lite-001',
		maxOutput: 8192,
		pricing: {
			units: [
				{ name: 'textInput', rate: 0.075, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 0.3, strategy: 'fixed', unit: 'millionTokens' },
			],
		},
		releasedAt: '2025-02-05',
		type: 'chat',
	},
	{
		abilities: {
			imageOutput: true,
			vision: true,
		},
		contextWindowTokens: 1_048_576 + 8192,
		description:
			'A Gemini 2.0 Flash variant optimized for cost efficiency and low latency.',
		displayName: 'Gemini 2.0 Flash Exp',
		id: 'gemini-2.0-flash-exp',
		maxOutput: 8192,
		pricing: {
			units: [
				{ name: 'textInput', rate: 0, strategy: 'fixed', unit: 'millionTokens' },
				{ name: 'textOutput', rate: 0, strategy: 'fixed', unit: 'millionTokens' },
			],
		},
		releasedAt: '2025-02-05',
		type: 'chat',
	},
]

export const allModels = [...googleChatModels]

export default allModels
