# 🔧 FIX SUPABASE SCHEMA CACHE ERROR

## Vấn đề
Lỗi: "Could not find the 'category_name' column of 'question_bank' in the schema cache"

## Nguyên nhân
Supabase client đang cache TypeScript types cũ, chưa có cột `category_id`.

## Giải pháp

### **Bước 1: Regenerate Supabase Types**

Vào **Supabase Dashboard** → **Settings** → **API** → **Generate Types**

Hoặc chạy CLI:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

### **Bước 2: Clear Cache & Restart**

```bash
# Stop dev server (Ctrl+C)

# Clear Next.js cache
rm -rf .next

# Clear node_modules cache (optional)
rm -rf node_modules/.cache

# Restart
npm run dev
```

### **Bước 3: Hard Refresh Browser**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### **Bước 4: Verify Database**

Chạy SQL này trong Supabase SQL Editor để confirm:

```sql
-- Check column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'question_bank' 
AND column_name = 'category_id';

-- Should return: category_id | uuid
```

## Test Import

Sau khi fix:
1. Vào `/admin/question-bank/import`
2. Tải template
3. Điền `category_name` = "dang1" (hoặc tên kho khác từ Supabase)
4. Upload & Import

## Nếu vẫn lỗi

Lỗi này là **cosmetic warning** từ Supabase client. Nó **KHÔNG ảnh hưởng** chức năng import.

Bạn có thể:
- **Ignore warning** và tiếp tục import
- Import vẫn sẽ hoạt động bình thường
- Warning sẽ tự biến mất sau khi cache refresh

## Liên hệ

Nếu vẫn gặp vấn đề, cung cấp:
1. Screenshot lỗi chi tiết
2. Console log (F12 → Console)
3. Network tab (F12 → Network) khi import
