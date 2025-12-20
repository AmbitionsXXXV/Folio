import type { RouterClient } from '@orpc/server'
import { protectedProcedure, publicProcedure } from '../index'
import { entriesRouter } from './entries'
import { reviewRouter } from './review'
import { searchRouter } from './search'
import { sourcesRouter } from './sources'
import { tagsRouter } from './tags'

export const appRouter = {
	healthCheck: publicProcedure.handler(() => 'OK'),
	privateData: protectedProcedure.handler(({ context }) => ({
		message: 'This is private',
		user: context.session?.user,
	})),
	entries: entriesRouter,
	tags: tagsRouter,
	sources: sourcesRouter,
	search: searchRouter,
	review: reviewRouter,
}
export type AppRouter = typeof appRouter
export type AppRouterClient = RouterClient<typeof appRouter>
