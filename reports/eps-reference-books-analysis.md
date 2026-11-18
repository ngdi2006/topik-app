# Năm sách tham khảo EPS 2025 độc lập

Nguồn: thư mục `D:/DATA-E9/TV-2025`, bản quét của Trung tâm Ngoại ngữ Korea Link.

| Đầu sách | PDF nguồn | Trang | Mục lục |
| --- | --- | ---: | --- |
| Từ vựng · Quyển 1 | TV-Q1.pdf | 60 | Làm quen chữ Hàn + bài 1–30 |
| Từ vựng · Quyển 2 | TV-Q2.pdf | 63 | Bài 31–60 |
| Ngữ pháp tổng hợp | TH-NGUPHAP.pdf | 33 | 20 chủ đề |
| Thông tin văn hóa · Quyển 1 | TTVH-Q1.pdf | 15 | Bài 1–30 |
| Thông tin văn hóa · Quyển 2 | TTTV-Q2.pdf | 22 | Bài 31–60 |

Tổng: 193 trang, 141 mục (120 bài, 1 phần nhập môn và 20 chủ đề).

Mỗi tài liệu là một sách riêng trong thư viện `/textbooks`, dùng trình đọc hiện có, ảnh bìa `Bia-TV.jpg` và ảnh trang gốc tối ưu WebP rộng 1440 px. Nội dung không được chèn vào giáo trình chính hoặc module Giáo trình EPS đang biên tập. Không tạo từ vựng, bản dịch hay giải thích mới bằng AI.

Mục lục được đối chiếu trực quan với tiêu đề trong PDF. Một số bài dùng chung trang nguồn nên phạm vi trang có thể trùng nhau; mỗi mục vẫn có số bài và tiêu đề riêng. Ngữ pháp tổng hợp chứa cả từ đồng nghĩa, trái nghĩa, trợ từ, đuôi câu, liên từ, câu gián tiếp, định ngữ, bất quy tắc và phát âm; chia theo chủ đề thay vì tự gán vào các bài 1–60.

Import chỉ tạo các mã `eps-topik-2025-vocabulary-1/2`, `eps-topik-2025-culture-1/2`, `eps-topik-2025-grammar-1`. Dữ liệu bốn sách hiện tại và bảng `eps_curriculum_*` được giữ nguyên. Sách tham khảo được tách khỏi danh sách bài học dùng để luyện từ vựng/ngữ pháp và tính tiến độ bài chính.

Kiểm tra: đối chiếu SHA-256 của PDF nguồn, kiểm tra đủ/trình tự trang và phạm vi mục lục; so checksum của toàn bộ ảnh với dữ liệu lưu; tải đối chiếu ảnh đầu/giữa/cuối từ Storage. Kiểm tra giao diện thực với 9 sách ở 320, 390, 768, 1440 px; bộ lọc sáu loại; trình đọc cả năm sách, chọn mục đầu/cuối, phóng to và mục lục điện thoại. Sách tham khảo không gọi API tóm tắt, lớp OCR hay làm bài tập.

Lệnh chuẩn bị: `python scripts/prepare_eps_reference_books.py`.

Kiểm tra trước nhập: `node scripts/import_eps_reference_books.mjs`.

Nhập nháp: `node --env-file=.env.local scripts/import_eps_reference_books.mjs --upload`.

Phát hành sau khi giao diện đã triển khai thành công: `node --env-file=.env.local scripts/import_eps_reference_books.mjs --upload --publish`.

Kiểm tra giao diện: `node scripts/test-eps-reference-books.mjs`.

Ảnh kiểm tra: `output/playwright/eps-reference-books/`. Kết quả import: `reports/eps-reference-books-import.json`.
