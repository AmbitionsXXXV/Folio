import 'dotenv/config'
import { createLogger } from '@folionote/log'
import { serve } from '@hono/node-server'
import { app } from './app'
import { initI18n } from './i18n'

await initI18n()

const log = createLogger({ prefix: 'server' })

const port = Number(process.env.PORT) || 3000

log.info(`Server is running on http://localhost:${port}`)

serve({
	fetch: app.fetch,
	port,
})

export default app
