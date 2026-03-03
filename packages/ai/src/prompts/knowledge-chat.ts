/**
 * Knowledge Chat prompt builder
 *
 * Constructs prompts for the knowledge base assistant with:
 * - System instructions (built-in prompt)
 * - Attached notes context (user-selected)
 * - RAG-enhanced context (FTS top-k retrieved)
 * - User input
 */

/** Token budget constants (conservative estimates, ~4 chars per token) */
const CHARS_PER_TOKEN = 4
const MAX_TOTAL_CONTEXT_TOKENS = 8000
const MAX_TOTAL_CONTEXT_CHARS = MAX_TOTAL_CONTEXT_TOKENS * CHARS_PER_TOKEN
const MAX_SINGLE_NOTE_TOKENS = 2000
const MAX_SINGLE_NOTE_CHARS = MAX_SINGLE_NOTE_TOKENS * CHARS_PER_TOKEN
const DEFAULT_RAG_TOP_K = 5

/** System prompt for knowledge base assistant */
export const KNOWLEDGE_CHAT_SYSTEM_PROMPT = `You are a knowledgeable assistant that helps users explore and understand their personal knowledge base (notes).

## Guidelines

1. **Prioritize provided context**: Answer questions primarily using the attached notes and retrieved notes provided below. These are the user's own notes from their library.

2. **Be transparent about limitations**: If the provided notes don't contain sufficient information to answer the question, clearly state what information is missing. Do not fabricate or assume information not present in the notes.

3. **Cite sources**: When referencing information from specific notes, mention the note title to help the user locate the source.

4. **Use Markdown**: Format your responses using Markdown for better readability (headings, lists, code blocks, etc.).

5. **Be concise but thorough**: Provide complete answers without unnecessary verbosity.

6. **Respect boundaries**: Only use information from the provided context. Do not make assumptions about content not shown.
7. **Use current date for time reasoning**: When interpreting dates, use the current date provided in the prompt. Do not refuse requests based on the model's training cutoff; only treat dates after the current date as future.
8. **Use tools when appropriate**: If the user asks about weather or stock prices, call the relevant tool and use its output. If the user asks to create, update, delete, retrieve, or search notes, call the relevant note tool. Ask for missing note IDs or ambiguous targets before calling tools. Do not fabricate tool results.
9. **Stock trend date ranges**: When the user asks for stock trend history or uses phrases like 走势/趋势/历史, call getStockTrend with startDate and endDate in YYYY-MM-DD format. For relative ranges like 最近一周/过去一周/近 7 天/last week/past week, set endDate to today's date (user locale) and startDate to endDate minus 6 days (7-day window).
10. **Company names to tickers**: If the user provides a clear company name (e.g., Apple), map to its common ticker symbol (AAPL). If ambiguous, ask for the ticker.

## Available Tools

- displayWeather: Get current weather for a location
- getStockPrice: Get the current price for a stock symbol
- getStockTrend: Get historical stock price data over a date range
- createNote: Create a new note (title and optional content)
- updateNote: Update an existing note by ID
- getNote: Retrieve a note by ID
- deleteNote: Soft delete a note by ID
- searchNotes: Search notes in the user library`

/** Note data structure for prompt building */
export type NoteContext = {
	id: string
	title: string
	contentText: string
	images?: NoteImageContext[]
}

/** Image data attached to a note */
export type NoteImageContext = {
	url: string
	description?: string
	mimeType: string
}

/** Input for building knowledge chat prompt */
export type BuildKnowledgeChatPromptInput = {
	/** User's question/prompt */
	userPrompt: string
	/** Current date in YYYY-MM-DD format (local runtime) */
	currentDate?: string
	/** Notes explicitly attached by user via @ mention */
	attachedNotes?: NoteContext[]
	/** Notes retrieved via FTS/RAG */
	retrievedNotes?: NoteContext[]
	/** Maximum chars for total context (for testing) */
	maxTotalContextChars?: number
	/** Maximum chars per single note (for testing) */
	maxSingleNoteChars?: number
}

/** Output from building knowledge chat prompt */
export type BuildKnowledgeChatPromptResult = {
	/** Final assembled prompt string */
	prompt: string
	/** Count of attached notes included */
	attachedNotesCount: number
	/** Count of retrieved notes included */
	retrievedNotesCount: number
	/** Whether any content was truncated */
	wasTruncated: boolean
}

/**
 * Truncate text to a maximum character count, adding ellipsis if truncated
 */
function truncateText(text: string, maxChars: number): string {
	if (text.length <= maxChars) {
		return text
	}
	return `${text.slice(0, maxChars - 3)}...`
}

const MAX_IMAGES_PER_NOTE_IN_PROMPT = 5

/**
 * Format a note for inclusion in the prompt
 */
function formatNoteForPrompt(note: NoteContext, maxChars: number): string {
	const truncatedContent = truncateText(note.contentText, maxChars)
	const sections = [`### ${note.title}`, '', truncatedContent]

	if (note.images && note.images.length > 0) {
		sections.push('', '**Images in this note:**')
		const promptImages = note.images.slice(0, MAX_IMAGES_PER_NOTE_IN_PROMPT)
		for (const [index, image] of promptImages.entries()) {
			const description =
				image?.description?.trim() || 'Image present (description unavailable).'
			sections.push(`- Image ${index + 1}: ${description}`)
		}
		if (note.images.length > MAX_IMAGES_PER_NOTE_IN_PROMPT) {
			const extraCount = note.images.length - MAX_IMAGES_PER_NOTE_IN_PROMPT
			sections.push(`- ... and ${extraCount} more image(s)`)
		}
	}

	return sections.join('\n')
}

/** Minimum chars required for useful note content */
const MIN_USEFUL_CONTENT_CHARS = 200
/** Reserved chars for note header formatting */
const NOTE_FORMAT_OVERHEAD = 50

/** State for processing notes within budget */
type NoteBudgetState = {
	usedChars: number
	wasTruncated: boolean
	included: string[]
}

/**
 * Process a single note within budget constraints
 * Returns whether to continue processing more notes
 */
function processNoteWithinBudget(
	note: NoteContext,
	state: NoteBudgetState,
	maxTotalChars: number,
	maxSingleChars: number
): boolean {
	const formatted = formatNoteForPrompt(note, maxSingleChars)
	const formattedChars = formatted.length

	// Check if note fits within remaining budget
	if (state.usedChars + formattedChars <= maxTotalChars) {
		if (note.contentText.length > maxSingleChars) {
			state.wasTruncated = true
		}
		state.included.push(formatted)
		state.usedChars += formattedChars
		return true
	}

	// Try to fit with remaining budget
	const remaining = maxTotalChars - state.usedChars
	if (remaining > MIN_USEFUL_CONTENT_CHARS) {
		const truncatedFormatted = formatNoteForPrompt(
			note,
			remaining - NOTE_FORMAT_OVERHEAD
		)
		state.included.push(truncatedFormatted)
		state.wasTruncated = true
	}
	return false
}

/**
 * Process a list of notes within budget constraints
 */
function processNotesWithinBudget(
	notes: NoteContext[],
	state: NoteBudgetState,
	maxTotalChars: number,
	maxSingleChars: number
): void {
	for (const note of notes) {
		const shouldContinue = processNoteWithinBudget(
			note,
			state,
			maxTotalChars,
			maxSingleChars
		)
		if (!shouldContinue) break
	}
}

/**
 * Assemble note context sections (without user question)
 */
function assembleNoteContextSections(
	attachedFormatted: string[],
	retrievedFormatted: string[]
): string[] {
	const sections: string[] = []

	if (attachedFormatted.length > 0) {
		sections.push(`## Attached Notes (User Selected)

${attachedFormatted.join('\n\n---\n\n')}`)
	}

	if (retrievedFormatted.length > 0) {
		sections.push(`## Related Notes (Retrieved)

${retrievedFormatted.join('\n\n---\n\n')}`)
	}

	return sections
}

/**
 * Assemble current date section (optional)
 */
function assembleCurrentDateSection(currentDate?: string): string[] {
	if (!currentDate) return []
	return [
		`## Current Date

${currentDate}`,
	]
}

/**
 * Build the final prompt from sections (for single-turn mode)
 */
function assembleFinalPrompt(
	userPrompt: string,
	attachedFormatted: string[],
	retrievedFormatted: string[],
	currentDate?: string
): string {
	const sections: string[] = [KNOWLEDGE_CHAT_SYSTEM_PROMPT]

	sections.push(...assembleCurrentDateSection(currentDate))
	sections.push(
		...assembleNoteContextSections(attachedFormatted, retrievedFormatted)
	)

	sections.push(`## User Question

${userPrompt}`)

	return sections.join('\n\n')
}

/**
 * Build system prompt only (for conversation mode where messages carry user questions)
 */
function assembleSystemPrompt(
	attachedFormatted: string[],
	retrievedFormatted: string[],
	currentDate?: string
): string {
	const sections: string[] = [KNOWLEDGE_CHAT_SYSTEM_PROMPT]

	sections.push(...assembleCurrentDateSection(currentDate))
	sections.push(
		...assembleNoteContextSections(attachedFormatted, retrievedFormatted)
	)

	return sections.join('\n\n')
}

/**
 * Build the knowledge chat prompt with system instructions, note context, and user input
 */
export function buildKnowledgeChatPrompt(
	input: BuildKnowledgeChatPromptInput
): BuildKnowledgeChatPromptResult {
	const maxTotalChars = input.maxTotalContextChars ?? MAX_TOTAL_CONTEXT_CHARS
	const maxSingleChars = input.maxSingleNoteChars ?? MAX_SINGLE_NOTE_CHARS

	const attachedNotes = input.attachedNotes ?? []
	const retrievedNotes = input.retrievedNotes ?? []

	// Track which note IDs are attached to avoid duplicates in retrieved
	const attachedIds = new Set(attachedNotes.map((n) => n.id))
	const uniqueRetrievedNotes = retrievedNotes.filter((n) => !attachedIds.has(n.id))

	// Process attached notes first (user explicitly selected these)
	const attachedState: NoteBudgetState = {
		usedChars: 0,
		wasTruncated: false,
		included: [],
	}
	processNotesWithinBudget(
		attachedNotes,
		attachedState,
		maxTotalChars,
		maxSingleChars
	)

	// Process retrieved notes with remaining budget
	const retrievedState: NoteBudgetState = {
		usedChars: attachedState.usedChars,
		wasTruncated: attachedState.wasTruncated,
		included: [],
	}
	processNotesWithinBudget(
		uniqueRetrievedNotes,
		retrievedState,
		maxTotalChars,
		maxSingleChars
	)

	const prompt = assembleFinalPrompt(
		input.userPrompt,
		attachedState.included,
		retrievedState.included,
		input.currentDate
	)

	return {
		prompt,
		attachedNotesCount: attachedState.included.length,
		retrievedNotesCount: retrievedState.included.length,
		wasTruncated: retrievedState.wasTruncated,
	}
}

/** Default RAG top-k value */
export const DEFAULT_KNOWLEDGE_CHAT_RAG_TOP_K = DEFAULT_RAG_TOP_K

// ============================================================================
// Conversation Mode - System Prompt Builder
// ============================================================================

/** Input for building knowledge chat system prompt (conversation mode) */
export type BuildKnowledgeChatSystemPromptInput = {
	/** Notes explicitly attached by user via @ mention */
	attachedNotes?: NoteContext[]
	/** Notes retrieved via FTS/RAG */
	retrievedNotes?: NoteContext[]
	/** Current date in YYYY-MM-DD format (local runtime) */
	currentDate?: string
	/** Maximum chars for total context (for testing) */
	maxTotalContextChars?: number
	/** Maximum chars per single note (for testing) */
	maxSingleNoteChars?: number
}

/** Output from building knowledge chat system prompt */
export type BuildKnowledgeChatSystemPromptResult = {
	/** System prompt string (without user question) */
	systemPrompt: string
	/** Count of attached notes included */
	attachedNotesCount: number
	/** Count of retrieved notes included */
	retrievedNotesCount: number
	/** Whether any content was truncated */
	wasTruncated: boolean
}

/**
 * Build system prompt for conversation mode
 *
 * Unlike `buildKnowledgeChatPrompt`, this does NOT include the user question.
 * Use this when the user question is already in the `messages` array.
 */
export function buildKnowledgeChatSystemPrompt(
	input: BuildKnowledgeChatSystemPromptInput
): BuildKnowledgeChatSystemPromptResult {
	const maxTotalChars = input.maxTotalContextChars ?? MAX_TOTAL_CONTEXT_CHARS
	const maxSingleChars = input.maxSingleNoteChars ?? MAX_SINGLE_NOTE_CHARS

	const attachedNotes = input.attachedNotes ?? []
	const retrievedNotes = input.retrievedNotes ?? []

	// Track which note IDs are attached to avoid duplicates in retrieved
	const attachedIds = new Set(attachedNotes.map((n) => n.id))
	const uniqueRetrievedNotes = retrievedNotes.filter((n) => !attachedIds.has(n.id))

	// Process attached notes first (user explicitly selected these)
	const attachedState: NoteBudgetState = {
		usedChars: 0,
		wasTruncated: false,
		included: [],
	}
	processNotesWithinBudget(
		attachedNotes,
		attachedState,
		maxTotalChars,
		maxSingleChars
	)

	// Process retrieved notes with remaining budget
	const retrievedState: NoteBudgetState = {
		usedChars: attachedState.usedChars,
		wasTruncated: attachedState.wasTruncated,
		included: [],
	}
	processNotesWithinBudget(
		uniqueRetrievedNotes,
		retrievedState,
		maxTotalChars,
		maxSingleChars
	)

	const systemPrompt = assembleSystemPrompt(
		attachedState.included,
		retrievedState.included,
		input.currentDate
	)

	return {
		systemPrompt,
		attachedNotesCount: attachedState.included.length,
		retrievedNotesCount: retrievedState.included.length,
		wasTruncated: retrievedState.wasTruncated,
	}
}
