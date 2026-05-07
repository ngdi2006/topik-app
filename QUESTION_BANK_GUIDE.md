# 📚 Hệ thống Question Bank & Exam Management - Hướng dẫn triển khai

## ✅ Đã hoàn thành (Backend Foundation)

### 1. **Database Schema** (`setup_question_bank_system.sql`)
- ✅ 7 bảng: `question_bank`, `exam_question_rules`, `user_question_history`, `exam_attempts`, `exam_analysis`, `practice_sessions`
- ✅ RLS policies đầy đủ cho security
- ✅ Storage bucket `question-media` cho images & audio
- ✅ Indexes và triggers

**Cách chạy:**
```sql
-- Copy toàn bộ nội dung file setup_question_bank_system.sql
-- Paste vào Supabase SQL Editor → Execute
```

### 2. **TypeScript Types** (`src/types/exam.ts`)
- ✅ 30+ interfaces đầy đủ
- ✅ QuestionBank, ExamQuestionRule, ExamAttempt, ExamAnalysis, PracticeSession
- ✅ Excel import/export types

### 3. **Core Libraries**

#### `src/lib/exam/grader.ts`
- Chấm điểm tự động
- Tính điểm với points override từ rules
- Return: score, total_points, correct_count, wrong_count, percentage

#### `src/lib/exam/randomizer.ts`
- **Random non-repeat logic** - Cốt lõi của hệ thống
- Mỗi user có history riêng per rule
- Auto reset cycle khi không đủ câu
- Functions:
  - `generateRandomQuestionsForUser()` - Random câu từ kho
  - `createExamAttempt()` - Tạo phiên thi với snapshot

#### `src/lib/excel/parser.ts` & `generator.ts`
- Parse Excel upload → validate → preview
- Generate template với sample data
- Export question bank to Excel

#### `src/lib/ai/exam-analyzer.ts`
- AI phân tích câu sai (Gemini 2.0 Flash)
- Extract vocabulary & grammar points
- Analyze weak/strong areas
- Generate recommendations

### 4. **API Routes (Đã hoàn thành)**

#### Question Bank APIs:
```
GET    /api/admin/question-bank              - List (với filters)
POST   /api/admin/question-bank              - Create
GET    /api/admin/question-bank/[id]         - Get one
PUT    /api/admin/question-bank/[id]         - Update
DELETE /api/admin/question-bank/[id]         - Delete
POST   /api/admin/question-bank/import       - Parse Excel
PUT    /api/admin/question-bank/import       - Confirm import
GET    /api/admin/question-bank/template     - Download template
GET    /api/admin/question-bank/export       - Export to Excel
```

#### Upload API:
```
POST   /api/admin/upload                     - Upload image/audio to Storage
```

#### Exam Rules APIs:
```
GET    /api/admin/exams/[id]/rules           - List rules (với available count)
POST   /api/admin/exams/[id]/rules           - Create rule
PUT    /api/admin/exams/[id]/rules/[ruleId]  - Update rule
DELETE /api/admin/exams/[id]/rules/[ruleId]  - Delete rule
```

#### Exam Flow APIs (Quan trọng):
```
POST   /api/exams/[id]/start                 - Start exam (random questions)
POST   /api/exams/[id]/submit                - Submit & grade (+ AI analysis)
GET    /api/analysis/[attemptId]             - Get analysis result
```

---

## 🚧 Cần hoàn thành tiếp (Frontend)

### 1. **Admin Pages**

#### `/admin/question-bank/page.tsx`
```tsx
- Table hiển thị danh sách câu hỏi
- Filters: question_type, level, search
- Pagination
- Actions: Edit, Delete, View
- Buttons: [+ Tạo mới] [📥 Import Excel] [📤 Export]
```

#### `/admin/question-bank/create/page.tsx` & `/[id]/page.tsx`
```tsx
- Form tạo/sửa câu hỏi
- Fields:
  - question_type (reading/listening)
  - level (1-6)
  - passage (textarea, optional)
  - question_text (textarea, required)
  - question_image_url (upload)
  - audio_url (upload, required for listening)
  - 4 options (text inputs)
  - correct_answer (radio 1-4)
  - points (number)
  - tags (multi-select)
- MediaUploader component cho images/audio
```

#### `/admin/question-bank/import/page.tsx`
```tsx
- Upload Excel file
- Preview table với validation results
- Show: ✓ Valid rows, ❌ Invalid rows với errors
- Stats: Total, Valid, Invalid
- Button: [Confirm Import X valid questions]
```

#### Update `/admin/exams/[id]/page.tsx`
```tsx
Thêm tab "Cấu hình Rules":
- List rules hiện tại
- Form thêm rule mới:
  - section_name
  - question_type
  - levels (multi-select 1-6)
  - tags (optional)
  - quantity
  - points_per_question (0 = use question.points)
- Hiển thị available_count cho mỗi rule
- Warning nếu available < quantity
```

### 2. **Learner Pages**

#### `/exam/[id]/page.tsx` (Trang làm bài)
```tsx
Flow:
1. Click "Bắt đầu" → POST /api/exams/[id]/start
2. Nhận questions snapshot
3. Hiển thị từng câu với timer
4. Lưu answers vào state
5. Submit → POST /api/exams/[id]/submit
6. Redirect to results page
```

#### `/results/[attemptId]/page.tsx` (Kết quả)
```tsx
- Hiển thị điểm: score/total_points
- Correct/Wrong count
- Percentage
- Button: [Xem chi tiết đáp án] [Xem phân tích AI]
```

#### `/results/[attemptId]/detail/page.tsx`
```tsx
- List tất cả câu hỏi
- Mỗi câu:
  - ✓ Đúng (bg-green) hoặc ✗ Sai (bg-red)
  - Hiển thị đáp án user chọn
  - Highlight đáp án đúng (màu xanh)
  - Hiển thị passage nếu có
```

#### `/results/[attemptId]/analysis/page.tsx`
```tsx
GET /api/analysis/[attemptId]

Hiển thị:
1. Weak Areas Chart (bar chart)
2. Recommendations Cards:
   - Làm lại câu sai
   - Luyện tập câu tương tự
   - Học từ vựng
   - Quiz từ vựng
   - Học ngữ pháp
3. Vocabulary List (10 từ)
4. Grammar Points (5 điểm)
5. AI Summary
```

### 3. **Components cần tạo**

#### `components/admin/QuestionForm.tsx`
```tsx
- Form với validation (react-hook-form + zod)
- MediaUploader integration
- 4 options inputs
- Correct answer selector
```

#### `components/admin/MediaUploader.tsx`
```tsx
- Drag & drop hoặc click to upload
- Preview image/audio
- Upload to /api/admin/upload
- Return URL
```

#### `components/admin/ExamRuleBuilder.tsx`
```tsx
- Form add/edit rule
- Multi-select levels
- Tags input
- Quantity input
- Points per question
- Show available count
```

#### `components/exam/QuestionCard.tsx`
```tsx
- Hiển thị 1 câu hỏi
- Passage (nếu có)
- Question text
- Image (nếu có)
- Audio player (nếu có)
- 4 options (radio buttons)
```

#### `components/exam/ResultDetail.tsx`
```tsx
- List câu hỏi với đáp án
- Màu xanh/đỏ cho đúng/sai
- Highlight correct answer
```

#### `components/analysis/WeakAreasChart.tsx`
```tsx
- Bar chart hiển thị tỷ lệ sai
- Dùng recharts hoặc chart.js
```

#### `components/analysis/RecommendationCard.tsx`
```tsx
- Card cho mỗi recommendation
- Icon + Title + Description
- Button "Bắt đầu"
```

---

## 📝 Testing Checklist

### Backend Testing:
```bash
# 1. Test Question Bank CRUD
curl http://localhost:3000/api/admin/question-bank

# 2. Test Excel Import
# Upload file qua Postman/Thunder Client

# 3. Test Start Exam
curl -X POST http://localhost:3000/api/exams/[exam-id]/start

# 4. Test Submit Exam
curl -X POST http://localhost:3000/api/exams/[exam-id]/submit \
  -d '{"attempt_id":"...","answers":{"q1":0,"q2":1}}'
```

### Frontend Testing:
1. ✅ Admin tạo câu hỏi thủ công
2. ✅ Admin import Excel (valid + invalid rows)
3. ✅ Admin tạo exam rules
4. ✅ Learner start exam → random questions
5. ✅ Learner làm bài → submit
6. ✅ Xem kết quả + chi tiết
7. ✅ Xem phân tích AI
8. ✅ Test non-repeat: làm lại exam → câu khác

---

## 🎯 Priority Implementation Order

1. **HIGH**: Admin Question Bank pages (create, list, edit)
2. **HIGH**: Admin Exam Rules UI (trong exam edit page)
3. **HIGH**: Learner exam flow (start → làm bài → submit)
4. **MEDIUM**: Results & detail pages
5. **MEDIUM**: AI Analysis page
6. **LOW**: Practice sessions
7. **LOW**: UI polish & responsive

---

## 🔧 Environment Variables cần thiết

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google AI (cho analysis)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```

---

## 📚 Code Examples

### Start Exam (Client):
```typescript
const startExam = async (examId: string) => {
  const res = await fetch(`/api/exams/${examId}/start`, { method: 'POST' })
  const data = await res.json()
  
  if (data.success) {
    // data.attempt.questions - array of questions
    // data.attempt.id - attempt_id for submit
    setQuestions(data.attempt.questions)
    setAttemptId(data.attempt.id)
  }
}
```

### Submit Exam (Client):
```typescript
const submitExam = async () => {
  const res = await fetch(`/api/exams/${examId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attempt_id: attemptId,
      answers: { "q1-id": 0, "q2-id": 2, ... }
    })
  })
  
  const data = await res.json()
  // data.result.score, data.analysis_id
  router.push(`/results/${attemptId}`)
}
```

---

## 🚀 Deployment Notes

1. Chạy SQL migration trên Supabase Production
2. Tạo Storage bucket `question-media`
3. Set environment variables
4. Deploy Next.js app
5. Test end-to-end flow

---

**Hệ thống đã có foundation vững chắc. Tiếp tục build UI theo priority order!**
