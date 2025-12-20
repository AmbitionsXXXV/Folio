import { Link, useNavigate } from '@tanstack/react-router'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

export default function UserMenu() {
	const navigate = useNavigate()
	const { data: session, isPending } = authClient.useSession()

	if (isPending) {
		return <Skeleton className="h-9 w-24" />
	}

	if (!session) {
		return (
			<Link to="/login">
				<Button variant="outline">Sign In</Button>
			</Link>
		)
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="outline">{session.user.name}</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="min-w-max max-w-40 bg-card">
				<DropdownMenuGroup>
					<DropdownMenuLabel>My Account</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem className="break-all" title={session.user.email}>
						{session.user.email}
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuItem
					onClick={() => {
						authClient.signOut({
							fetchOptions: {
								onSuccess: () => {
									navigate({
										to: '/',
									})
								},
							},
						})
					}}
					variant="destructive"
				>
					Sign Out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
