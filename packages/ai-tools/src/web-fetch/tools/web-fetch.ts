import { createTool } from "@mastra/core/tools"
import type { z } from "zod"

import { fetchUrlContent } from "../api/fetch-url"
import { WebFetchToolInputSchema } from "../schemas"

export const webFetch = createTool({
  id: "webFetch",
  description: [
    "Fetch content from a specified URL and return it in the requested format.",
    "Use this when you need to retrieve and analyze web page content, documentation, or articles.",
    "",
    "Usage notes:",
    "  - The URL must be a fully-formed valid URL (http:// or https://)",
    '  - Format options: "markdown" (default), "text", or "html"',
    "  - This tool is read-only and does not modify any files",
    "  - If another tool offers better web fetching for the task, prefer that tool"
  ].join("\n"),
  inputSchema: WebFetchToolInputSchema,
  execute: async (
    { url, format, timeout }: z.infer<typeof WebFetchToolInputSchema>,
    context
  ) => await fetchUrlContent(url, format, timeout, context?.abortSignal)
})
