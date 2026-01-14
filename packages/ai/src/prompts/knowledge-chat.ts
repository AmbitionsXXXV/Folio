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

6. **Respect boundaries**: Only use information from the provided context. Do not make assumptions about content not shown.`

/** Note data structure for prompt building */
export type NoteContext = {
	id: string
	title: string
	contentText: string
}

/** Input for building knowledge chat prompt */
export type BuildKnowledgeChatPromptInput = {
	/** User's question/prompt */
	userPrompt: string
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

/**
 * Format a note for inclusion in the prompt
 */
function formatNoteForPrompt(note: NoteContext, maxChars: number): string {
	const truncatedContent = truncateText(note.contentText, maxChars)
	return `### ${note.title}

${truncatedContent}`
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
 * Build the final prompt from sections
 */
function assembleFinalPrompt(
	userPrompt: string,
	attachedFormatted: string[],
	retrievedFormatted: string[]
): string {
	const sections: string[] = [KNOWLEDGE_CHAT_SYSTEM_PROMPT]

	if (attachedFormatted.length > 0) {
		sections.push(`## Attached Notes (User Selected)

${attachedFormatted.join('\n\n---\n\n')}`)
	}

	if (retrievedFormatted.length > 0) {
		sections.push(`## Related Notes (Retrieved)

${retrievedFormatted.join('\n\n---\n\n')}`)
	}

	sections.push(`## User Question

${userPrompt}`)

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
		retrievedState.included
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
