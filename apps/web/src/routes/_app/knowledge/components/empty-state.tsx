import { AiBrain01Icon, Setting06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

type EmptyStateProps = {
	hasApiKey: boolean
}

export function EmptyState({ hasApiKey }: EmptyStateProps) {
	const { t } = useTranslation()

	return (
		<div className="flex h-full flex-col items-center justify-center text-center">
			<HugeiconsIcon
				className="mb-4 size-12 text-muted-foreground/50"
				icon={AiBrain01Icon}
			/>
			<h3 className="mb-2 text-balance font-medium text-lg">
				{t('knowledge.emptyState.title')}
			</h3>
			<p className="max-w-sm text-pretty text-muted-foreground text-sm">
				{t('knowledge.emptyState.description')}
			</p>
			{!hasApiKey && (
				<div className="mt-4">
					<Link to="/settings/models">
						<Button>
							<HugeiconsIcon className="mr-2 size-4" icon={Setting06Icon} />
							{t('knowledge.manageApiKeys')}
						</Button>
					</Link>
				</div>
			)}
		</div>
	)
}
