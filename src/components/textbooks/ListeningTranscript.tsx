import { structureTranscript } from "@/lib/textbooks/transcript"

export default function ListeningTranscript({ text }: { text: string }) {
  const sections = structureTranscript(text)
  if (!sections.length) return <p className="text-xs text-slate-500">Chưa có lời thoại cho đoạn này.</p>
  return <div className="space-y-3 text-xs leading-6 text-slate-700 [overflow-wrap:anywhere]" data-structured-transcript lang="ko">
    {sections.map((section, index) => <section className={section.heading ? "border-t border-slate-100 pt-2 first:border-0 first:pt-0" : ""} key={index}>
      {section.heading ? <h5 className="mb-1 font-bold text-indigo-700">{section.heading}</h5> : null}
      <div className="space-y-1">
        {section.lines.map((line, lineIndex) => <p className={/^다시\s*(들으|듣)/u.test(line) ? "text-[11px] text-slate-400" : ""} key={lineIndex}>{line}</p>)}
      </div>
    </section>)}
  </div>
}
