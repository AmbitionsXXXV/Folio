export type JapanesePartOfSpeech =
	| 'noun'
	| 'pronoun'
	| 'verb'
	| 'adjective'
	| 'adverb'
	| 'particle'
	| 'auxiliary'
	| 'expression'

export type JapaneseSentenceToken = {
	surface: string
	reading: string
	romaji: string
	pos: JapanesePartOfSpeech
}

export const JAPANESE_POS_COLOR_MAP: Record<JapanesePartOfSpeech, string> = {
	noun: 'bg-amber-400/20 border-amber-400/40 text-amber-300',
	pronoun: 'bg-cyan-400/20 border-cyan-400/40 text-cyan-300',
	verb: 'bg-emerald-400/20 border-emerald-400/40 text-emerald-300',
	adjective: 'bg-pink-400/20 border-pink-400/40 text-pink-300',
	adverb: 'bg-purple-400/20 border-purple-400/40 text-purple-300',
	particle: 'bg-blue-400/20 border-blue-400/40 text-blue-300',
	auxiliary: 'bg-slate-400/20 border-slate-400/40 text-slate-300',
	expression: 'bg-orange-400/20 border-orange-400/40 text-orange-300',
}

export const JAPANESE_POS_SWATCH_COLOR_MAP: Record<JapanesePartOfSpeech, string> = {
	noun: 'bg-amber-400',
	pronoun: 'bg-cyan-400',
	verb: 'bg-emerald-400',
	adjective: 'bg-pink-400',
	adverb: 'bg-purple-400',
	particle: 'bg-blue-400',
	auxiliary: 'bg-slate-400',
	expression: 'bg-orange-400',
}

export const ALL_JAPANESE_POS_CATEGORIES: JapanesePartOfSpeech[] = [
	'noun',
	'pronoun',
	'verb',
	'adjective',
	'adverb',
	'particle',
	'auxiliary',
	'expression',
]

export type JapaneseGrammarPoint = {
	id: string
	pattern: string
	title: string
	explanation: string
	example: string
}

export type JapaneseVocabularyItem = {
	id: string
	term: string
	reading: string
	meaning: string
	partOfSpeech: string
	example: string
}

export type JapaneseTypingExercise = {
	id: string
	level: string
	scene: string
	prompt: string
	focus: string
	japanese: string
	reading: string
	romaji: string
	translation: string
	grammarPoints: JapaneseGrammarPoint[]
	vocabulary: JapaneseVocabularyItem[]
	tokens?: JapaneseSentenceToken[]
}

const ROMAJI_SANITIZE_REGEX = /[^a-z0-9]/g
const KANA_SANITIZE_REGEX =
	/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]/g
const JAPANESE_CHAR_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]/

export const normalizeRomajiAnswer = (answer: string): string =>
	answer.normalize('NFKC').toLowerCase().trim().replace(ROMAJI_SANITIZE_REGEX, '')

export const normalizeKanaAnswer = (answer: string): string =>
	answer.normalize('NFKC').trim().replace(KANA_SANITIZE_REGEX, '')

export const isJapaneseInput = (value: string): boolean =>
	JAPANESE_CHAR_REGEX.test(value)

export type MatchTarget = 'kana' | 'romaji'

export type MatchResult = {
	target: MatchTarget
	normalizedTarget: string
	matchedLength: number
}

export const getJapaneseTypingMatchResult = (
	inputValue: string,
	exercise: { reading: string; romaji: string }
): MatchResult => {
	const useKana = isJapaneseInput(inputValue)
	const target: MatchTarget = useKana ? 'kana' : 'romaji'

	const normalizedInput = useKana
		? normalizeKanaAnswer(inputValue)
		: normalizeRomajiAnswer(inputValue)

	const normalizedTarget = useKana
		? normalizeKanaAnswer(exercise.reading)
		: normalizeRomajiAnswer(exercise.romaji)

	const comparisonLength = Math.min(normalizedInput.length, normalizedTarget.length)
	let matchedLength = 0

	for (let i = 0; i < comparisonLength; i += 1) {
		if (normalizedInput[i] !== normalizedTarget[i]) {
			break
		}
		matchedLength += 1
	}

	return { target, normalizedTarget, matchedLength }
}

export const isAnswerCorrect = (
	inputValue: string,
	exercise: { reading: string; romaji: string }
): boolean => {
	const { normalizedTarget, matchedLength } = getJapaneseTypingMatchResult(
		inputValue,
		exercise
	)
	return normalizedTarget.length > 0 && matchedLength === normalizedTarget.length
}

/** @deprecated Use normalizeRomajiAnswer instead */
export const normalizeJapaneseTypingAnswer = normalizeRomajiAnswer

/** @deprecated Use getJapaneseTypingMatchResult instead */
export const getJapaneseTypingMatchLength = (
	inputValue: string,
	targetValue: string
): number => {
	const normalizedInput = normalizeRomajiAnswer(inputValue)
	const normalizedTarget = normalizeRomajiAnswer(targetValue)
	const comparisonLength = Math.min(normalizedInput.length, normalizedTarget.length)

	let matchedCharacterCount = 0

	for (
		let characterIndex = 0;
		characterIndex < comparisonLength;
		characterIndex += 1
	) {
		if (normalizedInput[characterIndex] !== normalizedTarget[characterIndex]) {
			break
		}

		matchedCharacterCount += 1
	}

	return matchedCharacterCount
}

export const buildJapaneseVocabularyBank = (
	exercises: JapaneseTypingExercise[],
	completedExerciseIds: string[]
): JapaneseVocabularyItem[] => {
	const completedExerciseIdSet = new Set(completedExerciseIds)
	const vocabularyByTerm = new Map<string, JapaneseVocabularyItem>()

	for (const exercise of exercises) {
		if (!completedExerciseIdSet.has(exercise.id)) {
			continue
		}

		for (const vocabularyItem of exercise.vocabulary) {
			if (!vocabularyByTerm.has(vocabularyItem.term)) {
				vocabularyByTerm.set(vocabularyItem.term, vocabularyItem)
			}
		}
	}

	return Array.from(vocabularyByTerm.values())
}
