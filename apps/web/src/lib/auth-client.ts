import { USER_ADDITIONAL_FIELDS_SCHEMA } from '@folionote/constants'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { getServerUrl } from '@/utils/api-environment'

export const authClient = createAuthClient({
	baseURL: getServerUrl(),
	plugins: [inferAdditionalFields({ user: USER_ADDITIONAL_FIELDS_SCHEMA })],
})
