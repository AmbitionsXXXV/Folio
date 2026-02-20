# Knowledge Chat Context Tracking and Auto Compact

## Goal

Rebuild per-session context usage tracking with server usage as the primary signal, then auto-compact long chats when context usage nears the current model limit.

## Scope

1. Frontend tracks per-session context usage with `tokenlens`.
2. Knowledge input footer shows live context usage with hover details.
3. Server adds `POST /api/ai/compact` for context compaction.
4. Client auto-triggers compaction when `shouldCompact` is true.
5. Chat list renders a compact marker message.

## Token Calculation Strategy

1. **Server usage first**: latest assistant `metadata.usage.inputTokens`.
2. **tokenlens context logic**: `contextHealth`, `shouldCompact`, `tokensToCompact`, `getContextWindow`, `getTokenCosts`.
3. **Client fallback**: estimated tokens (`text.length / 4`) only when server usage is unavailable.

## Frontend Changes

### New Hook

- File: `apps/web/src/hooks/use-session-context-usage.ts`
- Outputs:
  - `usedTokens`, `maxTokens`, `percent`
  - `status` (`ok` / `warn` / `compact`)
  - `shouldCompact`, `tokensToCompact`
  - aggregated session usage and estimated cost
  - source marker (`server` / `estimated`)

### Input Footer Context UI

- File: `apps/web/src/routes/_app/knowledge.tsx`
- Integrated `Context` / `ContextTrigger` / `ContextContent`.
- Context hover details include remaining tokens, resolved model context, status, and usage source (`server` / `estimated`).
- Added compact banner with one-click compact action.

### Compact Event Rendering

- File: `apps/web/src/features/knowledge/components/compact-message.tsx`
- File: `apps/web/src/features/knowledge/components/message-list.tsx`
- Compacted summary messages render as a divider-style marker with expandable summary details.

## Server API

### New Endpoint

- File: `apps/server/src/routes/ai-stream.ts`
- Route: `POST /api/ai/compact`
- Input:
  - `chatId`, `provider`, `apiKey`
  - optional `baseUrl`, `model`, `messages`, `keepRecentCount`, `tokensToCompact`
- Behavior:
  1. Select old messages to summarize and keep recent tail messages.
  2. Generate compact summary with the same provider/model.
  3. Persist compacted messages back to chat storage.
  4. Return compact metadata and compacted message set.

### Stream Metadata Enrichment

- Existing `POST /api/ai/stream` now also writes `costUSD` into `message.metadata.usage`.

## Data and Types

- `CompactInfo` added to `apps/web/src/features/knowledge/types.ts`.
- `cachedInputTokens` added to message usage types for context and pricing extensibility.
- Tokenlens model ID helper added to `apps/web/src/features/knowledge/utils.ts`.

## i18n

Updated:

- `packages/locales/src/resources/zh-CN.json`
- `packages/locales/src/resources/en-US.json`
- `packages/locales/src/resources/ja-JP.json`

Added compact-related keys for banner text, action buttons, marker title, metadata, and success notifications.

## Validation

```bash
pnpm run check-types
```

Type checking passes for all packages and apps after these changes.
