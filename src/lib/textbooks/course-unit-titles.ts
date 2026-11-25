import lessons from '@/lib/eps-curriculum/pilot/lesson-catalog.json'
import type {TextbookUnit} from './types'

// Enrich existing source units for display; never change IDs, pages or custom titles.
export function withCourseUnitTitles<T extends TextbookUnit>(book:{code:string},unit:T):T{
    const volume=/^eps-topik-2025-([12])$/.exec(book.code.trim())
    if(!volume)return unit
    const source=lessons.find(item=>item.bookVolume===Number(volume[1])&&item.lessonNumber===Number(unit.unit_number))
    if(!source)return unit
    // The main course cover uses the full heading; vocabulary TOC abbreviates it.
    const titleKo=Number(unit.unit_number)===26?'한국의 주거 문화와 음식 문화':source.titleKo
    return {...unit,title_ko:unit.title_ko?.trim()?unit.title_ko:titleKo,title_vi:!unit.title_vi?.trim()||unit.title_vi.trim()===`Bài ${unit.unit_number}`?source.titleVi:unit.title_vi}
}
