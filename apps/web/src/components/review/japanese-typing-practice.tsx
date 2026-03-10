import { Badge } from '@folionote/ui/badge'
import { Button } from '@folionote/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@folionote/ui/card'
import { Input } from '@folionote/ui/input'
import { Progress } from '@folionote/ui/progress'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	buildJapaneseVocabularyBank,
	getJapaneseTypingMatchLength,
	normalizeJapaneseTypingAnswer,
} from '@/lib/japanese-typing'
import { JAPANESE_TYPING_EXERCISES } from './japanese-typing-data'

type TypingFeedbackState = 'idle' | 'correct' | 'incorrect'

export function JapaneseTypingPractice() {
	const { t } = useTranslation()
	const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
	const [answerValue, setAnswerValue] = useState('')
	const [feedbackState, setFeedbackState] = useState<TypingFeedbackState>('idle')
	const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>([])
	const [submissionCount, setSubmissionCount] = useState(0)
	const [mistakeCount, setMistakeCount] = useState(0)
	const nextExerciseButtonRef = useRef<HTMLButtonElement | null>(null)

	const currentExercise = JAPANESE_TYPING_EXERCISES[currentExerciseIndex]
	const isSessionComplete =
		currentExerciseIndex >= JAPANESE_TYPING_EXERCISES.length || !currentExercise

	const normalizedTargetAnswer = currentExercise
		? normalizeJapaneseTypingAnswer(currentExercise.romaji)
		: ''
	const matchedCharacterCount = currentExercise
		? getJapaneseTypingMatchLength(answerValue, currentExercise.romaji)
		: 0
	const answerProgressValue =
		normalizedTargetAnswer.length > 0
			? Math.round((matchedCharacterCount / normalizedTargetAnswer.length) * 100)
			: 0
	const accuracyPercent =
		submissionCount === 0
			? 100
			: Math.round((completedExerciseIds.length / submissionCount) * 100)

	const unlockedVocabulary = useMemo(
		() =>
			buildJapaneseVocabularyBank(JAPANESE_TYPING_EXERCISES, completedExerciseIds),
		[completedExerciseIds]
	)

	useEffect(() => {
		if (feedbackState !== 'correct') {
			return
		}

		nextExerciseButtonRef.current?.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
		})
		nextExerciseButtonRef.current?.focus()
	}, [feedbackState])

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!currentExercise) {
			return
		}

		const normalizedSubmittedAnswer = normalizeJapaneseTypingAnswer(answerValue)

		if (!normalizedSubmittedAnswer) {
			return
		}

		setSubmissionCount((previousCount) => previousCount + 1)

		if (normalizedSubmittedAnswer === normalizedTargetAnswer) {
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

	const handleNextExercise = () => {
		setCurrentExerciseIndex((previousIndex) => previousIndex + 1)
		setAnswerValue('')
		setFeedbackState('idle')
	}

	const handleRestart = () => {
		setCurrentExerciseIndex(0)
		setAnswerValue('')
		setFeedbackState('idle')
		setCompletedExerciseIds([])
		setSubmissionCount(0)
		setMistakeCount(0)
	}

	if (isSessionComplete) {
		return (
			<div className="container mx-auto max-w-5xl px-4 py-8">
				<Card className="border-border/40">
					<CardHeader>
						<CardTitle className="text-2xl">
							{t('review.japaneseTyping.completedTitle')}
						</CardTitle>
						<CardDescription>
							{t('review.japaneseTyping.completedDescription', {
								count: JAPANESE_TYPING_EXERCISES.length,
								vocabularyCount: unlockedVocabulary.length,
							})}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="grid gap-3 sm:grid-cols-3">
							<div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
								<p className="text-muted-foreground text-xs">
									{t('review.japaneseTyping.statsCompleted')}
								</p>
								<p className="mt-2 font-semibold text-2xl">
									{completedExerciseIds.length}
								</p>
							</div>
							<div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
								<p className="text-muted-foreground text-xs">
									{t('review.japaneseTyping.statsAccuracy')}
								</p>
								<p className="mt-2 font-semibold text-2xl">{accuracyPercent}%</p>
							</div>
							<div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
								<p className="text-muted-foreground text-xs">
									{t('review.japaneseTyping.statsUnlockedWords')}
								</p>
								<p className="mt-2 font-semibold text-2xl">
									{unlockedVocabulary.length}
								</p>
							</div>
						</div>

						<div className="space-y-3">
							<h2 className="font-semibold text-lg">
								{t('review.japaneseTyping.bankTitle')}
							</h2>
							<div className="grid gap-3 md:grid-cols-2">
								{unlockedVocabulary.map((vocabularyItem) => (
									<div
										className="rounded-2xl border border-border/50 p-4"
										key={vocabularyItem.id}
									>
										<div className="flex items-center justify-between gap-3">
											<div>
												<p className="font-medium text-base">
													{vocabularyItem.term}
												</p>
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
							</div>
						</div>

						<Button onClick={handleRestart} type="button">
							{t('review.japaneseTyping.restart')}
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="container mx-auto max-w-6xl px-4 py-8">
			<div className="mb-8 flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="font-bold text-2xl tracking-tight">
						{t('review.japaneseTyping.title')}
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						{t('review.japaneseTyping.description')}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Badge variant="outline">
						{t('review.japaneseTyping.progressBadge', {
							current: currentExerciseIndex + 1,
							total: JAPANESE_TYPING_EXERCISES.length,
						})}
					</Badge>
					<Badge variant="outline">
						{t('review.japaneseTyping.accuracyBadge', {
							value: accuracyPercent,
						})}
					</Badge>
					<Badge variant="outline">
						{t('review.japaneseTyping.bankBadge', {
							count: unlockedVocabulary.length,
						})}
					</Badge>
				</div>
			</div>

			<div className="mb-6 grid gap-3 sm:grid-cols-4">
				<div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
					<p className="text-muted-foreground text-xs">
						{t('review.japaneseTyping.statsCompleted')}
					</p>
					<p className="mt-2 font-semibold text-2xl">
						{completedExerciseIds.length}/{JAPANESE_TYPING_EXERCISES.length}
					</p>
				</div>
				<div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
					<p className="text-muted-foreground text-xs">
						{t('review.japaneseTyping.statsAccuracy')}
					</p>
					<p className="mt-2 font-semibold text-2xl">{accuracyPercent}%</p>
				</div>
				<div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
					<p className="text-muted-foreground text-xs">
						{t('review.japaneseTyping.statsMistakes')}
					</p>
					<p className="mt-2 font-semibold text-2xl">{mistakeCount}</p>
				</div>
				<div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
					<p className="text-muted-foreground text-xs">
						{t('review.japaneseTyping.statsUnlockedWords')}
					</p>
					<p className="mt-2 font-semibold text-2xl">{unlockedVocabulary.length}</p>
				</div>
			</div>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
				<Card className="border-border/40">
					<CardContent className="space-y-6 pt-6">
						<div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-8 text-white">
							<div className="flex flex-wrap items-center gap-2">
								<Badge
									className="border-white/15 bg-white/10 text-white"
									variant="outline"
								>
									{currentExercise.level}
								</Badge>
								<Badge
									className="border-white/15 bg-white/5 text-slate-200"
									variant="outline"
								>
									{currentExercise.focus}
								</Badge>
							</div>

							<p className="mt-5 text-slate-300 text-sm">
								{t('review.japaneseTyping.promptLabel')}
							</p>
							<p className="mt-2 text-pretty text-lg">{currentExercise.prompt}</p>

							<div className="mt-8 border-white/10 border-y py-8 text-center">
								<p className="text-balance font-semibold text-3xl leading-relaxed md:text-4xl">
									{currentExercise.japanese}
								</p>
								<p className="mt-4 text-slate-300 text-sm md:text-base">
									{currentExercise.reading}
								</p>
								<p className="mt-5 text-slate-400 text-sm">
									{t('review.japaneseTyping.translationLabel')}：
									{currentExercise.translation}
								</p>
							</div>
						</div>

						<form className="space-y-4" onSubmit={handleSubmit}>
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-3">
									<label
										className="font-medium text-sm"
										htmlFor="japanese-typing-answer"
									>
										{t('review.japaneseTyping.answerLabel')}
									</label>
									<span className="text-muted-foreground text-xs">
										{matchedCharacterCount}/{normalizedTargetAnswer.length}
									</span>
								</div>
								<Input
									autoCapitalize="none"
									autoComplete="off"
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
									spellCheck={false}
									value={answerValue}
								/>
								<Progress value={answerProgressValue} />
								<p className="text-muted-foreground text-xs">
									{t('review.japaneseTyping.answerHelp')}
								</p>
							</div>

							{feedbackState === 'correct' ? (
								<div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-4 text-sm">
									<p className="font-medium text-emerald-700 dark:text-emerald-300">
										{t('review.japaneseTyping.correct')}
									</p>
									<p className="mt-1 text-emerald-700/80 dark:text-emerald-200/80">
										{t('review.japaneseTyping.autoCollected')}
									</p>
								</div>
							) : null}

							{feedbackState === 'incorrect' ? (
								<div className="rounded-2xl border border-destructive/25 bg-destructive/8 p-4 text-sm">
									<p className="font-medium text-destructive">
										{t('review.japaneseTyping.incorrect')}
									</p>
									<p className="mt-1 text-destructive/80">
										{t('review.japaneseTyping.expectedAnswer')}：
										{currentExercise.romaji}
									</p>
								</div>
							) : null}

							<div className="flex flex-wrap gap-3">
								<Button disabled={feedbackState === 'correct'} type="submit">
									{t('review.japaneseTyping.submit')}
								</Button>
								{feedbackState === 'correct' ? (
									<Button
										onClick={handleNextExercise}
										ref={nextExerciseButtonRef}
										type="button"
										variant="outline"
									>
										{currentExerciseIndex === JAPANESE_TYPING_EXERCISES.length - 1
											? t('review.japaneseTyping.finish')
											: t('review.japaneseTyping.next')}
									</Button>
								) : null}
								<Button onClick={handleRestart} type="button" variant="ghost">
									{t('review.japaneseTyping.restart')}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>

				<div className="space-y-6">
					<Card className="border-border/40">
						<CardHeader>
							<CardTitle>{t('review.japaneseTyping.grammarTitle')}</CardTitle>
							<CardDescription>{currentExercise.focus}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{currentExercise.grammarPoints.map((grammarPoint) => (
								<div
									className="rounded-2xl border border-border/50 p-4"
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
						</CardContent>
					</Card>

					<Card className="border-border/40">
						<CardHeader>
							<CardTitle>{t('review.japaneseTyping.vocabularyTitle')}</CardTitle>
							<CardDescription>{currentExercise.japanese}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{currentExercise.vocabulary.map((vocabularyItem) => (
								<div
									className="rounded-2xl border border-border/50 p-4"
									key={vocabularyItem.id}
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="font-medium text-base">{vocabularyItem.term}</p>
											<p className="text-muted-foreground text-sm">
												{vocabularyItem.reading}
											</p>
										</div>
										<Badge variant="secondary">{vocabularyItem.partOfSpeech}</Badge>
									</div>
									<p className="mt-3 text-sm">{vocabularyItem.meaning}</p>
									<p className="mt-2 text-muted-foreground text-sm">
										{vocabularyItem.example}
									</p>
								</div>
							))}
						</CardContent>
					</Card>

					<Card className="border-border/40">
						<CardHeader>
							<CardTitle>{t('review.japaneseTyping.bankTitle')}</CardTitle>
							<CardDescription>
								{t('review.japaneseTyping.bankDescription')}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{unlockedVocabulary.length === 0 ? (
								<div className="rounded-2xl border border-border/60 border-dashed p-4 text-muted-foreground text-sm">
									{t('review.japaneseTyping.bankEmpty')}
								</div>
							) : null}

							{unlockedVocabulary.map((vocabularyItem) => (
								<div
									className="rounded-2xl border border-border/50 p-4"
									key={vocabularyItem.id}
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="font-medium">{vocabularyItem.term}</p>
											<p className="text-muted-foreground text-sm">
												{vocabularyItem.reading}
											</p>
										</div>
										<Badge variant="outline">{vocabularyItem.partOfSpeech}</Badge>
									</div>
									<p className="mt-3 text-sm">{vocabularyItem.meaning}</p>
								</div>
							))}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
