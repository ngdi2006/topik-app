# 🚀 HƯỚNG DẪN CHẠY MIGRATION - Categories V2

## ⚠️ LỖI HIỆN TẠI

Nếu bạn thấy lỗi khi vào `/admin/categories`:
```
Parsing ecmascript source code failed
Expected '</>', got '<eof>'
```

**Nguyên nhân:** Chưa chạy SQL migration để thêm 2 cột mới vào database.

---

## ✅ GIẢI PHÁP - 3 BƯỚC ĐƠN GIẢN

### **Bước 1: Mở Supabase Dashboard**

1. Truy cập: https://supabase.com/dashboard
2. Chọn project của bạn
3. Click vào **SQL Editor** (icon ⚡ bên trái)

### **Bước 2: Copy & Paste SQL**

1. Click **"New Query"**
2. Copy toàn bộ nội dung file `setup_categories_v2.sql` (trong thư mục gốc)
3. Paste vào SQL Editor
4. Click **"Run"** (hoặc Ctrl+Enter)

**Hoặc copy trực tiếp:**

```sql
-- =====================================================================
-- TOPIK-IBT: Categories V2 - Sort Order & Shuffle Options
-- Migration: Thêm STT sắp xếp và toggle đảo đáp án
-- =====================================================================

-- 1. Thêm columns mới
ALTER TABLE question_categories 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT true;

-- 2. Index cho sort
CREATE INDEX IF NOT EXISTS idx_categories_sort 
ON question_categories(sort_order);

-- 3. Update existing records với sort_order tự động (theo thứ tự created_at)
WITH numbered_categories AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY created_at) as row_num
    FROM question_categories
    WHERE sort_order = 0
)
UPDATE question_categories
SET sort_order = numbered_categories.row_num
FROM numbered_categories
WHERE question_categories.id = numbered_categories.id;

-- 4. Comments
COMMENT ON COLUMN question_categories.sort_order IS 'STT sắp xếp hiển thị (0, 1, 2, ...)';
COMMENT ON COLUMN question_categories.shuffle_options IS 'Đảo đáp án khi làm bài (true = đảo, false = giữ nguyên)';

-- 5. Verify
SELECT 
    id, 
    name, 
    sort_order, 
    shuffle_options,
    question_count
FROM question_categories
ORDER BY sort_order;
```

### **Bước 3: Refresh trang**

1. Quay lại `http://localhost:3000/admin/categories`
2. Refresh (F5)
3. ✅ Xong! Giờ sẽ thấy:
   - STT (#1, #2, #3...) trên mỗi card
   - Toggle đảo đáp án
   - Nút Export PDF/Word

---

## 🎯 SAU KHI MIGRATION THÀNH CÔNG

Bạn sẽ có 3 tính năng mới:

### **1. Sắp xếp theo STT**
- Mỗi kho có số thứ tự (0, 1, 2, 3...)
- Kho có STT nhỏ hơn hiển thị trước
- Có thể sửa STT trong form Edit

### **2. Toggle Đảo Đáp Án**
- Nút toggle xanh/xám trên mỗi card
- **BẬT (xanh):** Đáp án A,B,C,D sẽ random khi học viên làm bài
- **TẮT (xám):** Giữ nguyên thứ tự đáp án

### **3. Xuất File PDF/Word**
- 2 nút "PDF" và "Word" trên mỗi card
- Click để download file đề thi đẹp
- Bao gồm: Câu hỏi + Hình ảnh + Đáp án

---

## 🔧 TROUBLESHOOTING

### Lỗi: "column sort_order does not exist"
→ Chưa chạy migration. Làm theo Bước 1-3 ở trên.

### Lỗi: "permission denied"
→ Đảm bảo bạn đang dùng account có quyền admin trên Supabase.

### Không thấy nút Export
→ Kho phải có ít nhất 1 câu hỏi mới xuất được.

---

## 📞 HỖ TRỢ

Nếu vẫn gặp lỗi, gửi screenshot console error (F12 → Console tab).
