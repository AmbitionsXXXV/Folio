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
	/** Node execution function */
	execute: (input: TInput, context: GraphContext) => Promise<TOutput>
	/** Unique node ID */
	id: string
	/** Human-readable name */
	name: string
	/** Optional retry configuration */
	retry?: RetryConfig
}

/**
 * Retry configuration
 */
export interface RetryConfig {
	/** Exponential backoff multiplier */
	backoffMultiplier?: number
	/** Base delay in milliseconds */
	baseDelayMs: number
	/** Maximum retry attempts */
	maxAttempts: number
}

/**
 * Graph execution context
 */
export interface GraphContext {
	/** Run ID for tracing */
	runId: string
	/** Signal for cancellation */
	signal?: AbortSignal
	/** Accumulated state from previous nodes */
	state: Record<string, unknown>
	/** User ID */
	userId: string
}

/**
 * Edge definition (connection between nodes)
 */
export interface GraphEdge {
	/** Optional condition for traversal */
	condition?: (context: GraphContext) => boolean
	/** Source node ID */
	from: string
	/** Target node ID */
	to: string
}

/**
 * Graph definition
 */
export interface GraphDefinition<_TInput, TOutput> {
	/** Edges between nodes */
	edges: GraphEdge[]
	/** Entry node ID */
	entryNode: string
	/** Graph ID */
	id: string
	/** Human-readable name */
	name: string
	/** All nodes */
	nodes: GraphNode<unknown, unknown>[]
	/** Transform final output */
	outputTransform?: (context: GraphContext) => TOutput
}

/**
 * Graph execution result
 */
export interface GraphResult<TOutput> {
	/** Error if failed */
	error?: Error
	/** Output if successful */
	output?: TOutput
	/** Whether execution succeeded */
	success: boolean
	/** Total execution time in milliseconds */
	totalTimeMs: number
	/** Execution trace */
	trace: NodeTrace[]
}

/**
 * Node execution trace
 */
export interface NodeTrace {
	durationMs?: number
	endTime?: Date
	error?: string
	nodeId: string
	retryCount?: number
	startTime: Date
	state: NodeState
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
