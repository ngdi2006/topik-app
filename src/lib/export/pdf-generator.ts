import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Question {
    id: string
    question_text: string
    question_image_url?: string
    options: Array<{ type: 'text' | 'image'; content: string }>
    correct_answer: number
    question_type: string
    audio_url?: string
}

interface Category {
    id: string
    name: string
    icon: string
    description?: string
}

export async function generateCategoryPDF(
    category: Category,
    questions: Question[]
): Promise<jsPDF> {
    const doc = new jsPDF()
    let yPos = 20

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(`${category.icon} ${category.name}`, 105, yPos, { align: 'center' })

    yPos += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 105, yPos, {
        align: 'center',
    })
    doc.text(`Tổng số câu: ${questions.length}`, 105, yPos + 5, { align: 'center' })

    if (category.description) {
        yPos += 10
        doc.setFontSize(9)
        doc.text(category.description, 105, yPos, { align: 'center', maxWidth: 170 })
    }

    yPos += 15
    doc.setDrawColor(200, 200, 200)
    doc.line(20, yPos, 190, yPos)
    yPos += 10

    // Questions
    doc.setFontSize(11)
    questions.forEach((q, idx) => {
        // Check if need new page
        if (yPos > 250) {
            doc.addPage()
            yPos = 20
        }

        // Question number and text
        doc.setFont('helvetica', 'bold')
        doc.text(`Câu ${idx + 1}:`, 20, yPos)
        doc.setFont('helvetica', 'normal')

        const questionLines = doc.splitTextToSize(q.question_text, 160)
        doc.text(questionLines, 35, yPos)
        yPos += questionLines.length * 5 + 3

        // Question image (if exists)
        if (q.question_image_url) {
            try {
                doc.addImage(q.question_image_url, 'JPEG', 35, yPos, 60, 40)
                yPos += 45
            } catch (e) {
                doc.setFontSize(8)
                doc.setTextColor(150, 150, 150)
                doc.text('[Hình ảnh]', 35, yPos)
                yPos += 5
                doc.setTextColor(0, 0, 0)
                doc.setFontSize(11)
            }
        }

        // Audio note for listening questions
        if (q.question_type === 'listening' && q.audio_url) {
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 255)
            doc.text('🎧 [Câu hỏi nghe hiểu - có file audio]', 35, yPos)
            yPos += 5
            doc.setTextColor(0, 0, 0)
            doc.setFontSize(11)
        }

        // Options
        q.options.forEach((opt, i) => {
            if (yPos > 270) {
                doc.addPage()
                yPos = 20
            }

            const letter = String.fromCharCode(65 + i) // A, B, C, D

            if (opt.type === 'text') {
                const optionText = `${letter}. ${opt.content}`
                const optionLines = doc.splitTextToSize(optionText, 155)
                doc.text(optionLines, 30, yPos)
                yPos += optionLines.length * 5 + 2
            } else {
                // Image option
                doc.text(`${letter}.`, 30, yPos)
                try {
                    doc.addImage(opt.content, 'JPEG', 40, yPos - 3, 40, 30)
                    yPos += 33
                } catch (e) {
                    doc.setFontSize(8)
                    doc.setTextColor(150, 150, 150)
                    doc.text('[Hình ảnh đáp án]', 40, yPos)
                    yPos += 5
                    doc.setTextColor(0, 0, 0)
                    doc.setFontSize(11)
                }
            }
        })

        yPos += 8
    })

    // Answer key on new page
    doc.addPage()
    yPos = 20

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('ĐÁP ÁN', 105, yPos, { align: 'center' })
    yPos += 15

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')

    // Create answer table
    const answerData = questions.map((q, idx) => [
        `${idx + 1}`,
        String.fromCharCode(65 + q.correct_answer),
    ])

    autoTable(doc, {
        startY: yPos,
        head: [['Câu', 'Đáp án']],
        body: answerData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202], fontSize: 11 },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 30, halign: 'center' },
            1: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
        },
    })

    return doc
}
