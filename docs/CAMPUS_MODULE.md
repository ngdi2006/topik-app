# Module Trung tâm 3D — bản cơ bản

Đường dẫn học viên, giáo viên và quản trị viên: `/campus`. Menu **Trung tâm 3D** đã được thêm vào sidebar học viên trên máy tính và điện thoại.

## Phạm vi đã triển khai

### Mặt bằng tầng 3 theo sơ đồ cập nhật ngày 09/11/2026

- Sơ đồ có cửa mới nhất là nguồn chuẩn cho `src/lib/campus/floor3.ts`. Dựng cảnh tại `src/components/campus/floor3Scene.ts`; ảnh nguồn không có kích thước thực nên mô hình dùng tỷ lệ minh họa, không phải bản vẽ thi công.
- Khu A bên trái gồm P.101, P.103, P.104; P. Marketing/P. IT, P. GĐ Chuyên môn, P. Giám đốc, P. Phó giám đốc và P. Kho. P. Nghỉ nằm ở đầu hành lang C; P.109, P.108, P.107 xếp từ trên xuống ở bên phải.
- Giữ vị trí bục giảng: bên phải các phòng khu A, bên trái các phòng khu C; giữ hai hành lang, lễ tân A/C, hai bàn lễ tân và cửa chính được đánh dấu trong sơ đồ. Cửa kho thông sang phòng giám đốc, cửa Marketing/IT nằm trên ranh giới với P.101 theo nét vẽ được cung cấp; khi có xác nhận kiến trúc có thể sửa các đoạn này trong cấu hình.
- Sáu phòng học có nội thất 3D: bàn học mặt gỗ/chân kim loại, ghế xanh có tựa/chân ghế, sách vở, bảng xanh có khung/giá đỡ, bàn và ghế giáo viên trên bục. Hướng bàn ghế quay về đúng bục của từng khu. Bố trí chừa lối giữa, lối trước bảng và tránh cửa; số lượng bàn là minh họa theo diện tích mô phỏng, chưa phải sức chứa thật hoặc ghế đăng ký trong database. Các chi tiết lặp được gộp bằng InstancedMesh trong `floor3Furniture.ts`. Chọn phòng trong toàn cảnh sẽ chuyển camera sang góc xiên để quan sát nội thất.
- Toàn cảnh tầng 3 được mở mặc định, giữ hướng khu A trái/khu C phải như ảnh. Chọn **Tìm phòng tầng 3** để zoom đúng phòng và đánh dấu vị trí cửa; chọn **Di chuyển** để đi từ sảnh chính qua các lỗ cửa trong tường. Nhấn E ở cửa để xem tên phòng. Tường thấp và mái mở giúp quan sát mặt bằng.
- Các phòng trên sơ đồ chưa tự tạo lớp, đề thi hoặc quyền vào lớp trong database. Phần học/thi mẫu tiếp tục dùng bảng hoạt động hiện có; chưa gán cùng một lớp hoặc cùng một đề thi cho tất cả các phòng vật lý.
- Kiểm thử `node --test scripts/test-campus-floor3.mjs` dựng toàn bộ vật cản rồi tìm đường trên lưới từ điểm xuất hiện ở sảnh chính đến bên trong cả 12 phòng, gồm các phòng chức năng.

### Các chức năng nền

- Không gian 3D nhẹ bằng Three.js: mặt bằng tầng 3 theo sơ đồ; nội thất lớp A101 và phòng thi T201 vẫn là phòng mẫu cho chức năng học/thi.
- Sảnh được tạo riêng trong `src/components/campus/receptionScene.ts`, tham khảo ảnh lễ tân Korea Link: kính và dải xanh, logo chính thức có sẵn trong dự án, quầy tư vấn, ghế xanh chân kim loại, nền gạch, cây hoa và standee. Cờ và dây treo đã được bỏ theo yêu cầu. Bố cục vẫn được điều chỉnh cho việc đi lại trong game; chưa phải bản đo đạc kiến trúc. Không cần tải model 3D hoặc ảnh tạo mới; các hình khối và vật liệu được dùng chung để giảm tài nguyên.
- Nhân vật đi bằng WASD/phím mũi tên hoặc nút cảm ứng, kéo để xoay góc nhìn, E để tương tác. Có va chạm bàn/tường, tìm chỗ, ngồi và về sảnh. Có nút di chuyển nhanh hỗ trợ người không dùng bàn phím.
- Thanh góc nhìn: Di chuyển, Toàn cảnh, Chỗ ngồi, Bảng giảng/Bài thi. Hai mục cuối chỉ mở khi đã ngồi. Camera chuyển mượt đến vị trí quan sát; người bật giảm chuyển động trong hệ điều hành sẽ chuyển ngay. Đổi góc nhìn không tạo lại canvas 3D.
- Chế độ Bảng giảng/Bài thi zoom đến bảng hoặc máy được cấp, mở rộng nội dung chữ và ẩn đăng ký/cấu hình để tập trung. Bài học đang mở, đáp án quiz và kiểm tra chuẩn bị thi được giữ khi đổi góc nhìn. Nhấn Esc hoặc nút Rời chế độ tập trung để trở về góc nhìn chỗ ngồi; không đứng dậy và không trả ghế. Đề thi thật tiếp tục mở trên giao diện thi hiện có sau bước chuẩn bị.
- Mỗi phòng mặc định 30 chỗ; admin chỉnh từ 1–120. Tất cả lần đăng ký/đổi sức chứa/trả chỗ khóa cùng bản ghi phòng trong PostgreSQL để tránh trùng ghế. Khi có chỗ, nhận người chờ theo `queued_at,id`.
- Bản cơ bản tự xếp vào lớp mẫu khi còn chỗ; chưa có bước duyệt hồ sơ, thanh toán khóa học hay thời khóa biểu.
- Đăng ký và hàng đợi được lưu trong database. Chỗ được giữ đến khi người dùng chủ động trả chỗ; đóng trang không tự nhường chỗ. Số chỗ không phải số người online. Nhân vật ở các ghế khác biểu thị đăng ký, chưa đồng bộ vị trí di chuyển của người khác.
- Hai chế độ: tự học theo bài; lớp trực tiếp có giáo viên điều khiển bảng giảng. Trạng thái được lấy lại mỗi 4 giây khi trang đang hiển thị, không phải luồng vị trí thời gian thực.
- Một bài mẫu “Chào hỏi và giới thiệu”: nội dung đọc, thẻ từ vựng, ba câu quiz, tổng kết. Chấm quiz tại database; giữ điểm tốt nhất; cần đúng ít nhất 2/3 câu để lưu hoàn thành. Tiến độ mẫu nằm riêng, chưa nối với các bước e-learning đang khóa của hệ thống.
- Giáo viên được phân công hoặc admin có thể bắt đầu bài, chuyển mục và kết thúc buổi. Giáo viên không cần chiếm một ghế để điều khiển lớp. Phòng họp mic/camera dùng liên kết HTTPS bên ngoài; chưa nhúng dịch vụ video.
- Phòng thi: nhận số máy, ngồi, phát âm thanh kiểm tra, xác nhận sẵn sàng và chuyển tới `/exam/[id]/start`. Mở màn hình chuẩn bị không tự tạo lượt thi; quyền truy cập, tính giờ, lưu bài và trừ lượt tiếp tục thuộc hệ thống thi hiện tại. Chưa có ca thi đồng loạt hoặc thi trực tiếp trên texture màn hình 3D.

## Kích hoạt database

Áp dụng migration bằng quy trình Supabase hiện tại hoặc SQL Editor của đúng project:

`supabase/migrations/202611070001_campus_module.sql`

Sau đó áp dụng `supabase/migrations/202611070002_campus_exam_content.sql` để có nội dung phòng thi và quyền thiết lập dành cho giáo viên được phân công. Migration thứ hai bổ sung cột và RPC; giữ nguyên đăng ký, hàng đợi và tiến độ hiện có.

Migration tạo ba bảng mới (`campus_rooms`, `campus_memberships`, `campus_progress`), hai RPC (`campus_snapshot`, `campus_action`) và hai phòng mẫu. Không sửa dữ liệu bài học hoặc bài thi hiện có. Không chạy lại file đã được áp dụng; đây là migration một lần.

API `/api/campus` trả 503 kèm thông báo thiết lập khi RPC chưa có. Module cần Supabase được cấu hình như các chức năng hiện có. Migration chưa tự được áp dụng lên database từ xa trong phiên triển khai này.

## Hướng dẫn admin

1. Đăng nhập tài khoản có `profiles.role = 'admin'`, mở `/campus`.
2. Chọn phòng → **Cấu hình phòng**.
3. Đặt sức chứa. Không thể giảm xuống dưới số ghế cao nhất đang được cấp; cần học viên trả các chỗ đó trước. Tăng chỗ sẽ tự nhận hàng đợi.
4. Với lớp học: chọn **Tự học theo bài** hoặc **Giáo viên trực tiếp**; nhập UUID tài khoản giáo viên có role `teacher`/`admin`, và liên kết HTTPS phòng họp nếu cần.
5. Với phòng thi: admin có thể nhập UUID giáo viên phụ trách. Admin và giáo viên được phân công mở **Cấu hình phòng → Nội dung phòng thi** để nhập tiêu đề, mô tả, hướng dẫn nhiều dòng và tìm/chọn đề thi theo tên. Ví dụ tiêu đề: **Thi thử máy tính ngành sản xuất chế tạo 2026**. Tiêu đề cập nhật trên bảng 3D mà không tạo lại cảnh; mô tả/hướng dẫn hiện tại màn hình chuẩn bị và chế độ tập trung. API thi hiện tại tiếp tục kiểm tra đề đã xuất bản, phân quyền và lượt thi của học viên. Đề nội bộ vẫn cần phân cho thí sinh; chọn đề cho phòng không tự cấp quyền truy cập đề.
6. Lưu cấu hình. Giáo viên đã được phân công mở `/campus`, chọn lớp; khối điều khiển sẽ xuất hiện ngay cả khi chưa đăng ký ghế.

Học viên vào lớp trực tiếp sẽ chờ giáo viên bắt đầu; chỉ nộp quiz khi giáo viên mở mục Quiz. Khi buổi học đã kết thúc, không nhận đăng ký mới ở chế độ trực tiếp; giáo viên có thể bắt đầu lại bài mẫu. Bản đầu chưa có lịch sử nhiều buổi riêng biệt.

## Quyền truy cập và tính nhất quán

- Server page và API đều yêu cầu tài khoản Supabase. RPC tự kiểm tra `auth.uid()`; không dùng service-role để cấp chỗ.
- Bật RLS và thu hồi quyền đọc/ghi trực tiếp đối với ba bảng từ anon/authenticated. Chỉ RPC được phép thao tác; không cấp quyền sửa cấu hình cho học viên.
- Chỉ role admin được cấu hình. Chỉ admin hoặc role teacher đúng `teacher_id` được điều khiển buổi học. Kiểm tra quyền tồn tại cả trong database để chống gọi RPC trực tiếp.
- Mỗi người chỉ có một đăng ký mỗi phòng; chỉ một đăng ký được nhận mỗi ghế. Gọi join lặp không tạo thêm ghế và không thay thứ tự chờ.
- Snapshot trả đăng ký/điểm của chính người dùng; danh sách ghế có người chỉ có số ghế, không lộ tên hoặc tài khoản người khác.
- Trạng thái chuẩn bị thi và nhân vật là trải nghiệm giao diện, không thay thế kiểm tra quyền ở API thi.

## Kiểm thử

Không cần kết nối database thật để chạy kiểm thử migration:

```powershell
npm.cmd install --prefix tmp/campus-validation --no-save --no-package-lock @electric-sql/pglite
node --test scripts/test-campus-db.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Công cụ PostgreSQL chạy trong bộ nhớ, bên trong thư mục tạm đã được gitignore; không thêm dependency chạy production. Bộ kiểm thử xác nhận 30 chỗ, hàng đợi FIFO, join lặp, nhường chỗ, tăng/giảm sức chứa, chặn sửa quyền, chấm quiz và luồng giáo viên.

Đã chạy kiểm thử trình duyệt Chrome headless với một fixture tách biệt, dùng đúng CampusHub/CampusScene và database PGlite, mô phỏng HTTP `/api/campus`. Luồng kiểm tra: WebGL, đăng ký/vào lớp/ngồi, quiz/hoàn thành, vào phòng thi/âm thanh, giao diện 390px và tăng sức chứa. Đây là kiểm thử giao diện tích hợp database cục bộ; chưa xác nhận kết nối Supabase production hoặc tải thực 30 trình duyệt đồng thời.

## Điểm mở rộng khi có map thật

- Thay phần tạo cảnh trong `src/components/campus/CampusScene.tsx` bằng cấu hình map hoặc model GLB, giữ nguyên API đăng ký/hàng đợi. Chuẩn hóa bản đồ theo vị trí cửa, điểm xuất hiện, bảng, ghế và máy thi.
- Tách khóa học, lớp và buổi học khi triển khai nhiều bài/lịch học; nối ID bài học vào e-learning và dùng nội dung/điểm theo từng buổi.
- Thêm duyệt đăng ký, xếp lớp, điểm danh theo buổi và quyền quản lý hàng đợi theo nhu cầu vận hành.
- Thêm dịch vụ truyền thông cho mic/camera trong game; sau đó mới đo tải 30 người cùng học, chi phí và độ trễ.
- Thêm presence và đồng bộ di chuyển có giới hạn tần suất; không ghi tọa độ từng khung hình vào PostgreSQL.
- Thêm map địa điểm thi thực tế, phân ca, giám thị và thời điểm bắt đầu do máy chủ quyết định.
