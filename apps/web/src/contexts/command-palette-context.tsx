import { createContext, use, useCallback, useMemo, useState } from 'react'

type CommandPaletteContextType = {
	open: boolean
	setOpen: (open: boolean) => void
	toggle: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null)

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false)

	const toggle = useCallback(() => {
		setOpen((prev) => !prev)
	}, [])

	const value = useMemo(
		() => ({
			open,
			setOpen,
			toggle,
		}),
		[open, toggle]
	)

	return <CommandPaletteContext value={value}>{children}</CommandPaletteContext>
}

export function useCommandPalette() {
	const context = use(CommandPaletteContext)
	if (!context) {
		throw new Error('useCommandPalette must be used within CommandPaletteProvider')
	}
	return context
}
