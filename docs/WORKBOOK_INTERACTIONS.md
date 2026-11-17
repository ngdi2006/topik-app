# Làm bài trên sách bài tập EPS-TOPIK 2025

Hai sách bài tập có lớp tương tác cho 543 trang: nhập đáp án, chọn một đáp án và nối hai cột bằng cách chạm nguồn rồi chạm đích. Trên điện thoại, ô điền mở bảng nhập chữ lớn để dùng bàn phím tiếng Hàn. Desktop cho phép gõ trực tiếp trên trang. Các vùng được nhận diện từ scan nên cần admin kiểm tra vị trí; không có đáp án chuẩn hoặc chấm điểm tự động.

## Lưu và tiếp tục học

- Định nghĩa vùng nằm trong `textbook_pages.ocr_payload.workbook`, tọa độ chuẩn hóa theo ảnh. Không thay ảnh/PDF gốc.
- Câu trả lời lưu ở `user_textbook_annotations`, loại `workbook_answer`, với ID cố định theo người dùng, sách, trang và vùng. Các annotation cũ không bị thay đổi. Không cần tạo bảng mới.
- Mỗi yêu cầu ghi xác thực tài khoản, quyền đọc sách và ID vùng/đáp án hợp lệ. `userId` trong yêu cầu phải khớp phiên đăng nhập, tránh ghi nhầm khi đổi tài khoản.
- Client tự lưu sau 600 ms, giữ hàng đợi riêng theo tài khoản trong localStorage, gửi lại khi có mạng hoặc thử lại. Bản sửa mới trong lúc đang lưu không bị xóa bởi phản hồi cũ. Lỗi lưu hiển thị rõ, không báo “Đã lưu” trước khi server xác nhận.
- Mục lục hiển thị số câu đã làm/tổng số; mỗi cặp nối là một câu. Đây là tiến trình thao tác, không phải điểm đúng/sai. Xóa đáp án sẽ giảm tiến trình.

## Âm thanh

Đã nhập đủ `B1.mp3`–`B60.mp3` từ `D:\DATA-E9\MP3-SBT-Q1\FULL` và `D:\DATA-E9\MP3-SBT-Q2\FULL`. Các file ở bucket `textbooks` riêng tư, gắn theo số bài. Trình phát ở phía trên sách tiếp tục tồn tại khi đóng bảng Tổng kết nhanh. Có tốc độ phát và lưu vị trí nghe theo tài khoản ở loại annotation `workbook_audio_progress`.

API âm thanh kiểm tra sách, bài và tài nguyên trước khi chuyển tới URL ký ngắn hạn; Storage hỗ trợ byte range để tua. Khi admin xuất bản một sách bài tập, API xuất bản đồng thời các tài nguyên âm thanh của sách. Hiện cả hai sách và âm thanh vẫn là bản nháp.

## Admin kiểm tra vùng

Vào `/admin/textbooks`, nhấn **Xem trước**. Mỗi trang có nút **Chỉnh vùng làm bài**: chọn vùng để kéo vị trí, kéo góc dưới để đổi kích thước, hoặc nhập phần trăm chính xác. Có thể thêm ô điền hoặc xóa câu bị nhận diện nhầm. **Lưu vùng** đánh dấu trang đã duyệt. Không thay ID vùng khi chỉ chỉnh tọa độ, nên giữ được câu trả lời đã lưu. Vùng đã được admin duyệt không bị công cụ nhận diện tự động ghi đè.

## Công cụ và xác minh

Vùng tương tác đã được căn lại từ ảnh gốc bằng dấu chấm và hình dạng vòng số đáp án (`alignment_version: 2`). Ô nhiều dòng ghép đúng các dòng trống; nút trắc nghiệm chỉ viền vòng số, không có kích thước tối thiểu làm phình khung; bài nối chỉ hiện điểm ở mép. Những lựa chọn từ trong ngoặc dùng gạch chân khi chọn. Các khung nhầm trên bảng ngữ cảnh/ngân hàng từ được giữ ID và đánh dấu `is_context`, không hiển thị hoặc tính tiến trình. Câu trả lời cũ vẫn nằm nguyên trong database.

Quy trình căn lại: `node scripts/sync_workbook_alignment.mjs` sao lưu bố cục hiện tại; `python scripts/align_workbook_regions.py` dùng Pillow, NumPy, SciPy để căn theo nét in; `python scripts/finalize_workbook_alignment.py` áp dụng các ngoại lệ đã đối chiếu ảnh; `node scripts/sync_workbook_alignment.mjs --apply` ghi tọa độ, kiểm tra phiên bản và giữ bản sửa admin phát sinh đồng thời. Chạy `node scripts/verify_workbook_alignment.mjs` để đối chiếu remote và `node scripts/test-workbook-alignment.cjs` để kiểm tra ID, khung đáp án, các trang 212–213. Công cụ nhận diện không ghi đè vùng có `alignment_version >= 2`. Báo cáo cuối nằm ở `reports/workbook-alignment-verification.json`.

```powershell
# Nhận diện toàn bộ trang; đọc GEMINI_API_KEY và Supabase từ .env.local.
node scripts/extract_workbook_interactions.mjs --volume 1 --from 1 --to 273 --upload
node scripts/extract_workbook_interactions.mjs --volume 2 --from 1 --to 270 --upload
node scripts/import_workbook_audio.mjs
node scripts/verify_workbook_readiness.mjs

# Kiểm thử không ghi câu trả lời vào Supabase.
node scripts/test-workbook-interactions.cjs
node scripts/test-workbook-api.cjs
node scripts/test-textbook-preview-access.cjs
# Cần playwright và esbuild trong tmp/workbook-validation, Chrome tại đường dẫn trong script.
node scripts/test-workbook-ui.mjs
```

Báo cáo: `reports/workbook-interactive-readiness.json` và `reports/workbook-audio-import.json`. Ảnh kiểm thử giao diện sử dụng API/tài khoản giả trong fixture, không chứa tiến trình người học thật. Dữ liệu vùng scan được cache trong `tmp/workbook-interactions`, không đưa hàng trăm MB ảnh hoặc công cụ kiểm thử tạm vào Git.

## Bố cục đọc và thao tác trên mobile/desktop

Nút nghe là biểu tượng loa tròn ngay bên trái tiêu đề nhóm trên ảnh scan (`WorkbookPageAudio`), không có hàng nút nghe riêng. Tọa độ tiêu đề được đo từ dấu ngoặc in trên ảnh và lưu trong `src/lib/textbooks/workbook-listening-anchors.json`; 253 tiêu đề có dấu ngoặc và 2 nhóm dùng dòng câu hỏi mở đầu. `measure_workbook_listening_titles.py` đo các mốc; `verify_workbook_listening_titles.py` đối chiếu chữ số đầu nhóm với mẫu ký tự in. Loa, ô đáp án và điểm nối cùng bám khung `data-page-canvas`; loa nằm trong lề trái, không phủ chữ tiêu đề. Đường kính co giãn từ 26 đến 40 px theo chiều rộng ảnh. Khi chọn nhóm, chỉ cuộn đủ để biểu tượng đang chọn nằm trong vùng nhìn thấy.

Thanh phát rút gọn và chuyển bài nằm trong footer có chiều cao riêng, không nổi đè lên trang. Thời gian hiển thị theo file nhóm đang nghe. Người dùng có thể phóng trang đến 200%, vuốt ngang và trở về 100%. Bộ theo dõi trang đang xem giữ danh sách các trang thực sự hiển thị, thay vì chọn trang chỉ vừa chạm mép viewport. Cuộn đến trang ban đầu đợi dữ liệu bài tập và nhóm nghe tải xong để tránh lệch khi các nút xuất hiện.

Theo yêu cầu người dùng, mục “Trả lời bằng chữ lớn” đã được gỡ. Người học chọn, nhập và nối trực tiếp trên ảnh; ô nhập trên mobile vẫn mở bảng bàn phím khi chạm đúng ô. Không thay ID câu hỏi hoặc dữ liệu đáp án đã lưu.

`node scripts/test-workbook-reader-layout.mjs` chạy reader thật với ảnh, định nghĩa bài tập và 255 file nhóm đã chuẩn bị, thông qua API/tài khoản giả trên localhost. Kiểm tra đủ 60 bài tại 320, 390, 768 và 1440 px: loa tròn đồng hàng tiêu đề và nằm trước mép chữ, lớp đáp án khớp khung ảnh, footer không giao vùng đọc, không tràn ngang toàn trang, phóng to/vuốt ngang, không còn danh sách chữ lớn, và tự lưu đáp án chọn/nhập/nối trực tiếp trên ảnh. Báo cáo là `reports/workbook-reader-layout-audit.json`; ảnh bài 1 là `reports/workbook-reader-title-speakers-b1-*.png`. Các kiểm tra này không sửa dữ liệu Supabase hoặc câu trả lời người học thật.
