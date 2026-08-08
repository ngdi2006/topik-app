'use client'

import { WORKSHOP_SAMPLE_GAMES } from '../sampleGames'
import { WorkshopGamePreview } from './WorkshopGamePreview'

export function WorkshopSampleGamesPreview() {
    return <div className="grid gap-4 lg:grid-cols-3">
        {WORKSHOP_SAMPLE_GAMES.map((game) => <WorkshopGamePreview key={game.id} config={game.config} questionKo={game.questionKo} questionVi={game.questionVi} />)}
    </div>
}
