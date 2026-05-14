// =====================================================================
// TOPIK-IBT: Excel Parser - Parse uploaded Excel to Question Bank entries
// =====================================================================

import * as XLSX from 'xlsx'
import DOMPurify from 'isomorphic-dompurify'
import type { ExcelImportResult, QuestionBankCreate } from '@/types/exam'

function sanitizeHtml(content: string): string {
    if (!content || typeof content !== 'string') return content

    const clean = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['u', 'b', 'i', 'strong', 'em', 'br', 'span'],
        ALLOWED_ATTR: ['style']
    })

    return clean
}

export function parseExcelBuffer(buffer: ArrayBuffer): ExcelImportResult[] {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    return rows.map((row, idx) => validateRow(row, idx + 2))
}

function validateRow(row: any, rowNumber: number): ExcelImportResult {
    const errors: string[] = []

    // Normalize keys (lowercase, trim)
    const normalized: Record<string, any> = {}
    Object.keys(row).forEach((key) => {
        normalized[key.toLowerCase().trim()] = row[key]
    })

    // Validate category_name
    const categoryName = String(normalized['category_name'] || '').trim()
    if (!categoryName) {
        errors.push('Thiếu category_name (tên kho)')
    }

    // Validate question_type
    const questionType = String(normalized['question_type'] || '').toLowerCase().trim()
    if (!questionType) {
        errors.push('Thiếu question_type')
    } else if (!['reading', 'listening'].includes(questionType)) {
        errors.push('question_type phải là "reading" hoặc "listening"')
    }

    // Validate level
    const level = parseInt(String(normalized['level'] || ''))
    if (!level || isNaN(level)) {
        errors.push('Thiếu level')
    } else if (level < 1 || level > 6) {
        errors.push('level phải từ 1-6')
    }

    // Validate question_text
    const questionText = String(normalized['question_text'] || '').trim()
    if (!questionText) {
        errors.push('Thiếu question_text')
    }

    // Validate options
    const option1 = String(normalized['option_1'] || '').trim()
    const option2 = String(normalized['option_2'] || '').trim()
    const option3 = String(normalized['option_3'] || '').trim()
    const option4 = String(normalized['option_4'] || '').trim()

    // Collect non-empty options
    const optionsArray = [
        { num: 1, content: option1 },
        { num: 2, content: option2 },
        { num: 3, content: option3 },
        { num: 4, content: option4 },
    ].filter(opt => opt.content)

    // Validate correct_answer only if there are options
    const correctAnswer = parseInt(String(normalized['correct_answer'] || ''))
    if (optionsArray.length > 0) {
        // Has options - validate correct_answer
        if (!correctAnswer || isNaN(correctAnswer)) {
            errors.push('Thiếu correct_answer')
        } else if (correctAnswer < 1 || correctAnswer > optionsArray.length) {
            errors.push(`correct_answer phải từ 1-${optionsArray.length}`)
        }
    }

    // Validate audio_url for listening
    const audioUrl = String(normalized['audio_url'] || '').trim()
    if (questionType === 'listening' && !audioUrl) {
        // Warning, not error
    }

    // Parse points
    const points = normalized['points']
        ? parseFloat(String(normalized['points']))
        : 1

    // Parse tags
    const tagsStr = String(normalized['tags'] || '').trim()
    const tags = tagsStr
        ? tagsStr.split(',').map((t: string) => t.trim()).filter(Boolean)
        : []

    // Parse question_position
    const questionPosition = String(normalized['question_position'] || 'below').toLowerCase().trim()
    if (!['above', 'below', ''].includes(questionPosition)) {
        errors.push('question_position phải là "above" hoặc "below"')
    }

    if (errors.length > 0) {
        return {
            row: rowNumber,
            valid: false,
            errors,
        }
    }

    const isImage = (str: string) => /\.(png|jpe?g|gif|webp)$/i.test(str);

    // Build QuestionBankCreate (with category_name for lookup)
    const data: any = {
        category_name: categoryName, // Will be converted to category_id in import route
        question_type: questionType as 'reading' | 'listening',
        level,
        passage: sanitizeHtml(String(normalized['passage'] || '').trim()) || undefined,
        question_text: sanitizeHtml(questionText),
        question_position: questionPosition || 'below',
        question_image_url:
            String(normalized['question_image_url'] || '').trim() || undefined,
        audio_url: audioUrl || undefined,
        options: optionsArray.map(opt => ({
            type: isImage(opt.content) ? 'image' : 'text',
            content: sanitizeHtml(opt.content)
        })),
        correct_answer: correctAnswer - 1, // Convert 1-4 → 0-3
        shuffle_options: true,
        points: points >= 0 ? points : 1,
        tags,
    }

    return {
        row: rowNumber,
        valid: true,
        errors: [],
        data,
    }
}
