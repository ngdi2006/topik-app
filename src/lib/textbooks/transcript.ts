/** Split studio question announcements and sentences without changing the words. */
export function structureTranscript(text: string) {
  return text.trim().split(/(?=(?:^|\s)\d{1,3}\s*번\s*[.,:：]?)/u).filter(part => part.trim()).map(part => {
    const match = part.trim().match(/^(\d{1,3}\s*번)\s*[.,:：]?\s*/u)
    const body = match ? part.trim().slice(match[0].length) : part.trim()
    const lines = body.match(/[^.!?。！？\n]+[.!?。！？]*(?:[”’"])?|[^\n]+/gu)?.map(line => line.trim()).filter(Boolean) ?? []
    return { heading: match?.[1] ?? null, lines }
  })
}
