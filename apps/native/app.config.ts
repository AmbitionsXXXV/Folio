import type { ExpoConfig } from 'expo/config'
import pkg from './package.json'

const config: ExpoConfig = {
	owner: 'etcetera',
	scheme: 'folio-note',
	userInterfaceStyle: 'automatic',
	orientation: 'default',
	web: {
		bundler: 'metro',
	},
	name: 'FolioNote',
	slug: 'folio-note',
	version: pkg.version,
	plugins: [
		'expo-font',
		'expo-router',
		'expo-web-browser',
		'expo-notifications',
		'expo-localization',
		'expo-sqlite',
		[
			'expo-secure-store',
			{
				configureAndroidBackup: true,
				faceIDPermission:
					'Allow $(PRODUCT_NAME) to access your Face ID biometric data.',
			},
		],
	],
	experiments: {
		typedRoutes: true,
		reactCompiler: true,
	},
	ios: {
		bundleIdentifier: 'com.etcetera.folio-note',
	},
	android: {
		package: 'com.etcetera.folio-note',
	},
	updates: {
		enabled: true,
		url: 'https://u.expo.dev/4a9c4ba0-2493-42f5-8c0d-8bfda5ab0dd1',
	},
	extra: {
		router: {},
		eas: {
			projectId: '4a9c4ba0-2493-42f5-8c0d-8bfda5ab0dd1',
		},
	},
	runtimeVersion: {
		policy: 'appVersion',
	},
}

export default config
