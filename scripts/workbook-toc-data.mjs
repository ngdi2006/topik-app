// Start pages and Korean headings visually checked against both scanned PDFs.
const volume1 = [
  [-2, 1, "한글 익히기 I", "Làm quen với Hangeul I"],
  [-1, 5, "한글 익히기 II", "Làm quen với Hangeul II"],
  [0, 13, "인사", "Chào hỏi"],
  [1, 15, "자기소개", "Giới thiệu bản thân"],
  [2, 22, "생활용품", "Đồ dùng sinh hoạt"],
  [3, 30, "위치와 장소", "Vị trí và địa điểm"],
  [4, 37, "동작과 사물", "Hành động và đồ vật"],
  [5, 46, "날짜와 요일", "Ngày tháng và thứ"],
  [6, 54, "하루 일과", "Sinh hoạt hằng ngày"],
  [7, 63, "계절과 날씨", "Mùa và thời tiết"],
  [8, 72, "가족과 친구", "Gia đình và bạn bè"],
  [9, 80, "음식 주문", "Gọi món ăn"],
  [10, 90, "물건 구입", "Mua sắm"],
  [11, 99, "집안일", "Việc nhà"],
  [12, 108, "대중 교통", "Giao thông công cộng"],
  [13, 116, "주말 활동", "Hoạt động cuối tuần"],
  [14, 125, "길 찾기", "Tìm đường"],
  [15, 134, "옷차림", "Trang phục"],
  [16, 142, "집 구하기", "Tìm nhà"],
  [17, 150, "휴가", "Kỳ nghỉ"],
  [18, 159, "취미", "Sở thích"],
  [19, 168, "요리", "Nấu ăn"],
  [20, 175, "인터넷과 스마트폰", "Internet và điện thoại thông minh"],
  [21, 183, "병원", "Bệnh viện"],
  [22, 191, "약국", "Hiệu thuốc"],
  [23, 201, "우체국", "Bưu điện"],
  [24, 210, "은행", "Ngân hàng"],
  [25, 219, "외국인 근로자 지원기관", "Cơ quan hỗ trợ lao động nước ngoài"],
  [26, 228, "한국의 주거 문화와 음식", "Văn hóa nhà ở và ẩm thực Hàn Quốc"],
  [27, 237, "한국의 기념일", "Các ngày kỷ niệm ở Hàn Quốc"],
  [28, 246, "한국의 명절", "Các ngày lễ truyền thống Hàn Quốc"],
  [29, 254, "한국의 예절", "Phép lịch sự ở Hàn Quốc"],
  [30, 264, "한국의 대중문화", "Văn hóa đại chúng Hàn Quốc"],
]
const volume2 = [
  [31, 1, "복장과 근무 태도", "Trang phục và thái độ làm việc"],
  [32, 10, "회사 시설 이용", "Sử dụng cơ sở vật chất của công ty"],
  [33, 20, "동료와의 관계", "Quan hệ với đồng nghiệp"],
  [34, 30, "성희롱 및 성추행 예방", "Phòng tránh quấy rối và xâm hại tình dục"],
  [35, 39, "작업장 관리", "Quản lý nơi làm việc"],
  [36, 49, "출하 관리", "Quản lý xuất hàng"],
  [37, 58, "기계 가공", "Gia công cơ khí"],
  [38, 67, "기계 조립", "Lắp ráp máy móc"],
  [39, 76, "금속 가공", "Gia công kim loại"],
  [40, 84, "플라스틱 고무 성형", "Tạo hình nhựa và cao su"],
  [41, 92, "섬유 제조", "Sản xuất sợi"],
  [42, 100, "가구 제작", "Chế tạo đồ nội thất"],
  [43, 108, "건축 시공", "Thi công kiến trúc"],
  [44, 117, "토목 시공", "Thi công công trình dân dụng"],
  [45, 126, "농작물 재배", "Trồng trọt"],
  [46, 134, "사육 관리", "Quản lý chăn nuôi"],
  [47, 143, "연안 어업과 양식", "Đánh bắt ven bờ và nuôi trồng thủy sản"],
  [48, 152, "선체 건조", "Đóng thân tàu"],
  [49, 161, "광물 자원 개발 생산", "Khai thác và sản xuất tài nguyên khoáng sản"],
  [50, 169, "산림 자원 조성", "Phát triển tài nguyên rừng"],
  [51, 178, "숙박 서비스", "Dịch vụ lưu trú"],
  [52, 187, "음식 조리", "Chế biến món ăn"],
  [53, 197, "산업 안전 및 보건 표지", "Biển báo an toàn và sức khỏe lao động"],
  [54, 206, "산업 안전 및 보건 수칙", "Quy tắc an toàn và sức khỏe lao động"],
  [55, 215, "산업 안전 및 위생 장비", "Thiết bị an toàn và vệ sinh lao động"],
  [56, 225, "산업 재해 및 응급 처치", "Tai nạn lao động và sơ cứu"],
  [57, 234, "고용허가제", "Chế độ cấp phép việc làm"],
  [58, 243, "근로기준법", "Luật tiêu chuẩn lao động"],
  [59, 253, "출입국관리법", "Luật quản lý xuất nhập cảnh"],
  [60, 262, "근로자 보험", "Bảo hiểm cho người lao động"],
]

export function workbookUnits(volume, totalPages) {
  const source = volume === 1 ? volume1 : volume === 2 ? volume2 : null
  if (!source) throw new Error(`Unknown workbook volume: ${volume}`)
  const units = source.map(([number, start, ko, vi], index) => ({
    unit_number: number, start_page: start, end_page: source[index + 1]?.[1] - 1 || totalPages,
    title_ko: ko, title_vi: vi, sort_order: index, is_published: false,
    metadata: { mapping: "visually_verified_pdf_headers", kind: number <= 0 ? "introduction" : "lesson" },
  }))
  if (units[0].start_page !== 1 || units.at(-1).end_page !== totalPages ||
      units.some((unit, index) => unit.end_page < unit.start_page || (index && unit.start_page !== units[index - 1].end_page + 1))) {
    throw new Error(`Invalid workbook page coverage: ${volume}`)
  }
  return units
}
