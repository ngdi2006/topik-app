import {
  Calculator,
  Factory,
  Fish,
  Hammer,
  HardHat,
  Headphones,
  House,
  MessageSquare,
  Presentation,
  Sprout,
  Trees,
  UserRound,
  Wrench,
} from "lucide-react"

export type IndustryId =
  | "Sản xuất chế tạo"
  | "Ngư nghiệp"
  | "Nông nghiệp"
  | "Lâm nghiệp"
  | "Xây dựng"
  | "Dịch vụ"

export type TopicId =
  | "introduction"
  | "command"
  | "vocabulary"
  | "math"
  | "tools"
  | "communication"
  | "situation"
  | "safety"

export type LearningStatus =
  | "not-started"
  | "learning"
  | "needs-review"
  | "mastered"

export type ModuleView =
  | "overview"
  | "practice"
  | "exam"
  | "review"
  | "report"

export interface InterviewQuestionSummary {
  id: string
  category: string
  industry?: string | null
}

export interface TopicProgress {
  topicId: TopicId
  total: number
  attempted: number
  mastered: number
  incorrect: number
  accuracy: number | null
  status: LearningStatus
}

export const INDUSTRIES = [
  {
    id: "Sản xuất chế tạo",
    description: "Công xưởng, gia công và lắp ráp",
    icon: Factory,
  },
  {
    id: "Ngư nghiệp",
    description: "Đánh bắt và nuôi trồng thủy sản",
    icon: Fish,
  },
  {
    id: "Nông nghiệp",
    description: "Trồng trọt, chăn nuôi và thu hoạch",
    icon: Sprout,
  },
  {
    id: "Lâm nghiệp",
    description: "Trồng rừng, khai thác và an toàn lâm nghiệp",
    icon: Trees,
  },
  {
    id: "Xây dựng",
    description: "Công trình, mộc và cốt thép",
    icon: House,
  },
  {
    id: "Dịch vụ",
    description: "Nhà hàng, khách sạn và bán hàng",
    icon: Hammer,
  },
] as const satisfies ReadonlyArray<{
  id: IndustryId
  description: string
  icon: typeof Factory
}>

export const TOPICS = [
  {
    id: "introduction",
    code: "P1",
    name: "Giới thiệu bản thân",
    description: "Cá nhân hoá bài mẫu và luyện nói theo tốc độ phù hợp.",
    apiCategory: null,
    icon: UserRound,
    usesAI: false,
  },
  {
    id: "command",
    code: "P2",
    name: "Khẩu lệnh phản xạ",
    description: "Nghe khẩu lệnh và phản ứng chính xác.",
    apiCategory: "Khẩu lệnh",
    icon: Headphones,
    usesAI: false,
  },
  {
    id: "vocabulary",
    code: "P3",
    name: "Từ vựng và biển báo",
    description: "Ghi nhớ từ nghề nghiệp và biển báo an toàn.",
    apiCategory: null,
    icon: Presentation,
    usesAI: false,
  },
  {
    id: "math",
    code: "P4",
    name: "Toán học và tính toán",
    description: "Luyện số, đơn vị và tính toán trong công việc.",
    apiCategory: "Toán học",
    icon: Calculator,
    usesAI: true,
  },
  {
    id: "tools",
    code: "P5",
    name: "Sử dụng công cụ",
    description: "Nhận diện và mô phỏng thao tác với công cụ.",
    apiCategory: "Sử dụng công cụ",
    icon: Wrench,
    usesAI: false,
  },
  {
    id: "communication",
    code: "P6",
    name: "Kỹ năng giao tiếp",
    description: "Luyện trả lời phỏng vấn và giao tiếp tại nơi làm việc.",
    apiCategory: "Giao tiếp",
    icon: MessageSquare,
    usesAI: true,
  },
  {
    id: "situation",
    code: "P7",
    name: "Xử lý tình huống",
    description: "Phản ứng an toàn trong các tình huống thực tế.",
    apiCategory: "Xử lý tình huống",
    icon: Hammer,
    usesAI: true,
  },
  {
    id: "safety",
    code: "P8",
    name: "An toàn lao động",
    description: "Học quy tắc an toàn theo từng giai đoạn làm việc.",
    apiCategory: "An toàn lao động",
    icon: HardHat,
    usesAI: true,
  },
] as const satisfies ReadonlyArray<{
  id: TopicId
  code: `P${number}`
  name: string
  description: string
  apiCategory: string | null
  icon: typeof Headphones
  usesAI: boolean
}>

export const STATUS_LABEL: Record<LearningStatus, string> = {
  "not-started": "Chưa học",
  learning: "Đang học",
  "needs-review": "Cần ôn lại",
  mastered: "Đã thành thạo",
}

export const STATUS_ACTION: Record<LearningStatus, string> = {
  "not-started": "Bắt đầu học",
  learning: "Tiếp tục học",
  "needs-review": "Ôn lại",
  mastered: "Luyện lại",
}

const CATEGORY_TO_TOPIC = new Map<string, TopicId>(
  TOPICS.flatMap((topic) =>
    topic.apiCategory ? [[topic.apiCategory, topic.id] as const] : [],
  ),
)

export function topicIdForCategory(category: string): TopicId | null {
  return CATEGORY_TO_TOPIC.get(category) ?? null
}
