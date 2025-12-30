import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'
import * as schema from './schema'

/**
 * Open the SQLite database with change listeners enabled for live queries
 */
const expoDb = openDatabaseSync('folionote.db', { enableChangeListener: true })

/**
 * Drizzle ORM instance for local SQLite database
 */
export const localDb = drizzle(expoDb, { schema })

/**
 * Get the raw Expo SQLite database instance
 * Useful for direct SQL execution or debugging
 */
export function getExpoDb() {
	return expoDb
}

export { schema }

// Re-export useMigrations for convenience
export { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
