import type { App } from '../types'
import { registerAiStreamRoute } from './ai-stream'
import { registerHealthRoutes } from './health'

/**
 * Register all application routes
 */
export function registerRoutes(app: App) {
	registerHealthRoutes(app)
	registerAiStreamRoute(app)
}
