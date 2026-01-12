import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	ShareContent,
	ShareErrorPage,
	ShareLoading,
	SharePasswordForm,
} from '@/components/share'
import { getShareErrorMessage } from '@/lib/share-error'
import { orpc } from '@/utils/orpc'

export const Route = createFileRoute('/share/$token')({
	component: ShareViewPage,
	head: () => ({
		meta: [
			{
				title: 'Shared Note - FolioNote',
			},
		],
	}),
})

function ShareViewPage() {
	const { t } = useTranslation()
	const { token } = Route.useParams()
	const [password, setPassword] = useState('')
	const [isPasswordVerified, setIsPasswordVerified] = useState(false)

	// Check if share requires password
	const {
		data: shareStatus,
		isLoading: isCheckingPassword,
		error: checkError,
	} = useQuery({
		queryKey: ['share-check', token],
		queryFn: () => orpc.shares.checkRequiresPassword.call({ shareToken: token }),
		retry: false,
	})

	// Fetch shared entry content
	const {
		data: entryData,
		isLoading: isLoadingEntry,
		error: entryError,
	} = useQuery({
		queryKey: ['share-entry', token, isPasswordVerified ? password : ''],
		queryFn: () =>
			orpc.shares.getPublicEntry.call({
				shareToken: token,
				password: shareStatus?.requiresPassword ? password : undefined,
			}),
		enabled: !!shareStatus && (!shareStatus.requiresPassword || isPasswordVerified),
		retry: false,
	})

	// Password verification mutation
	const verifyPasswordMutation = useMutation({
		mutationFn: async () => {
			await orpc.shares.getPublicEntry.call({
				shareToken: token,
				password,
			})
		},
		onSuccess: () => {
			setIsPasswordVerified(true)
		},
	})

	// Loading state
	if (isCheckingPassword) {
		return <ShareLoading />
	}

	// Error states
	if (checkError) {
		const errorMessage = getShareErrorMessage(checkError)
		return (
			<ShareErrorPage
				description={errorMessage.description}
				title={errorMessage.title}
			/>
		)
	}

	// Password required but not verified
	if (shareStatus?.requiresPassword && !isPasswordVerified) {
		return (
			<SharePasswordForm
				error={verifyPasswordMutation.error}
				isPending={verifyPasswordMutation.isPending}
				onPasswordChange={setPassword}
				onSubmit={() => verifyPasswordMutation.mutate()}
				password={password}
			/>
		)
	}

	// Loading entry
	if (isLoadingEntry) {
		return <ShareLoading />
	}

	// Entry error
	if (entryError) {
		const errorMessage = getShareErrorMessage(entryError)
		return (
			<ShareErrorPage
				description={errorMessage.description}
				title={errorMessage.title}
			/>
		)
	}

	// No entry data
	if (!entryData) {
		return (
			<ShareErrorPage
				description={t('share.notFoundDesc')}
				title={t('share.notFound')}
			/>
		)
	}

	return <ShareContent entryData={entryData} />
}
