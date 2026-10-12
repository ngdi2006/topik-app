# Quy trình phát hành cụm học tập

Cụm học tập gồm E-Learning, Giáo trình 2025, Học từ vựng và Ngữ pháp.

Mặc định ứng dụng chạy ở trạng thái `development` và chặn toàn bộ route/API học viên của cụm này. Trang và API quản trị dưới `/admin` và `/api/admin` vẫn hoạt động theo phân quyền hiện có.

Chỉ đặt biến môi trường sau khi chủ dự án phê duyệt phát hành:

```env
NEXT_PUBLIC_LEARNING_CLUSTER_RELEASE_STATE=released
```

Trước khi phát hành, chạy:

```bash
npm run report:learning-cluster
npm run lint
npm run build
```

Báo cáo được tạo tại `reports/learning-cluster-readiness.md` và `.json`. Không push, deploy hoặc thay đổi biến môi trường Vercel nếu chưa có yêu cầu rõ ràng.
