import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Load environment variables from multiple sources
dotenv.config({ path: '.env' })
dotenv.config({ path: '../../apps/server/.env' })
dotenv.config({ path: '../../.env' })

/**
 * Get database URL with fallback options
 * Priority:
 * 1. DATABASE_URL - explicit configuration
 * 2. SUPABASE_DB_URL - Supabase-specific URL
 * 3. Local Supabase default - postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *
 * For local development, you can use any of the following:
 * - Local Supabase: postgresql://postgres:postgres@127.0.0.1:54322/postgres
 * - Docker: postgresql://postgres:password@localhost:5432/folio_note
 * - Brew PostgreSQL: postgresql://postgres:password@localhost:5432/folio_note
 */
function getDatabaseUrl(): string {
	return (
		process.env.DATABASE_URL ||
		process.env.SUPABASE_DB_URL ||
		'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
	)
}

export default defineConfig({
	schema: './src/schema',
	out: './src/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: getDatabaseUrl(),
	},
})
