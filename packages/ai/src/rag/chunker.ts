/**
 * Text splitting for RAG indexing.
 *
 * Uses @langchain/textsplitters for recursive character splitting
 * with Chinese-aware separators.
 */
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

const DEFAULT_CHUNK_SIZE = 800
const DEFAULT_CHUNK_OVERLAP = 200

const SEPARATORS = ['\n\n', '\n', '。', '.', '；', ';', '，', ',', ' ', '']

export interface ChunkResult {
	chunkIndex: number
	content: string
	metadata: Record<string, unknown>
}

export interface SplitOptions {
	chunkOverlap?: number
	chunkSize?: number
}

/**
 * Split entry content into chunks for embedding.
 *
 * - Short content (below chunkSize) is kept as a single chunk.
 * - Each chunk is prefixed with the entry title to preserve semantic context.
 * - Separators prioritize paragraph / sentence boundaries (including CJK).
 */
export async function splitEntryContent(
	title: string,
	contentText: string,
	options?: SplitOptions
): Promise<ChunkResult[]> {
	const trimmedContent = contentText.trim()
	if (!trimmedContent) {
		return []
	}

	const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE
	const rawOverlap = options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP
	const chunkOverlap = Math.min(rawOverlap, Math.floor(chunkSize * 0.4))
	const titlePrefix = title.trim() ? `# ${title.trim()}\n\n` : ''

	if (trimmedContent.length <= chunkSize) {
		return [
			{
				chunkIndex: 0,
				content: `${titlePrefix}${trimmedContent}`,
				metadata: { isFullContent: true },
			},
		]
	}

	const splitter = new RecursiveCharacterTextSplitter({
		chunkOverlap,
		chunkSize,
		separators: SEPARATORS,
	})

	const docs = await splitter.createDocuments([trimmedContent])

	return docs.map((doc, idx) => ({
		chunkIndex: idx,
		content: `${titlePrefix}${doc.pageContent}`,
		metadata: {
			start: doc.metadata.loc?.lines?.from as number | undefined,
			end: doc.metadata.loc?.lines?.to as number | undefined,
		},
	}))
}
