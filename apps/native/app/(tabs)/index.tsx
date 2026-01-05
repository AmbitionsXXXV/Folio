import { Redirect } from 'expo-router'

/**
 * Default route for (tabs) group
 * Redirects to /home which is the actual home tab
 *
 * This file exists to satisfy Expo Router's requirement for an index route
 * while avoiding the "screens with the same name nested inside one another" warning
 */
export default function TabsIndex() {
	return <Redirect href="/home" />
}
