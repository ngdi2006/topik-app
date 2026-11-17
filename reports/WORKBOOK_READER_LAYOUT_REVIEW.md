# Rà soát bố cục sách bài tập trên mobile và desktop

Đã kiểm tra 60 bài tại 320, 390, 768 và 1440 px. Biểu tượng loa tròn nằm ngay bên trái và đồng hàng với tiêu đề nhóm trên ảnh; không phủ chữ tiêu đề. Lớp đáp án giữ nguyên tọa độ ảnh, footer có vùng riêng và không tràn ngang toàn màn hình ở 100%.

Các thay đổi:

- Đã bỏ hàng nút nghe riêng. Loa tròn co giãn 26–40 px theo chiều rộng ảnh, nằm trong lề trái sát tiêu đề. Không có nhãn chữ bên cạnh; màu nền thể hiện nhóm đang nghe.
- Thanh phát và chuyển bài có vùng riêng ở đáy; phần đọc tự giảm chiều cao để mọi nội dung vẫn cuộn tới được.
- Thời gian nghe hiển thị theo nhóm hiện tại. Khi chọn nhóm, chỉ cuộn đủ để biểu tượng được chọn nhìn thấy được, không khóa cuộn lúc đang nghe.
- Sửa cách nhận biết trang đang xem và đợi dữ liệu nhóm nghe trước khi cuộn đến trang được mở.
- Phóng to đến 200%, vuốt ngang và nút trở về 100% hoạt động trên màn hình hẹp.
- Đã gỡ mục “Trả lời bằng chữ lớn”. Người học chọn, nhập và nối trực tiếp trên ảnh bằng các vùng tương tác hiện có.
- Các điều khiển phát, tua, tốc độ và lặp trong bảng âm thanh có vùng thao tác lớn và nhãn truy cập.

Kiểm tra xác minh:

- `scripts/measure_workbook_listening_titles.py` và `scripts/verify_workbook_listening_titles.py`: đo 253 tiêu đề có ngoặc, 2 dòng câu hỏi mở đầu không có tiêu đề riêng; đối chiếu đúng chữ số mở đầu cho đủ 255 nhóm.
- `scripts/test-workbook-reader-layout.mjs`: đủ 60 bài × 4 kích thước; loa tròn đồng hàng và nằm trước mép chữ; lưu thử đáp án chọn/nhập/nối trực tiếp trên ảnh qua API giả.
- `scripts/test-workbook-reader-layout.mjs --smoke`: tái hiện bài 28, bảng âm thanh ở 4 kích thước; kiểm tra vùng chạm, phóng to/vuốt ngang và đồng bộ đáp án.
- `scripts/test-workbook-group-player.mjs --batch`: cả 255 file nhóm phát/dừng và chuyển lại nghe cả bài.
- Kiểm tra schema/nhóm câu, quyền truy cập API, TypeScript và ESLint đều đạt.

Các kiểm tra trình duyệt dùng ảnh, âm thanh và thành phần thật trong fixture localhost; không ghi câu trả lời người học vào Supabase. Đợt chỉnh bố cục này không thay nội dung file âm thanh hoặc dữ liệu câu trả lời đã lưu.

Ảnh đối chiếu: `workbook-reader-title-speakers-b1-390.png`, `workbook-reader-title-speakers-b1-1440.png`, `workbook-reader-layout-390.png`, `workbook-reader-layout-1440.png`. Báo cáo máy đọc: `workbook-reader-layout-audit.json` và `workbook-listening-title-digit-check.json`.

## Waveform player verification (2026-11-16)

Footer and summary now use actual MP3 peaks for 60 full recordings and 255 groups. A red playhead marks the current position; played bars change color. The footer reserves layout space and uses two rows on narrow screens. Summary cards each include a seekable waveform. Keyboard arrows, click and drag are supported, with one shared audio element.

Browser interaction checks passed at 320/390/768/1440px: paused seeking stays paused, dragging reaches the requested offset, footer and summary progress agree, an inactive group starts at the chosen offset, and full playback restores the full waveform. Screenshots: `workbook-reader-waveform-footer-390.png` and `workbook-reader-audio-panel-1440.png`. All 255 actual group MP3s passed start/stop/full-track switching checks. API tests passed (7), together with TypeScript and ESLint.

Compact player update: the footer uses a single row at all viewport sizes, with a small transcript toggle. Group cards use a single-line instruction, waveform, duration and collapsed transcript. Selecting a group through its play button or title navigates to its workbook page; instant navigation avoids competing smooth-scroll and active-heading effects. Transcript content comes from the installed Korean segment text and remains selectable. Browser smoke coverage checks compact height, transcript contents, group navigation and existing waveform/answer interactions at 320/390/768/1440px.

Footer space update: audio and lesson navigation now share a single 44px row with a transparent background and no full-width border. The footer stays in document flow so workbook text cannot be covered by the controls. Transcript expands above the compact row only when requested. Browser checks assert the closed dock is at most 48px, its computed background is transparent, and existing seek/navigation/transcript interactions still pass at all four widths.

Header space update: moved zoom controls into the top reader header, removed the separate zoom hint bar and workbook instruction/save-status strip. Answer autosave remains active. The header stays on one row at mobile widths; existing image answer, waveform, zoom and navigation smoke checks cover 320/390/768/1440px.

Matching touch update: matching node buttons now cover their printed image/text and connector, while the visible dot stays anchored at its own position. Selecting the same source again cancels selection. Page 15 first-flag hit area includes the full Korean flag; page 85 sentence ports occupy a separate left column and image ports sit at picture-row centers. Existing node IDs and saved connections remain unchanged. Real-image browser checks cover content clicks for pages 15/85 at 390/1200px, saved mapping, separated port columns, shared-target stages and reload persistence. Reader smoke checks passed at four widths; matching model tests, TypeScript and ESLint passed.

Multiple-choice prompt blanks: `workbookAnswerFields` excludes duplicate text inputs sharing the section and question number/label of a four-option numbered choice. The normalization is shared by API parsing, client page/progress state and the image overlay, so these blanks do not count as extra unanswered questions. Original definitions and stored annotations are retained. Full two-volume audit: 543 pages, 19 duplicate blanks excluded, 1270 choice fields and 2418 text fields retained. `scripts/test-workbook-choice-blanks.cjs` writes `reports/workbook-choice-blank-audit.json`; real-image browser checks verify page 95 has four clickable answers and no prompt input at 390/1200px. API tests (5), reader smoke at four widths, TypeScript and ESLint passed.

Picture multiple-choice answers: `scripts/measure_workbook_picture_choices.py` measures separate hit rectangles above the original circled numbers and writes `src/lib/textbooks/workbook-picture-choices.json`, keyed by image checksum and stable field/option IDs. The overlay uses those bounds for 336 pictures in 84 questions while leaving the original number marker and answer IDs unchanged. Contact sheets were reviewed to exclude shared passage/map illustrations. Clicking either picture or number selects the same answer. Browser checks click every picture at 390px, plus both fruit question rows on desktop; existing reader checks cover four widths. Number-only audio-answer rows and non-picture options keep their previous behavior.

Per-section submission workflow: each unit now has separate vocabulary, grammar, writing, reading and listening tabs. Only reading/listening choice fields use automatic grading; other fields submit a snapshot to a chosen authorized teacher. Successful storage creates a teacher-owned `workbook_submission` annotation; failed storage does not claim delivery. Learners cannot modify the teacher-owned copy through existing owner RLS. Scoped server-derived IDs isolate submissions from normal answer/audio IDs and make retries idempotent. Teachers review at `/admin/textbooks/submissions`, linked from the textbook admin page, and learners see saved feedback when reopening the part. Browser fixtures passed the full learner submit → teacher score/feedback → learner reopen cycle at 320/390/768/1440px, as well as independent reading/listening scores. API tests cover recipient isolation, failed storage, duplicate submissions, score bounds and manual categories excluded from auto-grading. No real learner submissions or answer keys were created during tests. Automatic grading still requires verified keys.

Workbook account permissions: admin full access; teacher automatic textbook access and layout/grading tools with standard answer changes forbidden; learners need admin activation. Admin users now have table/detail activation controls backed by protected Auth metadata. Learner transcript controls/payloads and bottom audio player are absent; lesson navigation is centered and group audio still plays. Role/API/activation tests, admin control UI, locked library cards and reader UI at four widths passed. Two workbooks and 60 audio resources were switched to private activation mode and verified without changing contents or learner answers. Main course books remain public to signed-in learners. Current policy: `docs/WORKBOOK_ACCOUNT_PERMISSIONS.md`.

Timed workbook activation: replaced the one-click indefinite toggle with a management dialog for fixed days, extension, exact expiry date and revocation. Admin user details show expiry and active/expired/revoked status. Protected Auth metadata now includes `workbook_access_expires_at`; learner access requires a future valid expiry and enabled flag on every authorized request. Existing legacy flags without expiry require explicit admin duration entry. Admin/teacher role access is unchanged. API, expiry-boundary/extension/timezone tests and desktop/mobile management UI checks passed, along with TypeScript and ESLint. No real account durations were assigned during verification.
