# Workbook grading

The reader's green double-check button opens **Nộp và chấm bài**, with separate Vocabulary, Grammar, Writing, Reading and Listening tabs for the current unit. Reading/listening choice fields use `/api/textbooks/[bookId]/workbook/grade` and show correctness immediately after submitting that part. Vocabulary, grammar, writing and any non-choice reading/listening fields go to a selected authorized teacher. They never receive an automatic right/wrong judgment.

Automatic results distinguish correct, incorrect, unanswered and ungraded items. Only choice items with valid, reviewed keys contribute to the denominator. Reading and listening results remain separate and retain their image marks when switching tabs. Changing an answer invalidates the displayed results.

Manual parts use `/api/textbooks/[bookId]/workbook/submit`. The server checks book/unit access, validates each answer against server definitions, and inserts a complete snapshot into `user_textbook_annotations` with kind `workbook_submission`. Its `user_id` is the selected teacher, and `rect` contains student/unit/section identifiers. Existing owner RLS prevents ordinary learners from altering the submitted copy. Original learner answers remain separate. A stable request UUID makes failed-request retries idempotent; a deliberate subsequent submission creates a new copy. The success message appears only after successful storage.

Teachers and administrators receive these records at `/admin/textbooks/submissions`, linked from the textbook admin page. Teachers have textbook access automatically and see only records addressed to them; administrators see eligible queues. They can read answers, open source pages, enter a score and feedback. A matching pair counts as one item in teacher scoring. Score bounds and optimistic concurrency are checked server-side. Activated learners see the latest submission and teacher feedback when reopening the relevant part. No email, external message or schema migration is involved.

## Answer source required

The imported workbooks currently have no verified answer keys. Existing transcript data and discarded Gemini drafts are not official answer sources and are not used for scoring. No keys have been invented or installed as part of this feature. Until an authorized editor supplies verified answers, the UI explicitly reports **Chưa có đáp án chuẩn** instead of a misleading score.

Only admin can use **Đáp án chuẩn** beside the existing layout editor on desktop. Enter an option, text with optional accepted alternatives, or a complete matching map; check **Đã xác minh theo đáp án chuẩn**, then save. Fields use optional `answer_key: { status: "draft" | "reviewed", value: string | Record<string,string>, alternatives?: string[] }` inside existing workbook metadata. No database migration is needed. Changes reset verification until checked again. Reviewed invalid or incomplete keys are rejected by the server. Teacher layout edits must preserve existing keys and keyed question/option semantics.

Learners cannot write keys. Learner workbook responses redact them, and the raw page endpoint omits workbook definitions. Grading checks access to both the book and its unit and uses the server's keys. Draft keys do not appear in grade results. No AI or fuzzy grading is used; manual categories always await the teacher.

## Verification

- `node scripts/test-workbook-grading.cjs`: 5/10, unanswered counts, draft/missing keys, matching partial scores/shared targets, text alternatives.
- `node scripts/test-workbook-api.cjs`: authentication, ownership, key privacy, privileged key installation, invalid keys, manual snapshot persistence, duplicate request handling, recipient validation and teacher review. Automatic scoring excludes manual categories.
- `node scripts/test-workbook-reader-layout.mjs --smoke`: separate reading/listening results, manual submission, teacher marking and learner feedback after reopening, at 320/390/768/1440px. Results in screenshots come from local fixtures, not production answer keys or real submissions.
- `node scripts/test-workbook-matching-ui.mjs`: real controls for entering/verifying/submitting an admin key through a mocked PATCH; no real answer keys are written.
- TypeScript, ESLint and textbook preview access checks pass.
