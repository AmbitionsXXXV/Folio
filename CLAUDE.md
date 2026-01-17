# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FolioNote is a cross-platform personal learning system for capturing, organizing, and revisiting what you learn. Built as a monorepo, it combines React (TanStack Start), React Native (Expo), Hono, oRPC, Drizzle, and PostgreSQL.

## Development Commands

### Common Workflows

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start all apps in development
pnpm build                # Build all apps
pnpm check-types          # Type checking across all apps
pnpm check                # Check for lint/format issues
pnpm check:fix            # Auto-fix lint/format issues
pnpm commit               # Commit with conventional commits (cz-git)
```

### Individual App Development

```bash
pnpm dev:web              # Web app only (TanStack Start)
pnpm dev:server           # Server only (Hono)
pnpm dev:native           # Mobile app only (Expo)
```

### Testing

```bash
pnpm test                 # Run all tests
pnpm test:watch           # Run tests in watch mode
pnpm test:coverage        # Run tests with coverage
pnpm test:server          # Server tests only
pnpm test:api             # API package tests only
pnpm test:db              # Database package tests only
```

### Database Management

```bash
pnpm db:push              # Push schema changes to database
pnpm db:generate          # Generate migration files
pnpm db:migrate           # Run migrations
pnpm db:studio            # Open Drizzle Studio (database UI)

# Supabase (recommended)
pnpm db:start:supabase    # Start Supabase local
pnpm db:stop:supabase     # Stop Supabase
pnpm db:status:supabase   # Check Supabase status
pnpm db:reset:supabase    # Reset Supabase database

# Docker PostgreSQL (alternative)
pnpm db:start:docker
pnpm db:stop:docker

# Local PostgreSQL (alternative)
pnpm db:init:local
pnpm db:start:local
pnpm db:stop:local
```

## Architecture

### Monorepo Structure

**Apps:**
- `apps/web` - React web app (TanStack Start + TanStack Router)
- `apps/native` - React Native mobile app (Expo Router)
- `apps/server` - Hono backend (oRPC + OpenAPI)

**Packages:**
- `packages/api` - oRPC router definitions and procedures
- `packages/auth` - Better Auth configuration
- `packages/db` - Drizzle ORM schema and database connection

### API Layer (oRPC)

End-to-end type-safe API between client and server.

- `packages/api/src/index.ts` - `publicProcedure` and `protectedProcedure` with auth middleware
- `packages/api/src/context.ts` - Request context with session data
- `packages/api/src/routers/` - Route definitions

Server exposes:
- `/rpc/*` - Type-safe RPC calls (RPCHandler)
- `/api-reference/*` - OpenAPI documentation
- `/api/auth/*` - Better Auth endpoints

### Authentication (Better Auth)

- Email/password + Expo plugin for mobile
- Drizzle adapter for PostgreSQL
- `requireAuth` middleware throws `UNAUTHORIZED` if no session
- `protectedProcedure` extends `publicProcedure` with auth requirement

### Database (Drizzle + PostgreSQL)

- Schema: `packages/db/src/schema/`
- Connection: `packages/db/src/index.ts`
- Config: `packages/db/drizzle.config.ts`

**Required env vars** (`apps/server/.env`):
```bash
DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DB_NAME"
AUTH_SECRET="your-secret-key"
AUTH_URL="http://localhost:3001"
CORS_ORIGIN="http://localhost:3001"
```

## Adding New Features

### New API Endpoint

1. Define procedure in `packages/api/src/routers/`
2. Use `publicProcedure` or `protectedProcedure` as base
3. Types automatically propagate to all apps

### New Database Table

1. Define schema in `packages/db/src/schema/`
2. Export from `packages/db/src/index.ts`
3. Run `pnpm db:push` to sync

## Engineering Philosophy

### Decision Priority
1. Correctness & invariants
2. Simplicity (KISS > DRY)
3. Testability / verifiability
4. Maintainability (low coupling, high cohesion)
5. Performance (measure first)

### Change Rules
- Minimal diff; no unrelated churn
- Names use domain language; comments explain WHY
- One abstraction level per function
- Patterns/abstractions only with clear change scenario
- Handle failures explicitly (no silent errors)

### Anti-Patterns
- Premature optimization
- Abstraction before 3rd use
- Swallowing errors / silent failures
- Hidden coupling across modules

## Framework Notes

**TanStack Start:** Use `'use server'` for server functions, `'use client'` for client components

**Expo:** File-based routing with Expo Router, `heroui-native` for UI

**React 19:** Use ref as a prop instead of `React.forwardRef`

## MCP Integration

Use Context7 MCP for library/API documentation lookup.

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:
1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes
