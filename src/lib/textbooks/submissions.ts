import type { WorkbookField, WorkbookValue } from "./workbook"

export type ManualSection = "vocabulary" | "grammar" | "writing" | "reading" | "listening"
export type SubmittedAnswer = { pageNumber: number; fieldId: string; label: string; kind: WorkbookField["kind"]; value: WorkbookValue; options: { id: string; label: string }[]; sources: { id: string; label: string }[]; targets: { id: string; label: string }[] }
export type TeacherReview = { reviewedAt: string; teacherId: string; correct: number; total: number; feedback: string }
export type WorkbookSubmission = { version: 1; studentId: string; studentName: string; unitId: string; unitTitle: string; bookTitle: string; section: ManualSection; status: "pending" | "reviewed"; submittedAt: string; answers: SubmittedAnswer[]; review: TeacherReview | null }
export type SubmissionSummary = { id: string; section: ManualSection; status: "pending" | "reviewed"; submittedAt: string; teacherId: string; review: TeacherReview | null }
export const submissionTotal = (answers: SubmittedAnswer[]) => answers.reduce((sum, answer) => sum + (answer.kind === "match" ? answer.sources.length : 1), 0)
export const isWorkbookReviewer = (profile: { role?: unknown; admin_permissions?: unknown } | null) => !!profile && (profile.role === "admin" || profile.role === "teacher")
