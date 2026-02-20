/**
 * RAG (Retrieval Augmented Generation) types
 *
 * RAG enables using user's own notes as context for AI responses
 */

import type { AiProvider } from '../providers/types'

/**
 * Text chunk for embedding and retrieval
 */
export interface TextChunk {
	/** Chunk index within the entry */
	chunkIndex: number
	createdAt: Date
	/** Embedding vector */
	embedding?: number[]
	/** Model used for embedding */
	embeddingModel?: string
	/** Provider used for embedding */
	embeddingProvider?: AiProvider
	/** Embedding version (for cache invalidation) */
	embeddingVersion?: string
	entryId: string
	id: string
	/** Chunk metadata (e.g., position, heading) */
	metadata?: Record<string, unknown>
	/** Chunk text content */
	text: string
	userId: string
}

/**
 * Chunker interface
 */
export interface Chunker {
	/**
	 * Split text into chunks
	 */
	chunk(text: string, options?: ChunkOptions): TextChunk[]
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
 * Embedding provider interface
 */
export interface EmbeddingProvider {
	/**
	 * Generate embeddings for texts
	 */
	embed(texts: string[]): Promise<number[][]>

	/**
	 * Get embedding dimension
	 */
	getDimension(): number
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
 * Retriever interface
 */
export interface Retriever {
	/**
	 * Retrieve relevant chunks for a query
	 */
	retrieve(
		userId: string,
		query: string,
		options?: RetrieveOptions
	): Promise<RetrievalResult[]>
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
	/**
	 * Index chunks for an entry
	 */
	indexEntry(entryId: string, chunks: TextChunk[]): Promise<void>

	/**
	 * Check if entry needs re-indexing
	 */
	needsReindex(entryId: string, contentHash: string): Promise<boolean>

	/**
	 * Remove chunks for an entry
	 */
	removeEntry(entryId: string): Promise<void>
}
