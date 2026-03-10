import { describe, expect, it } from 'vitest'
import type { JapaneseTypingExercise } from '../src/lib/japanese-typing'
import {
	buildJapaneseVocabularyBank,
	getJapaneseTypingMatchLength,
	normalizeJapaneseTypingAnswer,
} from '../src/lib/japanese-typing'

const mockExercises: JapaneseTypingExercise[] = [
	{
		id: 'first',
		level: 'N5',
		scene: 'mock',
		prompt: 'mock',
		focus: 'mock',
		japanese: '日本語を勉強します。',
		reading: 'にほんごを べんきょうします。',
		romaji: 'nihongo o benkyou shimasu',
		translation: 'I study Japanese.',
		grammarPoints: [],
		vocabulary: [
			{
				id: 'nihongo',
				term: '日本語',
				reading: 'にほんご',
				meaning: 'Japanese language',
				partOfSpeech: 'noun',
				example: '日本語を話します。',
			},
			{
				id: 'benkyou',
				term: '勉強',
				reading: 'べんきょう',
				meaning: 'study',
				partOfSpeech: 'noun',
				example: '勉強を続けます。',
			},
		],
	},
	{
		id: 'second',
		level: 'N5',
		scene: 'mock',
		prompt: 'mock',
		focus: 'mock',
		japanese: '日本語の本を読みます。',
		reading: 'にほんごの ほんを よみます。',
		romaji: 'nihongo no hon o yomimasu',
		translation: 'I read a Japanese book.',
		grammarPoints: [],
		vocabulary: [
			{
				id: 'nihongo-second',
				term: '日本語',
				reading: 'にほんご',
				meaning: 'Japanese language',
				partOfSpeech: 'noun',
				example: '日本語が好きです。',
			},
			{
				id: 'hon',
				term: '本',
				reading: 'ほん',
				meaning: 'book',
				partOfSpeech: 'noun',
				example: '本を借ります。',
			},
		],
	},
]

const firstUnlockedVocabulary = mockExercises[0]?.vocabulary[0]
const secondUnlockedVocabulary = mockExercises[0]?.vocabulary[1]
const thirdUnlockedVocabulary = mockExercises[1]?.vocabulary[1]

if (
	!(firstUnlockedVocabulary && secondUnlockedVocabulary && thirdUnlockedVocabulary)
) {
	throw new Error('Expected mock vocabulary items to exist.')
}

describe('japanese typing utilities', () => {
	it('normalizes romaji answers for forgiving comparisons', () => {
		expect(
			normalizeJapaneseTypingAnswer(
				' Watashi-wa MAINICHI Nihongo o benkyou shimasu! '
			)
		).toBe('watashiwamainichinihongoobenkyoushimasu')
	})

	it('measures the correct input prefix length', () => {
		expect(getJapaneseTypingMatchLength('nihongo o ben', 'nihongo o benkyou')).toBe(
			11
		)
		expect(getJapaneseTypingMatchLength('nihox', 'nihongo o benkyou')).toBe(4)
	})

	it('builds a deduplicated unlocked vocabulary bank', () => {
		expect(buildJapaneseVocabularyBank(mockExercises, ['first'])).toHaveLength(2)
		expect(buildJapaneseVocabularyBank(mockExercises, ['first', 'second'])).toEqual([
			firstUnlockedVocabulary,
			secondUnlockedVocabulary,
			thirdUnlockedVocabulary,
		])
	})
})
