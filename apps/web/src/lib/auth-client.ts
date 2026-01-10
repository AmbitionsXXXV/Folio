import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_SERVER_URL,
	plugins: [
		inferAdditionalFields({
			user: {
				/** 用户编号，自动递增，用于展示 */
				no: {
					type: 'number',
					required: false,
				},
			},
		}),
	],
})
