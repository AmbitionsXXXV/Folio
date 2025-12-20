import { useEffect } from 'react'
import { getHotkeyMatcher, type HotkeyItemOptions } from '@/lib/parse-hotkey'

export type { HotkeyItemOptions } from '@/lib/parse-hotkey'
export { getHotkeyHandler } from '@/lib/parse-hotkey'

export type HotkeyItem = [string, (event: KeyboardEvent) => void, HotkeyItemOptions?]

function shouldFireEvent(
	event: KeyboardEvent,
	tagsToIgnore: string[],
	triggerOnContentEditable = false
) {
	if (event.target instanceof HTMLElement) {
		if (triggerOnContentEditable) {
			return !tagsToIgnore.includes(event.target.tagName)
		}

		return !(
			event.target.isContentEditable || tagsToIgnore.includes(event.target.tagName)
		)
	}

	return true
}

export function useHotkeys(
	hotkeys: HotkeyItem[],
	tagsToIgnore: string[] = ['INPUT', 'TEXTAREA', 'SELECT'],
	triggerOnContentEditable = false
) {
	useEffect(() => {
		const keydownListener = (event: KeyboardEvent) => {
			for (const [
				hotkey,
				handler,
				options = { preventDefault: true, usePhysicalKeys: false },
			] of hotkeys) {
				if (
					getHotkeyMatcher(hotkey, options.usePhysicalKeys)(event) &&
					shouldFireEvent(event, tagsToIgnore, triggerOnContentEditable)
				) {
					if (options.preventDefault) {
						event.preventDefault()
					}
					handler(event)
				}
			}
		}

		document.documentElement.addEventListener('keydown', keydownListener)
		return () =>
			document.documentElement.removeEventListener('keydown', keydownListener)
	}, [hotkeys])
}
