import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from '@react-email/components'
import { tailwindConfig } from '../src/theme'

interface ResetPasswordEmailProps {
	resetUrl: string
	userName: string
}

export function ResetPasswordEmail({
	userName = 'User',
	resetUrl = 'https://example.com/reset-password',
}: ResetPasswordEmailProps) {
	return (
		<Html>
			<Head />
			<Preview>Reset your FolioNote password</Preview>
			<Tailwind config={tailwindConfig}>
				<Body className="bg-background font-sans">
					<Container className="mx-auto my-0 max-w-[600px] overflow-hidden rounded-xl bg-card shadow-lg">
						{/* Header with gradient */}
						<Section
							className="px-8 py-10 text-center"
							style={{
								background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
							}}
						>
							<Heading className="m-0 font-bold text-3xl text-white tracking-tight">
								FolioNote
							</Heading>
							<Text className="m-0 mt-2 text-sm text-white/90">
								Smart note-taking with spaced repetition
							</Text>
						</Section>

						{/* Content */}
						<Section className="px-8 py-10">
							<Heading className="m-0 mb-6 font-semibold text-2xl text-foreground">
								Reset Your Password
							</Heading>

							<Text className="m-0 mb-4 text-base text-foreground leading-7">
								Hi {userName},
							</Text>

							<Text className="m-0 mb-4 text-base text-foreground leading-7">
								You requested to reset your password. Click the button below to set a
								new password:
							</Text>

							<Section className="my-8 text-center">
								<Button
									className="inline-block rounded-lg px-8 py-4 font-semibold text-base text-white no-underline"
									href={resetUrl}
									style={{
										background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
									}}
								>
									Reset Password
								</Button>
							</Section>

							<Text className="m-0 mb-3 text-foreground-muted text-sm leading-6">
								This link will expire in 1 hour for security reasons.
							</Text>

							<Text className="m-0 mb-3 text-foreground-muted text-sm leading-6">
								If you didn't request this password reset, you can safely ignore this
								email. Your password will remain unchanged.
							</Text>

							<Hr className="my-8 border-border" />

							<Text className="m-0 mb-4 text-center text-foreground-light text-xs">
								© {new Date().getFullYear()} FolioNote. All rights reserved.
							</Text>

							<Text className="m-0 mb-2 text-foreground-light text-xs">
								If the button doesn't work, copy and paste this link into your
								browser:
							</Text>
							<Link
								className="break-all text-brand text-xs no-underline"
								href={resetUrl}
							>
								{resetUrl}
							</Link>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}

export default ResetPasswordEmail
