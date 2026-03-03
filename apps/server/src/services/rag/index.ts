export { indexQueue } from './index-queue'
export { indexEntry } from './index-worker'
export { multiRetrieve, type ScoredNoteContext } from './multi-retriever'
export { type RagPipelineConfig, ragRetrieve } from './pipeline'
export { rewriteQuery } from './query-rewriter'
export { rerankNotes } from './reranker'
export { searchByVectorSimilarity } from './vector-retriever'

import { indexQueue } from './index-queue'
import { indexEntry } from './index-worker'

indexQueue.setWorker(indexEntry)
