import { Loading02FreeIcons } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export default function Loader() {
	return (
		<div className="flex h-full items-center justify-center pt-8">
			<HugeiconsIcon className="animate-spin" icon={Loading02FreeIcons} size={24} />
		</div>
	)
}
