import { expoClient } from '@better-auth/expo/client'
import { USER_ADDITIONAL_FIELDS_SCHEMA } from '@folionote/constants'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'

export const authClient = createAuthClient({
	baseURL: process.env.EXPO_PUBLIC_SERVER_URL,
	plugins: [
		expoClient({
			scheme: Constants.expoConfig?.scheme as string,
			storagePrefix: Constants.expoConfig?.scheme as string,
			storage: SecureStore,
		}),
		inferAdditionalFields({ user: USER_ADDITIONAL_FIELDS_SCHEMA }),
	],
})
