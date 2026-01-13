import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { orpc } from '@/utils/orpc'

export const Route = createFileRoute('/_app/ai-demo')({
	component: AiDemoPage,
})

type ProviderId = 'openai' | 'deepseek' | 'gemini' | 'claude' | 'qwen'

type ProviderOption = {
	id: ProviderId
	name: string
	iconSrc: string
}

const PROVIDER_BASE_URL_PLACEHOLDERS: Record<ProviderId, string> = {
	openai: 'https://api.openai.com/v1',
	deepseek: 'https://api.deepseek.com/v1',
	gemini: 'https://generativelanguage.googleapis.com/v1beta',
	claude: 'https://api.anthropic.com/v1',
	qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
}

const PROVIDER_OPTIONS: ProviderOption[] = [
	{ id: 'openai', name: 'OpenAI', iconSrc: '/svg/models/openai.svg' },
	{ id: 'deepseek', name: 'DeepSeek', iconSrc: '/svg/models/deepseek.svg' },
	{ id: 'gemini', name: 'Gemini', iconSrc: '/svg/models/gemini.svg' },
	{ id: 'claude', name: 'Claude', iconSrc: '/svg/models/claude.svg' },
	{ id: 'qwen', name: 'Qwen', iconSrc: '/svg/models/qwen.svg' },
]

function AiDemoPage() {
	const [provider, setProvider] = useState<ProviderId>('gemini')
	const [apiKey, setApiKey] = useState('')
	const [baseUrl, setBaseUrl] = useState('')
	const [model, setModel] = useState('')
	const [prompt, setPrompt] = useState('What is the capital of France?')
	const [resultText, setResultText] = useState<string | null>(null)
	const [usageJson, setUsageJson] = useState<string | null>(null)

	const selectedProvider = useMemo(() => {
		return PROVIDER_OPTIONS.find((p) => p.id === provider) ?? PROVIDER_OPTIONS[0]
	}, [provider])

	const generateMutation = useMutation({
		mutationFn: () =>
			orpc.ai.generateText.call({
				provider,
				apiKey,
				baseUrl: baseUrl.trim() || undefined,
				model: model.trim() || undefined,
				prompt,
			}),
		onSuccess: (data) => {
			setResultText(data.text)
			setUsageJson(
				data.usage ? JSON.stringify(data.usage, null, 2) : JSON.stringify(null)
			)
		},
		onError: (error: Error) => {
			toast.error(error.message || 'AI request failed')
		},
	})

	const isPending = generateMutation.isPending

	return (
		<div className="container mx-auto max-w-5xl px-4 py-8">
			<div className="mb-8">
				<h1 className="font-bold text-2xl">AI Demo</h1>
				<p className="text-muted-foreground text-sm">
					使用 Vercel AI SDK 的 <code>generateText</code> 做最小闭环示例（ephemeral
					key，不落库）
				</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>输入</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label>Provider</Label>
							<Select
								onValueChange={(value) => setProvider(value as ProviderId)}
								value={provider}
							>
								<SelectTrigger className="w-full">
									<SelectValue>{selectedProvider?.name}</SelectValue>
								</SelectTrigger>
								<SelectContent align="start">
									{PROVIDER_OPTIONS.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											<span className="flex items-center gap-2">
												<img
													alt=""
													aria-hidden="true"
													className="size-4"
													src={p.iconSrc}
												/>
												{p.name}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="ai-demo-api-key">API Key</Label>
							<Input
								autoComplete="off"
								disabled={isPending}
								id="ai-demo-api-key"
								inputMode="text"
								name="aiDemoApiKey"
								onChange={(e) => setApiKey(e.target.value)}
								placeholder={`${selectedProvider?.name} API key`}
								spellCheck={false}
								type="password"
								value={apiKey}
							/>
							<p className="text-muted-foreground text-xs">
								此 Key 仅用于本次请求，不会被保存到数据库。
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="ai-demo-base-url">Base URL（可选）</Label>
							<Input
								autoComplete="off"
								disabled={isPending}
								id="ai-demo-base-url"
								inputMode="url"
								name="aiDemoBaseUrl"
								onChange={(e) => setBaseUrl(e.target.value)}
								placeholder={PROVIDER_BASE_URL_PLACEHOLDERS[provider]}
								spellCheck={false}
								type="url"
								value={baseUrl}
							/>
							<p className="text-muted-foreground text-xs">
								不填则使用系统默认值；需要代理 / 网关时可以在这里覆盖。
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="ai-demo-model">Model（可选）</Label>
							<Input
								autoComplete="off"
								disabled={isPending}
								id="ai-demo-model"
								name="aiDemoModel"
								onChange={(e) => setModel(e.target.value)}
								placeholder="例如：gpt-4o-mini / gemini-2.5-flash-lite / deepseek-chat"
								spellCheck={false}
								value={model}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="ai-demo-prompt">Prompt</Label>
							<Textarea
								disabled={isPending}
								id="ai-demo-prompt"
								name="aiDemoPrompt"
								onChange={(e) => setPrompt(e.target.value)}
								placeholder="Type your prompt…"
								value={prompt}
							/>
						</div>

						<div className="flex items-center justify-end gap-2">
							<Button
								disabled={
									isPending ||
									apiKey.trim().length === 0 ||
									prompt.trim().length === 0
								}
								onClick={() => generateMutation.mutate()}
								type="button"
							>
								{isPending ? (
									<span className="inline-flex items-center gap-2">
										<Spinner />
										Generating…
									</span>
								) : (
									'Generate'
								)}
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>输出</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<div className="text-muted-foreground text-xs">
								当前 Provider：{selectedProvider?.name}
							</div>
							<pre className="max-h-[320px] overflow-auto rounded-md bg-muted p-3 text-sm">
								<code>{resultText ?? '（暂无输出）'}</code>
							</pre>
						</div>

						<div className="space-y-2">
							<div className="text-muted-foreground text-xs">Usage（raw）</div>
							<pre className="max-h-[220px] overflow-auto rounded-md bg-muted p-3 text-xs">
								<code>{usageJson ?? 'null'}</code>
							</pre>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
