/**
 * Mastra runtime instance for the server.
 *
 * The server owns Mastra's runtime configuration (agent registry, and later
 * memory/storage). Agents are consumed as a library by the existing Hono routes
 * rather than served by Mastra's own HTTP server, which preserves the current
 * deployment topology. Registering agents here also exposes them to Mastra
 * Studio (`mastra dev`) for inspection.
 */

import { Mastra } from "@mastra/core"

import { knowledgeChatAgent } from "./agents/knowledge-chat-agent"

export const mastra = new Mastra({
  agents: { knowledgeChatAgent }
})
