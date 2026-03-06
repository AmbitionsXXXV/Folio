import type { App } from '../../types'
import { registerChatRoutes } from './chat-routes'
import { registerImageRoutes } from './image-routes'
import { registerStreamRoute } from './stream-route'

/**
 * Register AI streaming routes
 *
 * Implements AI SDK v6 message persistence best practices:
 * - Server-generated message IDs via createIdGenerator
 * - Unified saveChat in onFinish callback
 * - consumeStream for disconnect resilience
 * - toUIMessageStreamResponse for proper UIMessage format
 */
export function registerAiStreamRoute(app: App) {
	registerChatRoutes(app)
	registerImageRoutes(app)
	registerStreamRoute(app)
}
