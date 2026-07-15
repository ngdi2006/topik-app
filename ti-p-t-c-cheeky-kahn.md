# Báo cáo: AI Usage trong Phỏng vấn Vòng 2

## 1. Tổng quan các endpoint AI

| # | API Route | Model | Mục đích | Gọi mỗi session |
|---|---|---|---|---|
| 1 | `POST /api/interview/evaluate` | Gemini 2.0 Flash | Chấm điểm phát âm, ngữ pháp, độ trôi chảy cho từng câu | **5 lần** (song song) |
| 2 | `POST /api/chat/evaluate` | Gemini 2.0 Flash | Phân tích hội thoại AI tutor (điểm mạnh/yếu/lời khuyên) | 1 lần |
| 3 | `POST /api/ai/milestones/evaluate` | Gemini 2.0 Flash | Chấm điểm từng phần trong bài kiểm tra mốc | N phần |
| 4 | `POST /api/ai/milestones/evaluate-batch` | Gemini 2.0 Flash | Chấm điểm tất cả phần trong 1 lần (batch) | 1 lần |
| 5 | `POST /api/ai/milestones/generate-intro` | Gemini 2.0 Flash | Tạo script tự giới thiệu tiếng Hàn | 1 lần |
| 6 | `POST /api/generate-exam` | Gemini 2.0 Flash | Tạo đề thi đọc (3 câu) | Admin |
| 7 | `POST /api/admin/ai-sync` | Gemini 2.5 Flash | Dịch & phân tích câu hỏi trong question_bank | Admin |

**Chỉ có #1 và #2 liên quan đến Interview Round 2.** Còn lại là Milestones và Admin.

---

## 2. Luồng AI Interview Round 2 chi tiết

### Khi user hoàn thành 5 câu (ai_mock)

```
User trả lời 5 câu trong InterviewPracticeScreen
    → handleFinishPractice() 
    → Promise.all 5× POST /api/interview/evaluate (SONG SONG)
    → Hiển thị "⏳ AI đang chấm điểm..."
    → Nhận kết quả JSON → hiển thị điểm + nhận xét
```

### Mỗi request /api/interview/evaluate gửi:
```json
{
  "question_id": "uuid",
  "transcript": "네, 저는 베트남에서 왔습니다"  // STT từ mic
}
```

### Server xử lý:
1. Fetch `interview_questions` để lấy question_text + suggested_answers
2. Fetch `system_settings` (NHƯNG KHÔNG DÙNG)
3. Gọi Gemini 2.0 Flash với prompt ~600 từ
4. Parse JSON → trả về scores + feedback

---

## 3. Ước lượng Token

### 3.1. /api/interview/evaluate (chính)

| Thành phần | Tokens ước tính |
|---|---|
| System prompt (hướng dẫn chấm) | ~350 tokens |
| Question text + meaning + answers | ~100-250 tokens |
| Transcript (câu trả lời user) | ~10-50 tokens |
| **Tổng input** | **~460-650 tokens** |
| Output JSON (scores + feedback) | ~100-150 tokens |
| **Tổng 1 lần gọi** | **~560-800 tokens** |

**5 câu × ~700 tokens = ~3.500-4.000 tokens mỗi session**

### 3.2. /api/chat/evaluate (AI tutor)

| Thành phần | Tokens ước tính |
|---|---|
| System prompt (phân tích hội thoại) | ~200 tokens |
| Lịch sử chat (giả sử 10-20 lượt) | ~500-2.000 tokens |
| **Tổng input** | **~700-2.200 tokens** |
| Output JSON | ~100 tokens |
| **Tổng** | **~800-2.300 tokens mỗi session** |

### 3.3. Tổng mỗi phiên Interview Round 2

| Endpoint | Số lần gọi | Tokens/lần | Tổng tokens |
|---|---|---|---|
| /api/interview/evaluate | 5 | ~700 | ~3.500 |
| /api/chat/evaluate | 0-1 | ~1.500 | ~0-1.500 |
| **Tổng cộng** | **5-6 calls** | | **~3.500-5.000 tokens** |

---

## 4. Chi phí Gemini 2.0 Flash

**Gemini 2.0 Flash pricing (2025):**
- Input: $0.075 / 1M tokens
- Output: $0.30 / 1M tokens

| Hạng mục | Input | Output | Chi phí |
|---|---|---|---|
| 5 lần evaluate | ~3.000 tokens | ~600 tokens | ~$0.0004 |
| Chat evaluate (optional) | ~1.500 tokens | ~100 tokens | ~$0.0002 |
| **1 session** | **~4.500 tokens** | **~700 tokens** | **~$0.0006** |

→ **1.000 sessions = ~$0.60**
→ Chi phí KHÔNG ĐÁNG KỂ, rẻ hơn cốc cà phê.

**Vấn đề không phải token cost, mà là rate limit:**
- Gemini 2.0 Flash Free Tier: 10 RPM (requests per minute)
- Gemini 2.0 Flash Paid Tier: 2.000 RPM
- 5 request song song dễ bị 429 nếu dùng Free Tier → fallback mock chấm điểm ngẫu nhiên

---

## 5. Vấn đề phát hiện được

### 🔴 Nghiêm trọng

1. **5 parallel calls không có rate-limit check**
   - `Promise.all` bắn 5 request cùng lúc
   - Nếu rate-limit (429), fallback mock trả điểm random (lines 81-97 route.ts)
   - **User không biết điểm thật hay giả**

2. **Env vars không đồng bộ**
   - `@google/genai` SDK dùng `GOOGLE_GENERATIVE_AI_API_KEY`
   - Admin AI sync dùng `GEMINI_API_KEY`
   - Nếu trong `.env.local` chỉ có `GEMINI_API_KEY` → SDK routes silently dùng placeholder

3. **system_settings không được dùng**
   - Fetch `ai_global_prompt` + `industry_prompts` từ DB (lines 24-29)
   - Prompt vẫn hardcode inline (lines 36-67)
   - Phí 1 DB query vô ích mỗi lần evaluate

### 🟡 Trung bình

4. **Không lưu kết quả evaluate**
   - Kết quả chỉ ở React state + localStorage
   - Milestones và Chat evaluation có lưu DB
   - Không có analytics để cải thiện chất lượng

### 🟢 Nhẹ

5. **Mock fallback che giấu lỗi thật**
   - Khi Gemini fail, vẫn trả JSON 200 OK với điểm ngẫu nhiên
   - Developer không biết có vấn đề

---

## 6. So sánh với các module khác

| Module | AI Model | Batch? | Lưu DB? | Số call |
|---|---|---|---|---|
| **Interview Round 2** | Gemini 2.0 Flash | ❌ Song song | ❌ | 5/session |
| **Chat** | Gemini 2.0 Flash | ❌ | ✅ chat_evaluations | 1/session |
| **Milestones Test** | Gemini 2.0 Flash | ✅ Batch | ✅ milestone_results | 1/test |
| **Exam Analyzer** | Gemini 2.0 Flash Exp | N/A | ❌ (commented out) | 1/analysis |

---

## 7. Khuyến nghị

| Priority | Fix | Lợi ích |
|---|---|---|
| 🔴 | Dùng sequential hoặc batch thay parallel 5 calls | Tránh 429, đỡ tốn context window |
| 🔴 | Đồng bộ env vars (chỉ giữ `GOOGLE_GENERATIVE_AI_API_KEY`) | Đảm bảo không silent fail |
| 🟡 | Dùng `system_settings` đã fetch hoặc bỏ hẳn | Tiết kiệm 1 DB query/call |
| 🟡 | Lưu evaluation results vào DB | Có analytics, tracking progress |
