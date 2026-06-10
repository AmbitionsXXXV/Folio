import { expo } from "@better-auth/expo"
import { USER_ADDITIONAL_FIELDS_SCHEMA } from "@folionote/constants"
import { db } from "@folionote/db"
import {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification
} from "@folionote/db/schema/auth"
import { ResetPasswordEmail } from "@folionote/transactional"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import "dotenv/config"
import { Resend } from "resend"

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const trustedOrigins = process.env.CORS_ORIGIN?.split(",")
  .map((origin: string) => origin.trim())
  .filter((origin: string) => origin.length > 0)

const cookieDomainFromBaseUrl = (() => {
  const baseUrl = process.env.BETTER_AUTH_URL
  if (!baseUrl) {
    return null
  }

  try {
    const { hostname } = new URL(baseUrl)
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return null
    }

    const hostnameParts = hostname.split(".")
    if (hostnameParts.length < 2) {
      return null
    }

    // For e.g. api.folionote.xyz -> folionote.xyz
    return hostnameParts.slice(-2).join(".")
  } catch {
    return null
  }
})()

// The server process supplies BETTER_AUTH_URL. The web SSR process imports this
// module (via the oRPC context) but loads none of the server's env, so fall
// back to the local server URL in development to avoid Better Auth warning that
// it must derive the origin per-request. In production, leave it unset so the
// origin is request-derived rather than pinned to a wrong default.
const LOCAL_AUTH_URL = "http://localhost:3000"
const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.VITE_SERVER_URL ??
  (process.env.NODE_ENV === "production" ? undefined : LOCAL_AUTH_URL)

interface SocialProviderCredentials {
  clientId: string
  clientSecret: string
}

// Only register an OAuth provider when both halves of its credentials are
// present. The web SSR process has none, so it skips them silently instead of
// warning; the server process supplies them and enables the providers.
function readSocialCredentials(
  clientId: string | undefined,
  clientSecret: string | undefined
): SocialProviderCredentials | null {
  if (clientId && clientSecret) {
    return { clientId, clientSecret }
  }
  return null
}

const githubCredentials = readSocialCredentials(
  process.env.GITHUB_CLIENT_ID,
  process.env.GITHUB_CLIENT_SECRET
)
const googleCredentials = readSocialCredentials(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
)

const socialProviders = {
  ...(githubCredentials ? { github: githubCredentials } : {}),
  ...(googleCredentials
    ? { google: { ...googleCredentials, prompt: "select_account" as const } }
    : {})
}

/**
 * Send password reset email to user using Resend with React Email template.
 * Falls back to console logging in development or when RESEND_API_KEY is not set.
 */
async function sendResetPasswordEmail({
  user: targetUser,
  url
}: {
  user: { email: string; name: string }
  url: string
}): Promise<void> {
  // If Resend is not configured, log to console (development mode)
  if (!resend) {
    console.log("=".repeat(60))
    console.log("[Password Reset] RESEND_API_KEY not set, logging to console")
    console.log("[Password Reset] Email would be sent to:", targetUser.email)
    console.log("[Password Reset] Reset URL:", url)
    console.log("=".repeat(60))
    return
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "FolioNote <onboarding@resend.dev>",
    to: targetUser.email,
    subject: "Reset your FolioNote password",
    react: ResetPasswordEmail({
      userName: targetUser.name,
      resetUrl: url
    })
  })

  if (error) {
    console.error("[Password Reset] Failed to send email:", error)
    throw new Error(`Failed to send password reset email: ${error.message}`)
  }

  console.log("[Password Reset] Email sent successfully to:", targetUser.email)
}

export const auth = betterAuth({
  // account: { skipStateCookieCheck: true },
  baseURL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      userRelations,
      session,
      sessionRelations,
      account,
      accountRelations,
      verification
    }
  }),
  user: {
    additionalFields: {
      no: {
        ...USER_ADDITIONAL_FIELDS_SCHEMA.no,
        input: false
      }
    }
  },
  trustedOrigins: [
    ...(trustedOrigins ?? []),
    "http://localhost:3001",
    "http://localhost:3000",
    "http://localhost:7890",
    "exp://",
    "folio-note://"
  ],
  socialProviders,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail({ user, url })
    }
  },
  advanced: {
    disableCSRFCheck: true,
    ...(cookieDomainFromBaseUrl
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: cookieDomainFromBaseUrl
          }
        }
      : {}),
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true
      // partitioned: true,
    }
  },
  plugins: [expo()]
})
