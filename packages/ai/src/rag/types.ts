/**
 * RAG (Retrieval Augmented Generation) types
 *
 * RAG enables using user's own notes as context for AI responses.
 *
 * Embedding generation is handled by AI SDK's native `embed()` / `embedMany()`
 * paired with `createVercelAiEmbeddingModel` -- no custom bridging layer needed.
 */

import type { AiProvider } from '../providers/types'

/**
 * Embedding index status tracked on entries.
 */
export type EmbeddingStatus = 'failed' | 'indexed' | 'no_provider' | 'pending'

/**
 * Text chunk for embedding and retrieval
 */
export interface TextChunk {
	/** Chunk index within the entry */
	chunkIndex: number
	createdAt: Date
	/** Embedding vector (populated after indexing) */
	embedding?: number[]
	/** Model used for embedding */
	embeddingModel?: string
	/** Provider used for embedding */
	embeddingProvider?: AiProvider
	entryId: string
	id: string
	/** Chunk metadata (e.g., position, heading) */
	metadata?: Record<string, unknown>
	/** Chunk text content */
	text: string
	userId: string
}

/**
 * Chunking options
 */
export interface ChunkOptions {
	/** Maximum chunk size in characters */
	maxChunkSize?: number
	/** Overlap between chunks in characters */
	overlap?: number
	/** Split by paragraphs first */
	splitByParagraph?: boolean
}

/**
 * Retrieval result
 */
export interface RetrievalResult {
	chunk: TextChunk
	/** Similarity score (0-1, higher is better) */
	score: number
}

/**
 * Retrieval options
 */
export interface RetrieveOptions {
	/** Filter by entry IDs */
	entryIds?: string[]
	/** Exclude entry IDs */
	excludeEntryIds?: string[]
	/** Minimum similarity threshold */
	minScore?: number
	/** Maximum number of results */
	topK?: number
}

/**
 * Indexer interface for managing chunk embeddings
 */
export interface Indexer {
	indexEntry(entryId: string, chunks: TextChunk[]): Promise<void>
	needsReindex(entryId: string, contentHash: string): Promise<boolean>
	removeEntry(entryId: string): Promise<void>
}
