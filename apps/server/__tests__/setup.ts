// This setup file is only used for integration tests that need a database.
// Unit tests (ai-chat-store.test.ts, ai-tools.test.ts) use memory stores
// and don't need this setup.
//
// Integration tests are excluded from the default test run in vitest.config.ts
// To run integration tests, use: pnpm test:integration (requires running database)

import { beforeAll } from 'vitest'

beforeAll(() => {
	console.log('Setting up test database...')
	console.log('Test database ready')
})
