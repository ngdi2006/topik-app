import {
    Document,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    PageBreak,
    ImageRun,
} from 'docx'

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

async function fetchImageAsBuffer(url: string): Promise<Buffer | null> {
    try {
        const response = await fetch(url)
        if (!response.ok) return null
        const arrayBuffer = await response.arrayBuffer()
        return Buffer.from(arrayBuffer)
    } catch (error) {
        console.error('Failed to fetch image:', error)
        return null
    }
}

export async function generateCategoryDocx(
    category: Category,
    questions: Question[]
): Promise<Document> {
    const children: any[] = []

    // Header
    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [
                new TextRun({
                    text: `${category.icon} ${category.name}`,
                    bold: true,
                    size: 36,
                }),
            ],
        })
    )

    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({
                    text: `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`,
                    size: 20,
                }),
            ],
        })
    )

    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
                new TextRun({
                    text: `Tổng số câu: ${questions.length}`,
                    size: 20,
                }),
            ],
        })
    )

    if (category.description) {
        children.push(
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({
                        text: category.description,
                        italics: true,
                        size: 18,
                    }),
                ],
            })
        )
    }

    // Spacing
    children.push(new Paragraph({ text: '' }))
    children.push(new Paragraph({ text: '' }))

    // Questions
    for (let idx = 0; idx < questions.length; idx++) {
        const q = questions[idx]

        // Question number and text
        children.push(
            new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [
                    new TextRun({
                        text: `Câu ${idx + 1}: `,
                        bold: true,
                        size: 24,
                    }),
                    new TextRun({
                        text: q.question_text,
                        size: 24,
                    }),
                ],
            })
        )

        // Question image
        if (q.question_image_url) {
            const imageBuffer = await fetchImageAsBuffer(q.question_image_url)
            if (imageBuffer) {
                try {
                    children.push(
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new ImageRun({
                                    data: imageBuffer,
                                    transformation: {
                                        width: 300,
                                        height: 200,
                                    },
                                } as any),
                            ],
                        })
                    )
                } catch (e) {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: '[Hình ảnh câu hỏi]',
                                    italics: true,
                                    color: '888888',
                                }),
                            ],
                        })
                    )
                }
            }
        }

        // Audio note
        if (q.question_type === 'listening' && q.audio_url) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '🎧 [Câu hỏi nghe hiểu - có file audio]',
                            italics: true,
                            color: '4A6FFF',
                            size: 20,
                        }),
                    ],
                })
            )
        }

        // Options
        for (let i = 0; i < q.options.length; i++) {
            const opt = q.options[i]
            const letter = String.fromCharCode(65 + i)

            if (opt.type === 'text') {
                children.push(
                    new Paragraph({
                        indent: { left: 400 },
                        children: [
                            new TextRun({
                                text: `${letter}. ${opt.content}`,
                                size: 22,
                            }),
                        ],
                    })
                )
            } else {
                // Image option
                children.push(
                    new Paragraph({
                        indent: { left: 400 },
                        children: [
                            new TextRun({
                                text: `${letter}. `,
                                size: 22,
                                bold: true,
                            }),
                        ],
                    })
                )

                const imageBuffer = await fetchImageAsBuffer(opt.content)
                if (imageBuffer) {
                    try {
                        children.push(
                            new Paragraph({
                                indent: { left: 600 },
                                children: [
                                    new ImageRun({
                                        data: imageBuffer,
                                        transformation: { width: 150, height: 100 },
                                    } as any),
                                ],
                            })
                        )
                    } catch (e) {
                        children.push(
                            new Paragraph({
                                indent: { left: 600 },
                                children: [
                                    new TextRun({
                                        text: '[Hình ảnh đáp án]',
                                        italics: true,
                                        color: '888888',
                                    }),
                                ],
                            })
                        )
                    }
                }
            }
        }
    }

    // Page break before answer key
    children.push(
        new Paragraph({
            children: [new PageBreak()],
        })
    )

    // Answer key
    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [
                new TextRun({
                    text: 'ĐÁP ÁN',
                    bold: true,
                    size: 32,
                }),
            ],
        })
    )

    children.push(new Paragraph({ text: '' }))

    // Answer table
    const tableRows = [
        new TableRow({
            tableHeader: true,
            children: [
                new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    shading: { fill: '428BCA' },
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({
                                    text: 'Câu',
                                    bold: true,
                                    color: 'FFFFFF',
                                }),
                            ],
                        }),
                    ],
                }),
                new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    shading: { fill: '428BCA' },
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new TextRun({
                                    text: 'Đáp án',
                                    bold: true,
                                    color: 'FFFFFF',
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        }),
        ...questions.map(
            (q, idx) =>
                new TableRow({
                    children: [
                        new TableCell({
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    children: [new TextRun({ text: `${idx + 1}` })],
                                }),
                            ],
                        }),
                        new TableCell({
                            children: [
                                new Paragraph({
                                    alignment: AlignmentType.CENTER,
                                    children: [
                                        new TextRun({
                                            text: String.fromCharCode(65 + q.correct_answer),
                                            bold: true,
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ],
                })
        ),
    ]

    children.push(
        new Table({
            width: { size: 50, type: WidthType.PERCENTAGE },
            rows: tableRows,
        })
    )

    // Create document
    const doc = new Document({
        sections: [
            {
                properties: {},
                children,
            },
        ],
    })

    return doc
}
