// Lesson headings and PDF page numbers checked visually against the five source scans.
// These are separate reference books; they never modify the main course books.
import { workbookUnits } from './workbook-toc-data.mjs'

const vocabularyStarts = {
  1: [1, 3, 6, 8, 10, 12, 14, 16, 18, 20, 23, 24, 26, 27, 29, 30, 31, 34, 36, 39, 41, 43, 45, 46, 48, 49, 52, 54, 56, 57, 59],
  2: [1, 3, 5, 7, 9, 12, 15, 17, 19, 20, 22, 24, 26, 28, 30, 32, 34, 36, 39, 41, 43, 46, 48, 50, 52, 54, 56, 58, 60, 62],
}

const culture1 = [
  'Phép lịch sự chào hỏi của Hàn Quốc', 'Mẹo mua nhu yếu phẩm một cách tiết kiệm ở Hàn Quốc',
  'Thành phố của Hàn Quốc', 'Văn hóa ngồi của Hàn Quốc', 'Dương lịch và âm lịch', 'Một ngày của nhân viên văn phòng',
  'Thời tiết', 'Lời nói kính ngữ và lời nói ngang hàng/trống không', 'Bữa ăn của người Hàn Quốc', 'Cửa hàng không có người bán hàng',
  'Phân loại rác thải', 'Phương tiện giao thông công cộng của Hàn Quốc', 'Tôn giáo của người Hàn Quốc', 'Địa chỉ tên đường',
  'Trang phục truyền thống của Hàn Quốc', 'Hình thái cư trú của Hàn Quốc', 'Di sản văn hóa Hàn Quốc', 'Đời sống giải trí của người Hàn Quốc',
  'Món ăn vào ngày đặc biệt', 'Ứng dụng giao hàng', 'Hệ thống y tế của Hàn Quốc', 'Mua thuốc', 'Dịch vụ bưu điện của Hàn Quốc',
  'Ngân hàng Hàn Quốc', 'Trung tâm tư vấn nhân lực nước ngoài', 'Phép tắc ăn uống của Hàn Quốc', 'Ngày đặc biệt của Hàn Quốc',
  'Ngày lễ của Hàn Quốc', 'Phép xã giao trong sinh hoạt công cộng', 'Văn hóa Hallyu/Hàn lưu',
]
const culture2 = [
  [31, 1, 'Phép tắc ngôn ngữ ở nơi làm việc'], [32, 1, 'Quy tắc sử dụng cơ sở vật chất chung trong công ty'],
  [33, 2, 'Văn hóa tiệc công ty ở Hàn Quốc'], [34, 2, 'Quấy rối tình dục ở nơi làm việc'],
  [35, 3, 'Cấu trúc của kinh tế Hàn Quốc'], [36, 4, 'Đặc trưng của thương mại Hàn Quốc'],
  [37, 5, 'Thiết bị gia dụng của Hàn Quốc'], [38, 6, 'Ngành công nghiệp ô tô của Hàn Quốc'],
  [39, 6, 'Những điều cần chú ý khi sử dụng máy mài'], [40, 7, 'Năng lượng thân thiện với môi trường'],
  [41, 8, 'Ngành công nghiệp dệt may và thời trang của Hàn Quốc'], [42, 8, 'Nội thất âm tường'],
  [43, 9, 'Trang thiết bị hạng nặng ở công trường xây dựng'], [44, 10, 'Những công trình dân dụng quy mô lớn của Hàn Quốc'],
  [45, 11, 'Trang trại thông minh'], [46, 11, 'Lượng tiêu thụ thịt của Hàn Quốc'],
  [47, 12, 'Ngành nuôi trồng thủy sản ở Hàn Quốc'], [48, 12, 'Ngành đóng tàu của Hàn Quốc'],
  [49, 13, 'Phương tiện thoát hiểm'], [50, 13, 'Tài nguyên rừng của Hàn Quốc'],
  [51, 14, 'Điểm tham quan du lịch của Hàn Quốc'], [52, 15, 'Ngành công nghiệp thực phẩm của Hàn Quốc'],
  [53, 16, 'Biển báo cấm'], [54, 16, 'Biển báo hạn chế'], [55, 17, 'Biển báo chỉ dẫn (hành động bắt buộc)'],
  [56, 18, 'Biển báo tình huống khẩn cấp'], [57, 18, 'Chương trình cấp phép lao động'],
  [58, 19, 'Hợp đồng lao động chuẩn'], [59, 20, 'Đăng ký người nước ngoài'], [60, 21, 'Bảo hiểm liên quan đến người lao động nước ngoài'],
]
const grammar = [
  [1, 1, 5, 'Các từ đồng nghĩa'], [2, 6, 10, 'Các cặp từ trái nghĩa'],
  [3, 11, 11, 'Tiểu từ, trợ từ'], [4, 12, 15, 'Các dạng ngữ pháp khác và đuôi câu'],
  [5, 15, 18, 'Liên từ (từ nối)'], [6, 18, 19, 'Câu gián tiếp'], [7, 19, 19, 'Định ngữ'],
  [8, 20, 20, 'Bất quy tắc 으'], [9, 21, 21, 'Bất quy tắc ㄹ'], [10, 22, 23, 'Bất quy tắc ㅂ'],
  [11, 24, 24, 'Bất quy tắc ㄷ'], [12, 25, 25, 'Bất quy tắc 르'], [13, 26, 26, 'Bất quy tắc ㅅ'], [14, 27, 27, 'Bất quy tắc ㅎ'],
  [15, 28, 28, 'Phân biệt phát âm và patchim'], [16, 29, 29, 'Quy tắc nối âm và phụ âm bật hơi'],
  [17, 30, 31, 'Quy tắc lược bỏ âm ㅎ và căng âm'], [18, 31, 31, 'Quy tắc âm vòm và đồng hóa phụ âm'],
  [19, 32, 33, 'Quy tắc biến âm mũi'], [20, 33, 33, 'Sự biến âm của nguyên âm 의'],
]

export function referenceUnits(book) {
  let rows
  if (book.kind === 'vocabulary') {
    const expected = vocabularyStarts[book.volume]
    if (JSON.stringify(book.section_starts?.map(s => s.page)) !== JSON.stringify(expected)) throw new Error(`${book.code}: heading bands differ from reviewed index`)
    const titles = new Map(workbookUnits(book.volume, book.volume === 1 ? 273 : 270).map(u => [u.unit_number, u]))
    rows = expected.map((start, index) => {
      const number = index + (book.volume === 1 ? 0 : 31)
      const title = number === 0 ? { title_ko: '한글 익히기', title_vi: 'Làm quen với chữ Hàn' } : titles.get(number)
      const next = book.section_starts[index + 1]
      // A heading below the top margin shares its source page with the previous lesson.
      const end = next ? next.page - (next.y < 0.20 ? 1 : 0) : book.total_pages
      return [number, start, end, title.title_vi, title.title_ko]
    })
  } else if (book.kind === 'culture') {
    const source = book.volume === 1 ? culture1.map((title, index) => [index + 1, Math.floor(index / 2) + 1, title]) : culture2
    rows = source.map(([number, page, title]) => [number, page, number === 60 ? 22 : page, title, null])
  } else if (book.kind === 'grammar') rows = grammar.map(([number, start, end, title]) => [number, start, end, title, null])
  else throw new Error(`Unknown reference kind: ${book.kind}`)
  const units = rows.map(([number, start, end, vi, ko], index) => ({
    unit_number: number, start_page: start, end_page: end, title_vi: vi, title_ko: ko, sort_order: index, is_published: false,
    metadata: { mapping: 'visually_verified_source_pdf_headings', source_file: book.source_file, source_page_start: start, source_page_end: end, kind: book.kind === 'grammar' ? 'topic' : number === 0 ? 'introduction' : 'lesson' },
  }))
  if (units.some(u => u.start_page < 1 || u.end_page < u.start_page || u.end_page > book.total_pages)) throw new Error(`${book.code}: invalid page range`)
  const covered = new Set(units.flatMap(u => Array.from({ length: u.end_page - u.start_page + 1 }, (_, i) => i + u.start_page)))
  if (covered.size !== book.total_pages) throw new Error(`${book.code}: uncovered pages`)
  if (book.kind !== 'grammar' && units.filter(u => u.unit_number > 0).length !== 30) throw new Error(`${book.code}: expected 30 lessons`)
  return units
}
