// =====================================================================
// TOPIK-IBT: Excel Generator - Template & Export
// =====================================================================

import * as XLSX from 'xlsx'
import type { QuestionBank } from '@/types/exam'

const HEADERS = [
    'category_name',
    'question_type',
    'level',
    'passage',
    'question_text',
    'question_position',
    'option_1',
    'option_2',
    'option_3',
    'option_4',
    'correct_answer',
    'points',
    'tags',
    'question_image_url',
    'audio_url',
]

const SAMPLE_ROWS = [
    {
        category_name: 'TOPIK I - Cơ bản',
        question_type: 'reading',
        level: 3,
        passage: '한국에서는 추석에 가족과 함께 송편을 만들어 먹습니다.',
        question_text: '추석에 한국 사람들이 무엇을 먹습니까?',
        question_position: 'below',
        option_1: '김치',
        option_2: '<u>송편</u>',
        option_3: '비빔밥',
        option_4: '',
        correct_answer: 2,
        points: 5,
        tags: 'culture,vocabulary',
        question_image_url: '',
        audio_url: '',
    },
    {
        category_name: 'TOPIK II - Nâng cao',
        question_type: 'listening',
        level: 4,
        passage: '',
        question_text: '대화를 듣고 알맞은 답을 고르세요.',
        question_position: 'above',
        option_1: '학교에 갑니다',
        option_2: '회사에 갑니다',
        option_3: '',
        option_4: '',
        correct_answer: 2,
        points: 5,
        tags: 'listening,conversation',
        question_image_url: '',
        audio_url: 'https://example.com/audio.mp3',
    },
]

/**
 * Generate Excel template buffer for download
 */
export function generateTemplateBuffer(): ArrayBuffer {
    const workbook = XLSX.utils.book_new()

    // Sheet 1: Template với sample data
    const sheet = XLSX.utils.json_to_sheet(SAMPLE_ROWS, { header: HEADERS })

    // Set column widths
    sheet['!cols'] = HEADERS.map(() => ({ wch: 20 }))
    sheet['!cols'][2] = { wch: 40 } // passage
    sheet['!cols'][3] = { wch: 40 } // question_text

    XLSX.utils.book_append_sheet(workbook, sheet, 'Questions')

    // Sheet 2: Hướng dẫn
    const guideRows = [
        ['HƯỚNG DẪN NHẬP CÂU HỎI'],
        [''],
        ['Cột', 'Mô tả', 'Bắt buộc', 'Ví dụ'],
        ['category_name', 'Tên kho câu hỏi', 'CÓ', 'TOPIK I - Cơ bản'],
        ['question_type', 'Dạng câu hỏi', 'CÓ', 'reading hoặc listening'],
        ['level', 'Cấp độ (1-6)', 'CÓ', '3'],
        ['passage', 'Đoạn văn (đọc hiểu)', 'KHÔNG', '한국에서는...'],
        ['question_text', 'Nội dung câu hỏi', 'CÓ', '무엇을 먹습니까?'],
        ['question_position', 'Vị trí câu hỏi', 'KHÔNG', 'above hoặc below (mặc định)'],
        ['option_1 ~ option_4', 'Đáp án (2-4 đáp án)', 'CÓ (ít nhất 2)', 'Có thể để trống option_3, option_4'],
        ['correct_answer', 'Đáp án đúng (1-4)', 'CÓ', '2'],
        ['points', 'Điểm câu hỏi', 'KHÔNG', '5 (mặc định 1)'],
        ['tags', 'Tags cách nhau bởi dấu phẩy', 'KHÔNG', 'culture,vocabulary'],
        ['question_image_url', 'URL hình ảnh', 'KHÔNG', 'https://...'],
        ['audio_url', 'URL audio (nghe hiểu)', 'KHÔNG', 'https://...'],
        ['', '', '', ''],
        ['HTML FORMATTING - Hỗ trợ định dạng văn bản:', '', ''],
        ['', 'Gạch chân: <u>text</u>', '', '<u>송편</u>'],
        ['', 'In đậm: <b>text</b> hoặc <strong>text</strong>', '', '<b>중요</b>'],
        ['', 'In nghiêng: <i>text</i> hoặc <em>text</em>', '', '<i>참고</i>'],
    ]
    const guideSheet = XLSX.utils.aoa_to_sheet(guideRows)
    guideSheet['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(workbook, guideSheet, 'Hướng dẫn')

    return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}

/**
 * Export Question Bank data to Excel buffer
 */
export function exportQuestionsToBuffer(questions: any[]): ArrayBuffer {
    const rows = questions.map((q) => ({
        category_name: q.category_name || 'Unknown',
        question_type: q.question_type,
        level: q.level,
        passage: q.passage || '',
        question_text: q.question_text,
        question_position: q.question_position || 'below',
        option_1: q.options[0]?.content || '',
        option_2: q.options[1]?.content || '',
        option_3: q.options[2]?.content || '',
        option_4: q.options[3]?.content || '',
        correct_answer: q.correct_answer + 1, // Convert 0-3 → 1-4
        points: q.points,
        tags: q.tags?.join(',') || '',
        question_image_url: q.question_image_url || '',
        audio_url: q.audio_url || '',
    }))

    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.json_to_sheet(rows, { header: HEADERS })
    sheet['!cols'] = HEADERS.map(() => ({ wch: 20 }))
    sheet['!cols'][3] = { wch: 40 } // passage
    sheet['!cols'][4] = { wch: 40 } // question_text
    XLSX.utils.book_append_sheet(workbook, sheet, 'Questions')

    return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}
