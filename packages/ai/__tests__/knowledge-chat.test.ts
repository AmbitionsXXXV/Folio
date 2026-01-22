import { describe, expect, it } from 'vitest'
import {
	buildKnowledgeChatPrompt,
	buildKnowledgeChatSystemPrompt,
	DEFAULT_KNOWLEDGE_CHAT_RAG_TOP_K,
	KNOWLEDGE_CHAT_SYSTEM_PROMPT,
	type NoteContext,
} from '../src/prompts/knowledge-chat'

describe('buildKnowledgeChatPrompt', () => {
	const createNote = (
		id: string,
		title: string,
		contentText: string
	): NoteContext => ({
		id,
		title,
		contentText,
	})

	it('builds prompt with only user input', () => {
		const result = buildKnowledgeChatPrompt({
			userPrompt: 'What is TypeScript?',
		})

		expect(result.prompt).toContain(KNOWLEDGE_CHAT_SYSTEM_PROMPT)
		expect(result.prompt).toContain('## User Question')
		expect(result.prompt).toContain('What is TypeScript?')
		expect(result.attachedNotesCount).toBe(0)
		expect(result.retrievedNotesCount).toBe(0)
		expect(result.wasTruncated).toBe(false)
	})

	it('includes current date section when provided', () => {
		const currentDate = '2026-01-21'
		const result = buildKnowledgeChatPrompt({
			userPrompt: 'Show AAPL trend',
			currentDate,
		})

		expect(result.prompt).toContain('## Current Date')
		expect(result.prompt).toContain(currentDate)
	})

	it('includes attached notes in prompt', () => {
		const attachedNotes = [
			createNote(
				'1',
				'TypeScript Guide',
				'TypeScript is a typed superset of JavaScript.'
			),
			createNote(
				'2',
				'React Basics',
				'React is a JavaScript library for building UIs.'
			),
		]

		const result = buildKnowledgeChatPrompt({
			userPrompt: 'Tell me about TypeScript',
			attachedNotes,
		})

		expect(result.prompt).toContain('## Attached Notes (User Selected)')
		expect(result.prompt).toContain('### TypeScript Guide')
		expect(result.prompt).toContain('TypeScript is a typed superset of JavaScript.')
		expect(result.prompt).toContain('### React Basics')
		expect(result.attachedNotesCount).toBe(2)
		expect(result.retrievedNotesCount).toBe(0)
	})

	it('includes retrieved notes in prompt', () => {
		const retrievedNotes = [
			createNote('1', 'FTS Result 1', 'Content from full-text search.'),
			createNote('2', 'FTS Result 2', 'More content from search.'),
		]

		const result = buildKnowledgeChatPrompt({
			userPrompt: 'Search query',
			retrievedNotes,
		})

		expect(result.prompt).toContain('## Related Notes (Retrieved)')
		expect(result.prompt).toContain('### FTS Result 1')
		expect(result.prompt).toContain('### FTS Result 2')
		expect(result.attachedNotesCount).toBe(0)
		expect(result.retrievedNotesCount).toBe(2)
	})

	it('includes both attached and retrieved notes', () => {
		const attachedNotes = [
			createNote('1', 'Attached Note', 'User selected content.'),
		]
		const retrievedNotes = [createNote('2', 'Retrieved Note', 'FTS search content.')]

		const result = buildKnowledgeChatPrompt({
			userPrompt: 'My question',
			attachedNotes,
			retrievedNotes,
		})

		expect(result.prompt).toContain('## Attached Notes (User Selected)')
		expect(result.prompt).toContain('## Related Notes (Retrieved)')
		expect(result.attachedNotesCount).toBe(1)
		expect(result.retrievedNotesCount).toBe(1)
	})

	it('deduplicates retrieved notes that are also attached', () => {
		const attachedNotes = [
			createNote('1', 'Same Note', 'This note is both attached and retrieved.'),
		]
		const retrievedNotes = [
			createNote('1', 'Same Note', 'This note is both attached and retrieved.'),
			createNote('2', 'Different Note', 'Only retrieved.'),
		]

		const result = buildKnowledgeChatPrompt({
			userPrompt: 'Question',
			attachedNotes,
			retrievedNotes,
		})

		expect(result.attachedNotesCount).toBe(1)
		expect(result.retrievedNotesCount).toBe(1) // Only the different note
		expect(result.prompt).toContain('### Same Note')
		expect(result.prompt).toContain('### Different Note')

		// Verify Same Note only appears once (in attached section)
		const sameNoteMatches = result.prompt.match(/### Same Note/g)
		expect(sameNoteMatches).toHaveLength(1)
	})

	it('truncates individual notes that exceed max single note chars', () => {
		const longContent = 'A'.repeat(500)
		const attachedNotes = [createNote('1', 'Long Note', longContent)]

		const result = buildKnowledgeChatPrompt({
			userPrompt: 'Question',
			attachedNotes,
			maxSingleNoteChars: 100,
		})

		expect(result.wasTruncated).toBe(true)
		expect(result.prompt).toContain('...')
		expect(result.prompt).not.toContain(longContent)
	})

	it('respects total context budget', () => {
		const notes = Array.from({ length: 10 }, (_, i) =>
			createNote(`${i}`, `Note ${i}`, 'A'.repeat(200))
		)

		const result = buildKnowledgeChatPrompt({
			userPrompt: 'Question',
			attachedNotes: notes,
			maxTotalContextChars: 500,
			maxSingleNoteChars: 300,
		})

		// Should not include all 10 notes due to budget
		expect(result.attachedNotesCount).toBeLessThan(10)
	})

	it('prioritizes attached notes over retrieved notes for budget', () => {
		const attachedNotes = Array.from({ length: 3 }, (_, i) =>
			createNote(`attached-${i}`, `Attached ${i}`, 'A'.repeat(300))
		)
		const retrievedNotes = Array.from({ length: 3 }, (_, i) =>
			createNote(`retrieved-${i}`, `Retrieved ${i}`, 'B'.repeat(300))
		)

		const result = buildKnowledgeChatPrompt({
			userPrompt: 'Question',
			attachedNotes,
			retrievedNotes,
			maxTotalContextChars: 1000,
			maxSingleNoteChars: 400,
		})

		// Attached notes should be included first
		expect(result.attachedNotesCount).toBeGreaterThan(0)
		// Retrieved notes may be limited or excluded due to budget
		expect(
			result.attachedNotesCount + result.retrievedNotesCount
		).toBeLessThanOrEqual(6)
	})

	it('maintains correct prompt structure order', () => {
		const attachedNotes = [createNote('1', 'Attached', 'Content A')]
		const retrievedNotes = [createNote('2', 'Retrieved', 'Content B')]

		const result = buildKnowledgeChatPrompt({
			userPrompt: 'My question',
			attachedNotes,
			retrievedNotes,
		})

		const systemIdx = result.prompt.indexOf(KNOWLEDGE_CHAT_SYSTEM_PROMPT)
		const attachedIdx = result.prompt.indexOf('## Attached Notes')
		const retrievedIdx = result.prompt.indexOf('## Related Notes')
		const userIdx = result.prompt.indexOf('## User Question')

		expect(systemIdx).toBeLessThan(attachedIdx)
		expect(attachedIdx).toBeLessThan(retrievedIdx)
		expect(retrievedIdx).toBeLessThan(userIdx)
	})

	it('handles empty attached notes array', () => {
		const result = buildKnowledgeChatPrompt({
			userPrompt: 'Question',
			attachedNotes: [],
		})

		expect(result.prompt).not.toContain('## Attached Notes')
		expect(result.attachedNotesCount).toBe(0)
	})

	it('handles empty retrieved notes array', () => {
		const result = buildKnowledgeChatPrompt({
			userPrompt: 'Question',
			retrievedNotes: [],
		})

		expect(result.prompt).not.toContain('## Related Notes')
		expect(result.retrievedNotesCount).toBe(0)
	})
})

describe('constants', () => {
	it('exports default RAG top-k value', () => {
		expect(DEFAULT_KNOWLEDGE_CHAT_RAG_TOP_K).toBe(5)
	})

	it('exports system prompt', () => {
		expect(KNOWLEDGE_CHAT_SYSTEM_PROMPT).toContain('knowledge base')
		expect(KNOWLEDGE_CHAT_SYSTEM_PROMPT).toContain('Markdown')
	})
})

describe('buildKnowledgeChatSystemPrompt (conversation mode)', () => {
	const createNote = (
		id: string,
		title: string,
		contentText: string
	): NoteContext => ({
		id,
		title,
		contentText,
	})

	it('builds system prompt without user question', () => {
		const result = buildKnowledgeChatSystemPrompt({})

		expect(result.systemPrompt).toContain(KNOWLEDGE_CHAT_SYSTEM_PROMPT)
		expect(result.systemPrompt).not.toContain('## User Question')
		expect(result.attachedNotesCount).toBe(0)
		expect(result.retrievedNotesCount).toBe(0)
		expect(result.wasTruncated).toBe(false)
	})

	it('includes current date section when provided', () => {
		const currentDate = '2026-01-21'
		const result = buildKnowledgeChatSystemPrompt({ currentDate })

		expect(result.systemPrompt).toContain('## Current Date')
		expect(result.systemPrompt).toContain(currentDate)
	})

	it('includes attached notes in system prompt', () => {
		const attachedNotes = [
			createNote('1', 'Note A', 'Content A'),
			createNote('2', 'Note B', 'Content B'),
		]

		const result = buildKnowledgeChatSystemPrompt({ attachedNotes })

		expect(result.systemPrompt).toContain('## Attached Notes (User Selected)')
		expect(result.systemPrompt).toContain('### Note A')
		expect(result.systemPrompt).toContain('### Note B')
		expect(result.systemPrompt).not.toContain('## User Question')
		expect(result.attachedNotesCount).toBe(2)
	})

	it('includes retrieved notes in system prompt', () => {
		const retrievedNotes = [createNote('1', 'RAG Note', 'RAG content')]

		const result = buildKnowledgeChatSystemPrompt({ retrievedNotes })

		expect(result.systemPrompt).toContain('## Related Notes (Retrieved)')
		expect(result.systemPrompt).toContain('### RAG Note')
		expect(result.systemPrompt).not.toContain('## User Question')
		expect(result.retrievedNotesCount).toBe(1)
	})

	it('deduplicates retrieved notes that are also attached', () => {
		const attachedNotes = [createNote('1', 'Same', 'Content')]
		const retrievedNotes = [
			createNote('1', 'Same', 'Content'),
			createNote('2', 'Different', 'Other'),
		]

		const result = buildKnowledgeChatSystemPrompt({
			attachedNotes,
			retrievedNotes,
		})

		expect(result.attachedNotesCount).toBe(1)
		expect(result.retrievedNotesCount).toBe(1)
	})

	it('maintains correct structure order', () => {
		const attachedNotes = [createNote('1', 'Attached', 'A')]
		const retrievedNotes = [createNote('2', 'Retrieved', 'B')]

		const result = buildKnowledgeChatSystemPrompt({
			attachedNotes,
			retrievedNotes,
		})

		const systemIdx = result.systemPrompt.indexOf(KNOWLEDGE_CHAT_SYSTEM_PROMPT)
		const attachedIdx = result.systemPrompt.indexOf('## Attached Notes')
		const retrievedIdx = result.systemPrompt.indexOf('## Related Notes')

		expect(systemIdx).toBeLessThan(attachedIdx)
		expect(attachedIdx).toBeLessThan(retrievedIdx)
		// Should not have user question section
		expect(result.systemPrompt).not.toContain('## User Question')
	})

	it('respects budget constraints', () => {
		const notes = Array.from({ length: 10 }, (_, i) =>
			createNote(`${i}`, `Note ${i}`, 'A'.repeat(200))
		)

		const result = buildKnowledgeChatSystemPrompt({
			attachedNotes: notes,
			maxTotalContextChars: 500,
			maxSingleNoteChars: 300,
		})

		expect(result.attachedNotesCount).toBeLessThan(10)
	})
})
