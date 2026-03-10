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
}

const ROMAJI_SANITIZE_REGEX = /[^a-z0-9]/g

export const normalizeJapaneseTypingAnswer = (answer: string): string =>
	answer.normalize('NFKC').toLowerCase().trim().replace(ROMAJI_SANITIZE_REGEX, '')

export const getJapaneseTypingMatchLength = (
	inputValue: string,
	targetValue: string
): number => {
	const normalizedInput = normalizeJapaneseTypingAnswer(inputValue)
	const normalizedTarget = normalizeJapaneseTypingAnswer(targetValue)
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
