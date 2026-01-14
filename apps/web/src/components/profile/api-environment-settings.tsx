import { CloudServerIcon, ComputerIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useApiEnvironment } from '@/hooks/use-api-environment'

/**
 * API Environment settings card with local/remote toggle
 * Only shown in development mode
 */
export function ApiEnvironmentSettings() {
	const { t } = useTranslation()
	const { setApiEnvironment, serverUrl, isRemote } = useApiEnvironment()

	// Only show in development mode
	if (import.meta.env.MODE === 'production') {
		return null
	}

	return (
		<Card className="mb-6">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<HugeiconsIcon className="size-5" icon={CloudServerIcon} />
					{t('settings.apiEnvironment.title')}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Environment Toggle */}
				<div className="flex items-center justify-between">
					<div className="flex-1">
						<Label className="cursor-pointer" htmlFor="api-env">
							{t('settings.apiEnvironment.useRemoteServer')}
						</Label>
						<p className="text-muted-foreground text-xs">
							{isRemote
								? t('settings.apiEnvironment.remoteDescription')
								: t('settings.apiEnvironment.localDescription')}
						</p>
					</div>
					<Switch
						checked={isRemote}
						id="api-env"
						onCheckedChange={(checked) =>
							setApiEnvironment(checked ? 'remote' : 'local')
						}
					/>
				</div>

				{/* Current Server URL Display */}
				<div className="rounded-lg border bg-muted/30 p-3">
					<div className="mb-1 flex items-center gap-2 text-muted-foreground text-xs">
						<HugeiconsIcon
							className="size-3.5"
							icon={isRemote ? CloudServerIcon : ComputerIcon}
						/>
						{t('settings.apiEnvironment.currentServer')}
					</div>
					<code className="font-mono text-foreground text-xs">{serverUrl}</code>
				</div>

				{/* CORS Notice for Remote Server */}
				{isRemote && (
					<div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
						<p className="text-blue-900 text-xs dark:text-blue-200">
							💡 {t('settings.apiEnvironment.corsNotice')}
						</p>
					</div>
				)}

				{/* Warning */}
				<p className="text-muted-foreground text-xs">
					⚠️ {t('settings.apiEnvironment.reloadWarning')}
				</p>
			</CardContent>
		</Card>
	)
}
