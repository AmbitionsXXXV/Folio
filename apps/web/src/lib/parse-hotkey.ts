export type KeyboardModifiers = {
	alt: boolean
	ctrl: boolean
	meta: boolean
	mod: boolean
	shift: boolean
	plus: boolean
}

export type Hotkey = KeyboardModifiers & {
	key?: string
}

type CheckHotkeyMatch = (event: KeyboardEvent) => boolean

const keyNameMap: Record<string, string> = {
	' ': 'space',
	ArrowLeft: 'arrowleft',
	ArrowRight: 'arrowright',
	ArrowUp: 'arrowup',
	ArrowDown: 'arrowdown',
	Escape: 'escape',
	Esc: 'escape',
	esc: 'escape',
	Enter: 'enter',
	Tab: 'tab',
	Backspace: 'backspace',
	Delete: 'delete',
	Insert: 'insert',
	Home: 'home',
	End: 'end',
	PageUp: 'pageup',
	PageDown: 'pagedown',
	'+': 'plus',
	'-': 'minus',
	'*': 'asterisk',
	'/': 'slash',
}

function normalizeKey(key: string): string {
	const lowerKey = key.replace('Key', '').toLowerCase()
	return keyNameMap[key] || lowerKey
}

export function parseHotkey(hotkey: string): Hotkey {
	const keys = hotkey
		.toLowerCase()
		.split('+')
		.map((part) => part.trim())

	const modifiers: KeyboardModifiers = {
		alt: keys.includes('alt'),
		ctrl: keys.includes('ctrl'),
		meta: keys.includes('meta'),
		mod: keys.includes('mod'),
		shift: keys.includes('shift'),
		plus: keys.includes('[plus]'),
	}

	const reservedKeys = ['alt', 'ctrl', 'meta', 'shift', 'mod']

	const freeKey = keys.find((key) => !reservedKeys.includes(key))

	return {
		...modifiers,
		key: freeKey === '[plus]' ? '+' : freeKey,
	}
}

function checkModifiers(hotkey: Hotkey, event: KeyboardEvent): boolean {
	const { alt, ctrl, meta, mod, shift } = hotkey
	const { altKey, ctrlKey, metaKey, shiftKey } = event

	if (alt !== altKey) return false
	if (shift !== shiftKey) return false

	if (mod) {
		return ctrlKey || metaKey
	}

	return ctrl === ctrlKey && meta === metaKey
}

function isExactHotkey(
	hotkey: Hotkey,
	event: KeyboardEvent,
	usePhysicalKeys?: boolean
): boolean {
	if (!checkModifiers(hotkey, event)) {
		return false
	}

	const { key } = hotkey
	if (!key) return false

	const { key: pressedKey, code: pressedCode } = event
	const normalizedKey = normalizeKey(key)
	const normalizedPressed = usePhysicalKeys
		? normalizeKey(pressedCode)
		: normalizeKey(pressedKey ?? pressedCode)

	return normalizedKey === normalizedPressed
}

export function getHotkeyMatcher(
	hotkey: string,
	usePhysicalKeys?: boolean
): CheckHotkeyMatch {
	return (event) => isExactHotkey(parseHotkey(hotkey), event, usePhysicalKeys)
}

export type HotkeyItemOptions = {
	preventDefault?: boolean
	usePhysicalKeys?: boolean
}

type HotkeyItem = [string, (event: KeyboardEvent) => void, HotkeyItemOptions?]

export function getHotkeyHandler(hotkeys: HotkeyItem[]) {
	return (event: React.KeyboardEvent<HTMLElement> | KeyboardEvent) => {
		const _event = 'nativeEvent' in event ? event.nativeEvent : event
		for (const [
			hotkey,
			handler,
			options = { preventDefault: true, usePhysicalKeys: false },
		] of hotkeys) {
			if (getHotkeyMatcher(hotkey, options.usePhysicalKeys)(_event)) {
				if (options.preventDefault) {
					event.preventDefault()
				}

				handler(_event)
			}
		}
	}
}
