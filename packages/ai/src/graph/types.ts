/**
 * Workflow graph types (LangGraph-style)
 *
 * For orchestrating multi-step AI workflows like ReviewSuggest
 */

/**
 * Graph node state
 */
export type NodeState = 'pending' | 'running' | 'success' | 'error' | 'skipped'

/**
 * Graph node definition
 */
export interface GraphNode<TInput, TOutput> {
	/** Unique node ID */
	id: string
	/** Human-readable name */
	name: string
	/** Node execution function */
	execute: (input: TInput, context: GraphContext) => Promise<TOutput>
	/** Optional retry configuration */
	retry?: RetryConfig
}

/**
 * Retry configuration
 */
export interface RetryConfig {
	/** Maximum retry attempts */
	maxAttempts: number
	/** Base delay in milliseconds */
	baseDelayMs: number
	/** Exponential backoff multiplier */
	backoffMultiplier?: number
}

/**
 * Graph execution context
 */
export interface GraphContext {
	/** User ID */
	userId: string
	/** Run ID for tracing */
	runId: string
	/** Accumulated state from previous nodes */
	state: Record<string, unknown>
	/** Signal for cancellation */
	signal?: AbortSignal
}

/**
 * Edge definition (connection between nodes)
 */
export interface GraphEdge {
	/** Source node ID */
	from: string
	/** Target node ID */
	to: string
	/** Optional condition for traversal */
	condition?: (context: GraphContext) => boolean
}

/**
 * Graph definition
 */
export interface GraphDefinition<_TInput, TOutput> {
	/** Graph ID */
	id: string
	/** Human-readable name */
	name: string
	/** Entry node ID */
	entryNode: string
	/** All nodes */
	nodes: GraphNode<unknown, unknown>[]
	/** Edges between nodes */
	edges: GraphEdge[]
	/** Transform final output */
	outputTransform?: (context: GraphContext) => TOutput
}

/**
 * Graph execution result
 */
export interface GraphResult<TOutput> {
	/** Whether execution succeeded */
	success: boolean
	/** Output if successful */
	output?: TOutput
	/** Error if failed */
	error?: Error
	/** Execution trace */
	trace: NodeTrace[]
	/** Total execution time in milliseconds */
	totalTimeMs: number
}

/**
 * Node execution trace
 */
export interface NodeTrace {
	nodeId: string
	state: NodeState
	startTime: Date
	endTime?: Date
	durationMs?: number
	error?: string
	retryCount?: number
}

/**
 * Graph executor interface
 */
export interface GraphExecutor<TInput, TOutput> {
	/**
	 * Execute the graph
	 */
	execute(input: TInput, context: GraphContext): Promise<GraphResult<TOutput>>
}
