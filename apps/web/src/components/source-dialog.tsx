import {
	Book02Icon,
	Link01Icon,
	MusicNote01Icon,
	News01Icon,
	Pdf01Icon,
	Video01Icon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { orpc } from '@/utils/orpc'

type SourceType = 'link' | 'pdf' | 'book' | 'article' | 'video' | 'podcast' | 'other'

type SourceDialogProps = {
	open: boolean
	onClose: () => void
	source?: {
		id: string
		type: SourceType
		title: string
		url?: string | null
		author?: string | null
		publishedAt?: Date | null
		metadata?: string | null
	} | null
}

const SOURCE_TYPES: { key: SourceType; label: string; icon: IconSvgElement }[] = [
	{ key: 'link', label: '链接', icon: Link01Icon },
	{ key: 'pdf', label: 'PDF', icon: Pdf01Icon },
	{ key: 'book', label: '书籍', icon: Book02Icon },
	{ key: 'article', label: '文章', icon: News01Icon },
	{ key: 'video', label: '视频', icon: Video01Icon },
	{ key: 'podcast', label: '播客', icon: MusicNote01Icon },
]

export function SourceDialog({ open, onClose, source }: SourceDialogProps) {
	const [type, setType] = useState<SourceType>('link')
	const [title, setTitle] = useState('')
	const [url, setUrl] = useState('')
	const [author, setAuthor] = useState('')

	const isEditing = !!source

	const queryClient = useQueryClient()

	const createMutation = useMutation({
		mutationFn: (data: {
			type: SourceType
			title: string
			url?: string
			author?: string
		}) => orpc.sources.create.call(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sources'] })
			toast.success('来源已创建')
			onClose()
		},
		onError: () => {
			toast.error('创建失败')
		},
	})

	const updateMutation = useMutation({
		mutationFn: (data: {
			id: string
			type?: SourceType
			title?: string
			url?: string | null
			author?: string | null
		}) => orpc.sources.update.call(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sources'] })
			toast.success('来源已更新')
			onClose()
		},
		onError: () => {
			toast.error('更新失败')
		},
	})

	useEffect(() => {
		if (source) {
			setType(source.type)
			setTitle(source.title)
			setUrl(source.url || '')
			setAuthor(source.author || '')
		} else {
			setType('link')
			setTitle('')
			setUrl('')
			setAuthor('')
		}
	}, [source, open])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (!title.trim()) {
			toast.error('请输入标题')
			return
		}

		if (isEditing && source) {
			updateMutation.mutate({
				id: source.id,
				type,
				title: title.trim(),
				url: url.trim() || null,
				author: author.trim() || null,
			})
		} else {
			createMutation.mutate({
				type,
				title: title.trim(),
				url: url.trim() || undefined,
				author: author.trim() || undefined,
			})
		}
	}

	const isPending = createMutation.isPending || updateMutation.isPending

	let submitButtonText = '创建'
	if (isPending) {
		submitButtonText = '保存中...'
	} else if (isEditing) {
		submitButtonText = '保存'
	}

	return (
		<Sheet onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
			<SheetContent side="right">
				<form onSubmit={handleSubmit}>
					<SheetHeader>
						<SheetTitle>{isEditing ? '编辑来源' : '添加来源'}</SheetTitle>
						<SheetDescription>
							{isEditing ? '修改来源信息' : '添加一个新的学习资料来源'}
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6 space-y-6 px-4">
						{/* Type selector */}
						<div className="space-y-2">
							<Label>类型</Label>
							<div className="flex flex-wrap gap-2">
								{SOURCE_TYPES.map(({ key, label, icon }) => (
									<Button
										className={cn(
											'flex items-center gap-1.5',
											type === key && 'ring-2 ring-primary ring-offset-2'
										)}
										key={key}
										onClick={() => setType(key)}
										size="sm"
										type="button"
										variant={type === key ? 'default' : 'outline'}
									>
										<HugeiconsIcon className="size-4" icon={icon} />
										{label}
									</Button>
								))}
							</div>
						</div>

						{/* Title */}
						<div className="space-y-2">
							<Label htmlFor="title">标题 *</Label>
							<Input
								id="title"
								onChange={(e) => setTitle(e.target.value)}
								placeholder="输入来源标题"
								value={title}
							/>
						</div>

						{/* URL */}
						<div className="space-y-2">
							<Label htmlFor="url">链接</Label>
							<Input
								id="url"
								onChange={(e) => setUrl(e.target.value)}
								placeholder="https://..."
								type="url"
								value={url}
							/>
						</div>

						{/* Author */}
						<div className="space-y-2">
							<Label htmlFor="author">作者</Label>
							<Input
								id="author"
								onChange={(e) => setAuthor(e.target.value)}
								placeholder="输入作者名"
								value={author}
							/>
						</div>
					</div>

					<SheetFooter className="mt-8">
						<Button
							disabled={isPending}
							onClick={onClose}
							type="button"
							variant="outline"
						>
							取消
						</Button>
						<Button disabled={isPending} type="submit">
							{submitButtonText}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	)
}
