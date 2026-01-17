import type { Hono } from 'hono'
import type { RequestIdVariables } from 'hono/request-id'

/** Custom variables for Hono context */
export type AppVariables = RequestIdVariables & {
	language: string
}

/** App type with custom variables */
export type App = Hono<{ Variables: AppVariables }>
