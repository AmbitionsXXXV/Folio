import { USER_ADDITIONAL_FIELDS_SCHEMA } from '@folionote/constants'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_SERVER_URL,
	plugins: [inferAdditionalFields({ user: USER_ADDITIONAL_FIELDS_SCHEMA })],
})
