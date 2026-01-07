import { expo } from '@better-auth/expo'
import { db } from '@folionote/db'
import {
	account,
	accountRelations,
	session,
	sessionRelations,
	user,
	userRelations,
	verification,
} from '@folionote/db/schema/auth'
import { ResetPasswordEmail } from '@folionote/transactional'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import 'dotenv/config'
import { Resend } from 'resend'

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
	? new Resend(process.env.RESEND_API_KEY)
	: null

/**
 * Send password reset email to user using Resend with React Email template.
 * Falls back to console logging in development or when RESEND_API_KEY is not set.
 */
async function sendResetPasswordEmail({
	user: targetUser,
	url,
}: {
	user: { email: string; name: string }
	url: string
}): Promise<void> {
	// If Resend is not configured, log to console (development mode)
	if (!resend) {
		console.log('='.repeat(60))
		console.log('[Password Reset] RESEND_API_KEY not set, logging to console')
		console.log('[Password Reset] Email would be sent to:', targetUser.email)
		console.log('[Password Reset] Reset URL:', url)
		console.log('='.repeat(60))
		return
	}

	const { error } = await resend.emails.send({
		from: process.env.EMAIL_FROM || 'FolioNote <onboarding@resend.dev>',
		to: targetUser.email,
		subject: 'Reset your FolioNote password',
		react: ResetPasswordEmail({
			userName: targetUser.name,
			resetUrl: url,
		}),
	})

	if (error) {
		console.error('[Password Reset] Failed to send email:', error)
		throw new Error(`Failed to send password reset email: ${error.message}`)
	}

	console.log('[Password Reset] Email sent successfully to:', targetUser.email)
}

export const auth = betterAuth({
	// account: { skipStateCookieCheck: true },
	baseURL: process.env.BETTER_AUTH_URL as string,
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user,
			userRelations,
			session,
			sessionRelations,
			account,
			accountRelations,
			verification,
		},
	}),
	trustedOrigins: [
		...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []),
		'exp://',
		'folio-note://',
	],
	socialProviders: {
		github: {
			enabled: true,
			clientId: process.env.GITHUB_CLIENT_ID as string,
			clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
		},
		google: {
			enabled: true,
			prompt: 'select_account',
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
		},
	},
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			await sendResetPasswordEmail({ user, url })
		},
	},
	advanced: {
		disableCSRFCheck: true,
		// crossSubDomainCookies: {
		// 	enabled: true,
		// 	domain: 'http://localhost',
		// },
		defaultCookieAttributes: {
			sameSite: 'none',
			secure: true,
			httpOnly: true,
			// partitioned: true,
		},
	},
	plugins: [expo()],
})
