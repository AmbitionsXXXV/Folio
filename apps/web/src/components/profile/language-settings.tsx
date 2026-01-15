import { LANGUAGE_LABELS } from '@folionote/constants'
import { type SupportedLanguage, supportedLanguages } from '@folionote/locales'
import { Card, CardContent, CardHeader, CardTitle } from '@folionote/ui/card'
import { Label } from '@folionote/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@folionote/ui/select'
import { LanguageCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'

/**
 * Language and region settings card
 */
export function LanguageSettings() {
	const { t, i18n } = useTranslation()

	return (
		<Card className="mb-6">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<HugeiconsIcon className="size-5" icon={LanguageCircleIcon} />
					{t('profile.languageAndRegion')}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Language Selection */}
				<div className="flex items-center justify-between">
					<Label htmlFor="language">{t('common.language')}</Label>
					<Select
						onValueChange={(value) => value && i18n.changeLanguage(value)}
						value={i18n.language as SupportedLanguage}
					>
						<SelectTrigger className="w-40" id="language">
							<SelectValue>
								{LANGUAGE_LABELS[i18n.language as SupportedLanguage] ||
									i18n.language}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{supportedLanguages.map((lang) => (
								<SelectItem key={lang} value={lang}>
									{LANGUAGE_LABELS[lang] || lang}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</CardContent>
		</Card>
	)
}
