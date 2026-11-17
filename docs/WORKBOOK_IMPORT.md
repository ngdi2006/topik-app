# Sách bài tập EPS-TOPIK 2025

Nguồn: `D:\SBT2026\SBT-Q1.pdf` (273 trang), `SBT-Q2.pdf` (270 trang).

Các sách dùng mã riêng `eps-topik-2025-workbook-1` và `eps-topik-2025-workbook-2`, không ghi đè giáo trình chính. PDF scan được chuyển sang WebP rộng 1440 px; chưa có OCR. Mục lục đã đối chiếu trực tiếp với tiêu đề trên bản scan: quyển 1 có ba phần mở đầu và bài 1–30, quyển 2 có bài 31–60. Mỗi mục có tên tiếng Hàn, tiếng Việt và liên kết đến trang bắt đầu. Ba phần mở đầu dùng `unit_number` -2, -1, 0 và được hiển thị là “Mở đầu”.

Chuẩn bị ảnh bằng Python có PyMuPDF và Pillow:

```powershell
python scripts/prepare_workbook_pdf.py D:\SBT2026
node scripts/import_workbooks.mjs
node scripts/import_workbooks.mjs --upload
```

Lệnh nhập đọc cấu hình Supabase từ `.env.local`, kiểm tra chuỗi trang, tải ảnh, kiểm tra đủ số trang rồi lưu bản nháp. Chạy lại sẽ bỏ qua trang trùng checksum; nếu PDF nguồn thay đổi, lệnh dừng để tránh thay sách ngoài ý muốn. Báo cáo nằm ở `reports/workbook-import.json`, gồm kết quả tải lại và đối chiếu checksum ảnh đầu/cuối.

Để cập nhật riêng mục lục cho sách đã nhập, chạy `node scripts/import_workbook_toc.mjs --upload`. Dữ liệu trang nằm trong `scripts/workbook-toc-data.mjs`; lệnh sao lưu mục lục cũ vào `tmp`, kiểm tra từng trang thuộc đúng một bài và xác minh lại dữ liệu sau khi lưu. Báo cáo kèm liên kết đến từng bài nằm ở `reports/workbook-toc.json`. Sách và bài giữ trạng thái nháp, chỉ admin có quyền giáo trình xem trước được.

Thư viện học viên chọn bìa tĩnh chỉ cho hai mã giáo trình chính; sách bài tập dùng ảnh trang đầu từ Storage. Thay đổi giao diện này cần triển khai cùng ứng dụng để áp dụng trên website đã phát hành.
