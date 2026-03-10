import { Badge } from '@folionote/ui/badge'
import { Button } from '@folionote/ui/button'
import { Progress } from '@folionote/ui/progress'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@folionote/ui/sheet'
import { Switch } from '@folionote/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@folionote/ui/tooltip'
import {
	ArrowLeft02Icon,
	ArrowRight02Icon,
	BookOpen01Icon,
	RefreshIcon,
	Rocket01Icon,
	SparklesIcon,
	TextAlignJustifyCenterIcon,
	Tick02Icon,
	Timer02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useHotkey } from '@tanstack/react-hotkeys'
import {
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
	ALL_JAPANESE_POS_CATEGORIES,
	buildJapaneseVocabularyBank,
	getJapaneseTypingMatchResult,
	isAnswerCorrect,
	JAPANESE_POS_COLOR_MAP,
	JAPANESE_POS_SWATCH_COLOR_MAP,
	type JapanesePartOfSpeech,
} from '@/lib/japanese-typing'
import { JAPANESE_TYPING_EXERCISES } from './japanese-typing-data'

type TypingFeedbackState = 'idle' | 'correct' | 'incorrect'

const TIMER_INTERVAL_MS = 1000

function formatElapsedTime(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function JapaneseTypingPractice() {
	const { t } = useTranslation()
	const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
	const [answerValue, setAnswerValue] = useState('')
	const [feedbackState, setFeedbackState] = useState<TypingFeedbackState>('idle')
	const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>([])
	const [submissionCount, setSubmissionCount] = useState(0)
	const [mistakeCount, setMistakeCount] = useState(0)
	const [isPosTaggingEnabled, setIsPosTaggingEnabled] = useState(false)
	const [enabledPosCategories, setEnabledPosCategories] = useState<
		Set<JapanesePartOfSpeech>
	>(() => new Set(ALL_JAPANESE_POS_CATEGORIES))
	const [elapsedSeconds, setElapsedSeconds] = useState(0)
	const [isGrammarSheetOpen, setIsGrammarSheetOpen] = useState(false)
	const [isVocabularySheetOpen, setIsVocabularySheetOpen] = useState(false)

	const inputRef = useRef<HTMLInputElement | null>(null)

	const handleTogglePosCategory = useCallback((category: JapanesePartOfSpeech) => {
		setEnabledPosCategories((previous) => {
			const next = new Set(previous)
			if (next.has(category)) {
				next.delete(category)
			} else {
				next.add(category)
			}
			return next
		})
	}, [])

	const currentExercise = JAPANESE_TYPING_EXERCISES[currentExerciseIndex]
	const isSessionComplete =
		currentExerciseIndex >= JAPANESE_TYPING_EXERCISES.length || !currentExercise

	const matchResult = currentExercise
		? getJapaneseTypingMatchResult(answerValue, currentExercise)
		: { target: 'kana' as const, normalizedTarget: '', matchedLength: 0 }
	const {
		normalizedTarget: normalizedTargetAnswer,
		matchedLength: matchedCharacterCount,
	} = matchResult
	const answerProgressValue =
		normalizedTargetAnswer.length > 0
			? Math.round((matchedCharacterCount / normalizedTargetAnswer.length) * 100)
			: 0
	const accuracyPercent =
		submissionCount === 0
			? 100
			: Math.round((completedExerciseIds.length / submissionCount) * 100)
	const overallProgressPercent =
		JAPANESE_TYPING_EXERCISES.length > 0
			? Math.round((currentExerciseIndex / JAPANESE_TYPING_EXERCISES.length) * 100)
			: 0

	const unlockedVocabulary = useMemo(
		() =>
			buildJapaneseVocabularyBank(JAPANESE_TYPING_EXERCISES, completedExerciseIds),
		[completedExerciseIds]
	)

	useEffect(() => {
		if (isSessionComplete) return
		const intervalId = setInterval(() => {
			setElapsedSeconds((s) => s + 1)
		}, TIMER_INTERVAL_MS)
		return () => clearInterval(intervalId)
	}, [isSessionComplete])

	useEffect(() => {
		if (feedbackState === 'correct') return
		inputRef.current?.focus()
	}, [currentExerciseIndex, feedbackState])

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!currentExercise) return

		const trimmedAnswer = answerValue.trim()
		if (!trimmedAnswer) return

		setSubmissionCount((previousCount) => previousCount + 1)

		if (isAnswerCorrect(trimmedAnswer, currentExercise)) {
			setFeedbackState('correct')
			setCompletedExerciseIds((previousIds) =>
				previousIds.includes(currentExercise.id)
					? previousIds
					: [...previousIds, currentExercise.id]
			)
			return
		}

		setFeedbackState('incorrect')
		setMistakeCount((previousCount) => previousCount + 1)
	}

	const handleNextExercise = useCallback(() => {
		setCurrentExerciseIndex((previousIndex) => previousIndex + 1)
		setAnswerValue('')
		setFeedbackState('idle')
	}, [])

	const handlePreviousExercise = useCallback(() => {
		if (currentExerciseIndex <= 0) return
		setCurrentExerciseIndex((previousIndex) => previousIndex - 1)
		setAnswerValue('')
		setFeedbackState('idle')
	}, [currentExerciseIndex])

	const handleRestart = useCallback(() => {
		setCurrentExerciseIndex(0)
		setAnswerValue('')
		setFeedbackState('idle')
		setCompletedExerciseIds([])
		setSubmissionCount(0)
		setMistakeCount(0)
		setElapsedSeconds(0)
	}, [])

	const isInputFocused = useCallback(() => {
		const active = document.activeElement as HTMLElement | null
		return active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA'
	}, [])

	useHotkey('ArrowLeft', (event) => {
		if (isInputFocused()) return
		event.preventDefault()
		handlePreviousExercise()
	})

	useHotkey('ArrowRight', (event) => {
		if (isInputFocused() || feedbackState !== 'correct') return
		event.preventDefault()
		handleNextExercise()
	})

	useHotkey('Enter', (event) => {
		if (isInputFocused() || feedbackState !== 'correct') return
		event.preventDefault()
		handleNextExercise()
	})

	if (isSessionComplete) {
		return (
			<div className="flex min-h-svh flex-col bg-background text-foreground">
				<div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
					<div className="flex size-20 animate-fade-in items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/40">
						<HugeiconsIcon
							className="size-10 text-emerald-400"
							icon={Rocket01Icon}
						/>
					</div>

					<h1 className="mt-8 animate-fade-in font-bold text-3xl tracking-tight delay-100">
						{t('review.japaneseTyping.completedTitle')}
					</h1>
					<p className="mt-3 max-w-md animate-fade-in text-center text-base text-muted-foreground delay-200">
						{t('review.japaneseTyping.completedDescription', {
							count: JAPANESE_TYPING_EXERCISES.length,
							vocabularyCount: unlockedVocabulary.length,
						})}
					</p>

					<div className="mt-10 grid w-full max-w-lg animate-fade-in gap-4 delay-300 sm:grid-cols-3">
						<div className="rounded-2xl border border-border/50 bg-card/60 p-5 text-center">
							<p className="text-muted-foreground text-xs">
								{t('review.japaneseTyping.statsCompleted')}
							</p>
							<p className="mt-2 font-semibold text-2xl tabular-nums">
								{completedExerciseIds.length}
							</p>
						</div>
						<div className="rounded-2xl border border-border/50 bg-card/60 p-5 text-center">
							<p className="text-muted-foreground text-xs">
								{t('review.japaneseTyping.statsAccuracy')}
							</p>
							<p className="mt-2 font-semibold text-2xl tabular-nums">
								{accuracyPercent}%
							</p>
						</div>
						<div className="rounded-2xl border border-border/50 bg-card/60 p-5 text-center">
							<p className="text-muted-foreground text-xs">
								{t('review.japaneseTyping.statsUnlockedWords')}
							</p>
							<p className="mt-2 font-semibold text-2xl tabular-nums">
								{unlockedVocabulary.length}
							</p>
						</div>
					</div>

					<div className="mt-4 animate-fade-in rounded-2xl border border-border/50 bg-card/60 px-5 py-3 text-center delay-300">
						<p className="text-muted-foreground text-xs">
							{t('review.japaneseTyping.statsMistakes')}
						</p>
						<p className="mt-1 font-semibold text-lg tabular-nums">{mistakeCount}</p>
					</div>

					<div className="mt-6 flex animate-fade-in items-center gap-2 text-muted-foreground text-sm delay-400">
						<HugeiconsIcon className="size-4" icon={Timer02Icon} />
						<span className="tabular-nums">{formatElapsedTime(elapsedSeconds)}</span>
					</div>

					{unlockedVocabulary.length > 0 && (
						<div className="mt-10 w-full max-w-2xl animate-fade-in delay-400">
							<h2 className="mb-4 font-semibold text-lg">
								{t('review.japaneseTyping.bankTitle')}
							</h2>
							<div className="grid gap-3 sm:grid-cols-2">
								{unlockedVocabulary.map((vocabularyItem) => (
									<div
										className="rounded-xl border border-border/50 bg-card/60 p-4"
										key={vocabularyItem.id}
									>
										<div className="flex items-center justify-between gap-3">
											<div>
												<p className="font-medium">{vocabularyItem.term}</p>
												<p className="text-muted-foreground text-sm">
													{vocabularyItem.reading}
												</p>
											</div>
											<Badge variant="outline">{vocabularyItem.partOfSpeech}</Badge>
										</div>
										<p className="mt-2 text-secondary-foreground text-sm">
											{vocabularyItem.meaning}
										</p>
									</div>
								))}
							</div>
						</div>
					)}

					<Button
						className="mt-10 animate-fade-in delay-400"
						onClick={handleRestart}
						size="lg"
						type="button"
						variant="outline"
					>
						<HugeiconsIcon className="mr-2 size-4" icon={RefreshIcon} />
						{t('review.japaneseTyping.restart')}
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="flex min-h-svh flex-col bg-background text-foreground">
			{/* Top Bar */}
			<div className="flex shrink-0 animate-fade-in items-center justify-between gap-4 px-4 py-3 sm:px-6">
				<div className="flex items-center gap-3">
					<h1 className="font-semibold text-sm">
						{t('review.japaneseTyping.title')}
					</h1>
					<span className="text-muted-foreground text-xs tabular-nums">
						({currentExerciseIndex + 1}/{JAPANESE_TYPING_EXERCISES.length})
					</span>
				</div>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1.5 text-amber-400 dark:text-amber-300">
						<HugeiconsIcon className="size-3.5" icon={SparklesIcon} />
						<span className="font-medium text-sm tabular-nums">
							{accuracyPercent}%
						</span>
					</div>
					<div className="flex items-center gap-1.5 text-muted-foreground">
						<HugeiconsIcon className="size-3.5" icon={Timer02Icon} />
						<span className="font-mono text-sm tabular-nums">
							{formatElapsedTime(elapsedSeconds)}
						</span>
					</div>
				</div>
			</div>

			{/* Progress Bar */}
			<Progress
				className="h-1 shrink-0 rounded-none bg-muted [&>div]:bg-emerald-500 [&>div]:transition-all [&>div]:duration-300 [&>div]:ease-out"
				value={overallProgressPercent}
			/>

			{/* Main Content */}
			<div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
				{/* Level & Focus Tags */}
				<div className="flex animate-fade-in flex-wrap items-center justify-center gap-2">
					<Badge variant="outline">{currentExercise.level}</Badge>
					<Badge className="text-muted-foreground" variant="outline">
						{currentExercise.focus}
					</Badge>
					{currentExercise.tokens && (
						<div className="flex items-center gap-1.5 text-muted-foreground text-xs">
							<HugeiconsIcon className="size-3" icon={TextAlignJustifyCenterIcon} />
							<span>{t('review.japaneseTyping.posTagging')}</span>
							<Switch
								checked={isPosTaggingEnabled}
								onCheckedChange={setIsPosTaggingEnabled}
								size="sm"
							/>
						</div>
					)}
				</div>

				{/* Prompt */}
				<p className="mt-6 animate-fade-in text-center text-muted-foreground text-sm delay-100">
					{t('review.japaneseTyping.promptLabel')}
				</p>
				<p className="mt-1 max-w-lg animate-fade-in text-pretty text-center text-base text-foreground/80 delay-100">
					{currentExercise.prompt}
				</p>

				{/* Japanese Text Display */}
				<div className="mt-8 w-full max-w-2xl animate-fade-in text-center delay-200">
					{isPosTaggingEnabled && currentExercise.tokens ? (
						<>
							<div className="flex flex-wrap items-end justify-center gap-2">
								{currentExercise.tokens.map((token) => {
									const isHighlighted = enabledPosCategories.has(token.pos)
									const colorClasses = isHighlighted
										? JAPANESE_POS_COLOR_MAP[token.pos]
										: 'bg-muted/50 border-border/50 text-muted-foreground'
									return (
										<div
											className={`flex flex-col items-center gap-0.5 rounded-lg border px-2.5 py-2 transition-colors duration-200 ${colorClasses}`}
											key={`${token.surface}-${token.pos}-${token.romaji}`}
										>
											<span className="text-[10px] leading-tight opacity-70">
												{token.reading}
											</span>
											<span className="font-semibold text-lg leading-tight">
												{token.surface}
											</span>
											<span className="font-mono text-[10px] leading-tight opacity-60">
												{token.romaji}
											</span>
										</div>
									)
								})}
							</div>
							<div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
								{ALL_JAPANESE_POS_CATEGORIES.map((category) => {
									const isActive = enabledPosCategories.has(category)
									return (
										<button
											className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-40'}`}
											key={category}
											onClick={() => handleTogglePosCategory(category)}
											type="button"
										>
											<span
												className={`inline-block size-2 rounded-sm ${JAPANESE_POS_SWATCH_COLOR_MAP[category]}`}
											/>
											<span className="text-secondary-foreground">
												{t(`review.japaneseTyping.posCategories.${category}`)}
											</span>
										</button>
									)
								})}
							</div>
						</>
					) : (
						<>
							<p className="text-balance font-semibold text-3xl leading-relaxed md:text-4xl">
								{currentExercise.japanese}
							</p>
							<p className="mt-3 text-muted-foreground text-sm md:text-base">
								{currentExercise.reading}
							</p>
						</>
					)}
				</div>

				{/* Translation */}
				<p className="mt-5 animate-fade-in text-muted-foreground/70 text-sm delay-200">
					{t('review.japaneseTyping.translationLabel')}：
					{currentExercise.translation}
				</p>

				{/* Input Area */}
				<form
					className="mt-8 flex w-full max-w-md animate-fade-in flex-col items-center delay-300"
					onSubmit={handleSubmit}
				>
					<div className="w-full">
						<input
							autoCapitalize="none"
							autoComplete="off"
							className="w-full border-0 border-border border-b-2 bg-transparent py-3 text-center text-foreground text-lg outline-none transition-colors duration-200 placeholder:text-muted-foreground/40 focus:border-primary/60"
							disabled={feedbackState === 'correct'}
							id="japanese-typing-answer"
							inputMode="text"
							name="japanese_typing_answer"
							onChange={(event) => {
								setAnswerValue(event.target.value)
								if (feedbackState === 'incorrect') {
									setFeedbackState('idle')
								}
							}}
							placeholder={t('review.japaneseTyping.answerPlaceholder')}
							ref={inputRef}
							spellCheck={false}
							value={answerValue}
						/>
						<div className="mt-1.5 flex items-center gap-2">
							<Progress
								className="h-0.5 flex-1 rounded-full bg-muted [&>div]:bg-emerald-500/60 [&>div]:transition-all [&>div]:duration-200"
								value={answerProgressValue}
							/>
							<span className="shrink-0 text-muted-foreground/50 text-xs tabular-nums">
								{matchedCharacterCount}/{normalizedTargetAnswer.length}
							</span>
						</div>
					</div>

					{/* Feedback */}
					{feedbackState === 'correct' && (
						<div className="mt-4 flex animate-fade-in items-center gap-2 text-emerald-500 text-sm dark:text-emerald-400">
							<HugeiconsIcon className="size-4" icon={Tick02Icon} />
							<span>{t('review.japaneseTyping.correct')}</span>
							<span className="opacity-50">—</span>
							<span className="text-xs opacity-50">
								{t('review.japaneseTyping.autoCollected')}
							</span>
						</div>
					)}

					{feedbackState === 'incorrect' && (
						<div className="mt-4 flex animate-fade-in flex-col items-center gap-1">
							<div className="flex items-center gap-2 text-destructive text-sm">
								<span>✕</span>
								<span>{t('review.japaneseTyping.incorrect')}</span>
							</div>
							<p className="text-destructive/60 text-xs">
								{t('review.japaneseTyping.expectedAnswer')}：
								{currentExercise.reading}
								<span className="ml-2 opacity-60">({currentExercise.romaji})</span>
							</p>
						</div>
					)}

					{/* Submit / Next */}
					<div className="mt-6 flex items-center gap-3">
						{feedbackState !== 'correct' && (
							<Button size="sm" type="submit" variant="secondary">
								{t('review.japaneseTyping.submit')}
							</Button>
						)}
						{feedbackState === 'correct' && (
							<Button
								className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
								onClick={handleNextExercise}
								size="sm"
								type="button"
								variant="ghost"
							>
								{currentExerciseIndex === JAPANESE_TYPING_EXERCISES.length - 1
									? t('review.japaneseTyping.finish')
									: t('review.japaneseTyping.next')}
							</Button>
						)}
					</div>
				</form>
			</div>

			{/* Bottom Bar */}
			<div className="flex shrink-0 items-center justify-between gap-2 border-border/50 border-t px-4 py-3 sm:px-6">
				{/* Left: Prev */}
				<Tooltip>
					<TooltipTrigger
						aria-label={t('common.back')}
						className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground disabled:opacity-40"
						disabled={currentExerciseIndex <= 0}
						onClick={handlePreviousExercise}
						type="button"
					>
						<HugeiconsIcon className="size-5" icon={ArrowLeft02Icon} />
					</TooltipTrigger>
					<TooltipContent side="top">← {t('common.back')}</TooltipContent>
				</Tooltip>

				{/* Center: Tool Icons */}
				<div className="flex items-center gap-1">
					<Sheet onOpenChange={setIsGrammarSheetOpen} open={isGrammarSheetOpen}>
						<Tooltip>
							<SheetTrigger
								aria-label={t('review.japaneseTyping.grammarTitle')}
								className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground"
								render={<TooltipTrigger />}
							>
								<HugeiconsIcon
									className="size-4"
									icon={TextAlignJustifyCenterIcon}
								/>
							</SheetTrigger>
							<TooltipContent side="top">
								{t('review.japaneseTyping.grammarTitle')}
							</TooltipContent>
						</Tooltip>
						<SheetContent className="overflow-y-auto" side="right">
							<SheetHeader>
								<SheetTitle>{t('review.japaneseTyping.grammarTitle')}</SheetTitle>
								<SheetDescription>{currentExercise.focus}</SheetDescription>
							</SheetHeader>
							<div className="mt-4 space-y-4 px-1">
								{currentExercise.grammarPoints.map((grammarPoint) => (
									<div
										className="rounded-xl border border-border/50 p-4"
										key={grammarPoint.id}
									>
										<div className="flex flex-wrap items-center gap-2">
											<Badge variant="secondary">{grammarPoint.pattern}</Badge>
											<p className="font-medium">{grammarPoint.title}</p>
										</div>
										<p className="mt-3 text-sm">{grammarPoint.explanation}</p>
										<p className="mt-2 text-muted-foreground text-sm">
											{grammarPoint.example}
										</p>
									</div>
								))}
							</div>
						</SheetContent>
					</Sheet>

					<Sheet
						onOpenChange={setIsVocabularySheetOpen}
						open={isVocabularySheetOpen}
					>
						<Tooltip>
							<SheetTrigger
								aria-label={t('review.japaneseTyping.vocabularyTitle')}
								className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground"
								render={<TooltipTrigger />}
							>
								<HugeiconsIcon className="size-4" icon={BookOpen01Icon} />
							</SheetTrigger>
							<TooltipContent side="top">
								{t('review.japaneseTyping.vocabularyTitle')}
							</TooltipContent>
						</Tooltip>
						<SheetContent className="overflow-y-auto" side="right">
							<SheetHeader>
								<SheetTitle>{t('review.japaneseTyping.vocabularyTitle')}</SheetTitle>
								<SheetDescription>{currentExercise.japanese}</SheetDescription>
							</SheetHeader>
							<div className="mt-4 space-y-4 px-1">
								{currentExercise.vocabulary.map((vocabularyItem) => (
									<div
										className="rounded-xl border border-border/50 p-4"
										key={vocabularyItem.id}
									>
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className="font-medium">{vocabularyItem.term}</p>
												<p className="text-muted-foreground text-sm">
													{vocabularyItem.reading}
												</p>
											</div>
											<Badge variant="secondary">
												{vocabularyItem.partOfSpeech}
											</Badge>
										</div>
										<p className="mt-3 text-sm">{vocabularyItem.meaning}</p>
										<p className="mt-2 text-muted-foreground text-sm">
											{vocabularyItem.example}
										</p>
									</div>
								))}

								{unlockedVocabulary.length > 0 && (
									<div className="border-border/50 border-t pt-4">
										<h3 className="mb-3 font-semibold text-sm">
											{t('review.japaneseTyping.bankTitle')}
											<span className="ml-2 font-normal text-muted-foreground">
												({unlockedVocabulary.length})
											</span>
										</h3>
										{unlockedVocabulary.map((vocabularyItem) => (
											<div
												className="mb-3 rounded-xl border border-border/50 p-4"
												key={vocabularyItem.id}
											>
												<div className="flex items-start justify-between gap-3">
													<div>
														<p className="font-medium">{vocabularyItem.term}</p>
														<p className="text-muted-foreground text-sm">
															{vocabularyItem.reading}
														</p>
													</div>
													<Badge variant="outline">
														{vocabularyItem.partOfSpeech}
													</Badge>
												</div>
												<p className="mt-3 text-sm">{vocabularyItem.meaning}</p>
											</div>
										))}
									</div>
								)}
							</div>
						</SheetContent>
					</Sheet>

					<Tooltip>
						<TooltipTrigger
							aria-label={t('review.japaneseTyping.restart')}
							className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground"
							onClick={handleRestart}
							type="button"
						>
							<HugeiconsIcon className="size-4" icon={RefreshIcon} />
						</TooltipTrigger>
						<TooltipContent side="top">
							{t('review.japaneseTyping.restart')}
						</TooltipContent>
					</Tooltip>
				</div>

				{/* Right: Next */}
				<Tooltip>
					<TooltipTrigger
						aria-label={t('common.next')}
						className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:text-foreground disabled:opacity-40"
						disabled={feedbackState !== 'correct'}
						onClick={handleNextExercise}
						type="button"
					>
						<HugeiconsIcon className="size-5" icon={ArrowRight02Icon} />
					</TooltipTrigger>
					<TooltipContent side="top">→ {t('common.next')}</TooltipContent>
				</Tooltip>
			</div>
		</div>
	)
}
