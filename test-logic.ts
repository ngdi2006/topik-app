function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

function shuffleOptions(question: any) {
    if (question.shuffle_options === false) {
        return {
            shuffledOptions: question.options,
            shuffledCorrectAnswer: question.correct_answer,
        }
    }

    const indices = question.options.map((_: any, i: number) => i)
    const shuffledIndices = shuffleArray(indices)
    const shuffledOptions = shuffledIndices.map((i) => question.options[i])
    const shuffledCorrectAnswer = shuffledIndices.indexOf(question.correct_answer)

    return { shuffledOptions, shuffledCorrectAnswer }
}

const q = {
    options: ['A', 'B', 'C', 'D'],
    correct_answer: 0,
    shuffle_options: true,
    question_categories: { shuffle_options: false }
}

const cat = (q as any).question_categories
const categoryShuffle = Array.isArray(cat) ? cat[0]?.shuffle_options : cat?.shuffle_options

const qb = {
    ...q,
    shuffle_options: categoryShuffle !== undefined ? categoryShuffle : q.shuffle_options,
}

console.log('categoryShuffle:', categoryShuffle)
console.log('qb.shuffle_options:', qb.shuffle_options)
console.log('Result:', shuffleOptions(qb))
