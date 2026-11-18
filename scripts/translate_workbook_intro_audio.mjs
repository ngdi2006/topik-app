// Human-authored Vietnamese glossary and instructions for the compact intro recordings.
// ElevenLabs' Korean transcript/timestamps are preserved verbatim; no answers are inferred.
import { readFile, writeFile } from 'node:fs/promises'
const root = 'tmp/workbook-listening-intro'
const definitions = {
  'hangul-1': { numbers: [2,4,6,8,11,13,15,17,20,22,24,26,28,31,33,35,37,39], phonemes: true },
  'hangul-2-a': { numbers: [2,4,6,8,11,13,15,17,20,22,24,26,28,31,33,35,37,39,42,44,46,48,50,52,55,57,59,61,63,65] },
  'hangul-2-b': { numbers: [1,3,5,7,9,12,14,16,18,20,23,25,27,29,31,33,35,37,40,42,44,46,48,50,52,54,57,59,61,63,65,67,69,71,74,76,78,80,82,84,86,88], offset: 15 },
  greetings: { numbers: [4,6,8,10,13,15,17,19,21] },
}
const glossary = {
  '코': 'mũi', '타조': 'đà điểu', '포도': 'nho', '자': 'thước', '키': 'chiều cao', '벼': 'cây lúa', '차': 'xe / trà',
  '싸다': 'rẻ', '자다': 'ngủ', '우표': 'tem thư', '파도': 'sóng biển', '코트': 'áo khoác ngoài', '커피': 'cà phê',
  '공': 'quả bóng / số không', '삼': 'số ba / nhân sâm', '문': 'cửa', '박': 'quả bầu / họ Park', '술': 'rượu',
  '벽': 'bức tường', '밤': 'ban đêm / hạt dẻ', '부엌': 'nhà bếp', '산': 'núi', '낫': 'cái liềm', '꽃': 'hoa', '밑': 'phía dưới', '발': 'bàn chân',
  '레몬': 'quả chanh vàng', '남자': 'đàn ông', '딸기': 'dâu tây', '신문': 'báo', '연필': 'bút chì', '우산': 'ô / dù', '컴퓨터': 'máy tính', '냉장고': 'tủ lạnh',
  '안녕하십니까': 'Xin chào (cách chào trang trọng).', '처음 뵙겠습니다': 'Rất hân hạnh được gặp lần đầu.', '잘 가요': 'Tạm biệt (nói với người ra về).', '고맙습니다': 'Xin cảm ơn.', '미안해요': 'Tôi xin lỗi.',
}
const numbers = { 일:1, 이:2, 삼:3, 사:4, 오:5, 육:6, 칠:7, 팔:8, 구:9, 십:10, 십일:11, 십이:12, 십삼:13, 십사:14, 십오:15, 십육:16, 십칠:17, 십팔:18, 십구:19, 이십:20, 이십일:21 }
for (const [key, config] of Object.entries(definitions)) {
  const directory = `${root}/${key}`
  const data = JSON.parse(await readFile(`${directory}/segments.json`, 'utf8'))
  const transcript = JSON.parse(await readFile(`${directory}/transcript.json`, 'utf8'))
  const translations = []
  for (const [index, segment] of data.segments.entries()) {
    const ko = segment.text_ko.trim()
    const clean = ko.replace(/[.!?]+$/, '')
    let vi, note = ''
    if (ko === '1과 한글 익히기 1.') vi = 'Bài 1. Làm quen với chữ Hàn I.'
    else if (ko === '2과 한글 익히기 2.') vi = 'Bài 2. Làm quen với chữ Hàn II.'
    else if (ko === '다시 들으십시오.') vi = 'Hãy nghe lại.'
    else if (ko.includes('잘 듣고 맞으면')) vi = `${ko.match(/^(\d+)번/) ? `Phần ${ko.match(/^(\d+)번/)[1]}. ` : ''}Hãy nghe kỹ; đúng thì đánh dấu O, sai thì đánh dấu X.`
    else if (ko.includes('잘 듣고 맞은 것을 고르십시오')) vi = `${ko.match(/^(\d+)번/) ? `Phần ${ko.match(/^(\d+)번/)[1]}. ` : ''}Hãy nghe kỹ và chọn đáp án phù hợp.`
    else if (ko.includes('잘 듣고 쓰십시오')) vi = `${ko.match(/^(\d+)번/) ? `Phần ${ko.match(/^(\d+)번/)[1]}. ` : ''}Hãy nghe kỹ và viết lại.`
    else if (config.numbers.includes(index)) {
      const number = /^\d+$/.test(clean) ? Number(clean) : numbers[clean]
      if (!number) throw new Error(`${key} segment ${index}: unknown spoken number ${ko}`)
      vi = `Câu ${number}${config.offset ? ` (câu ${number + config.offset} trong sách)` : ''}.`
    } else if (config.phonemes) vi = `Âm/cụm âm “${clean}”.`
    else if (key === 'greetings' && index === 0) { vi = `Lời mở đầu theo bản nhận dạng: “${clean}” (cần đối chiếu với âm thanh).`; note = 'Opening lesson announcement may be transcribed as a word; raw Korean retained.' }
    else if (key === 'greetings' && index === 1) vi = 'Xin chào.'
    else if (key === 'greetings' && index === 2) vi = 'Phần 1. Câu 1.'
    else if (glossary[clean]) vi = key === 'greetings' ? glossary[clean] : `“${clean}”: ${glossary[clean]}.`
    else throw new Error(`${key} segment ${index}: untranslated text ${ko}`)
    const words = transcript.words.filter(w => w.type === 'word' && w.text?.trim()).slice(segment.firstWord, segment.lastWord + 1)
    const uncertain = !!note || words.some(w => w.start === w.end)
    translations.push({ ...segment, text_vi: vi, uncertain, ...(note ? { review_note: note } : {}) })
  }
  await writeFile(`${directory}/bilingual.json`, JSON.stringify({ ...data, translationProvider: 'human_authored_korean_vietnamese', preservesRawElevenLabsTranscript: true, ...(config.offset ? { sourceQuestionOffset: config.offset, note_vi: 'File gốc đánh số 1–21; tương ứng câu 16–36 trong sách.' } : {}), segments: translations }, null, 2))
  await writeFile(`${directory}/transcript.ko-vi.txt`, translations.map(s => `[${s.start.toFixed(2)}–${s.end.toFixed(2)}]\n${s.text_ko}\n${s.text_vi}`).join('\n\n'))
  console.log(`${key}: ${translations.length} bilingual segments; Korean preserved verbatim`)
}
