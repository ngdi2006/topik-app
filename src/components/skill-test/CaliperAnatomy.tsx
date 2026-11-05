'use client'

import React, { useState } from 'react'
import {
  BookOpen,
  Volume2,
  Lightbulb,
} from 'lucide-react'

interface CaliperPart {
  id: string
  nameVi: string
  nameKo: string
  pronunciation: string
  description: string
  examTip: string
  badge: string
}

const CALIPER_PARTS: CaliperPart[] = [
  {
    id: 'outer-jaw',
    nameVi: 'Mỏ kẹp đo ngoài',
    nameKo: '외경 측정 턱 (바깥턱)',
    pronunciation: 'oe-gyeong cheuk-jeong teok',
    description: 'Dùng để đo kích thước đường kính ngoài của bu-lông, ống kim loại, độ dày tấm thép.',
    examTip: 'Luôn đưa vật vào sâu sát trong mỏ kẹp để tránh sai số do mỏ bị loe ở đầu nhọn.',
    badge: 'Đo ngoài',
  },
  {
    id: 'inner-jaw',
    nameVi: 'Mỏ kẹp đo trong',
    nameKo: '내경 측정 턱 (안쪽턱)',
    pronunciation: 'nae-gyeong cheuk-jeong teok',
    description: 'Gồm 2 mỏ nhọn hướng lên trên, đưa vào lòng ống hoặc rãnh để đo đường kính lỗ trong.',
    examTip: 'Đưa mỏ vuông góc với tâm ống, lắc nhẹ thước để tìm điểm tiếp xúc kích thước lớn nhất.',
    badge: 'Đo trong',
  },
  {
    id: 'lock-screw',
    nameVi: 'Vít hãm (Khóa thước)',
    nameKo: '잠금 나사',
    pronunciation: 'jam-geum na-sa',
    description: 'Vặn chặt để cố định vị trí mỏ trượt sau khi kẹp vật, giúp rút thước ra đọc mà không bị dịch chuyển.',
    examTip: 'Sau khi kẹp khít vật, siết nhẹ vít hãm rồi mới nhấc thước ra khỏi phôi để nhìn vạch.',
    badge: 'Cố định',
  },
  {
    id: 'main-scale',
    nameVi: 'Thân thước chính (Thang mm)',
    nameKo: '본척 (어미자)',
    pronunciation: 'bon-cheok (eo-mi-ja)',
    description: 'Khắc các vạch 1mm từ 0 đến 150mm. Đọc số nguyên milimet tại vạch nằm ngay bên trái vạch số 0 của du xích.',
    examTip: 'Cẩn thận vạch 0 của du xích chưa vượt qua vạch kế tiếp thì không được làm tròn lên!',
    badge: 'Thước chính',
  },
  {
    id: 'vernier-scale',
    nameVi: 'Thước phụ du xích',
    nameKo: '부척 (아들자)',
    pronunciation: 'bu-cheok (a-deul-ja)',
    description: 'Thanh trượt có 20 vạch chia (mỗi vạch = 0.05mm). Tìm vạch trùng thẳng hàng nhất với bất kỳ vạch nào trên thước chính.',
    examTip: 'Nhìn mắt vuông góc với mặt thước để tránh hiện tượng thị sai (Parallax error).',
    badge: 'Du xích',
  },
  {
    id: 'depth-blade',
    nameVi: 'Thanh đo độ sâu',
    nameKo: '깊이 측정 바',
    pronunciation: 'gip-i cheuk-jeong ba',
    description: 'Thanh dẹt mảnh thò ra ở đuôi thước khi mở mỏ trượt, dùng đo chiều sâu lỗ khoan hoặc đáy rãnh.',
    examTip: 'Áp mặt đuôi thước thật phẳng và vuông góc với miệng lỗ trước khi đẩy thanh đo xuống đáy.',
    badge: 'Đo sâu',
  },
]

export function CaliperAnatomy() {
  const [selectedPartId, setSelectedPartId] = useState<string>(CALIPER_PARTS[0].id)

  const selectedPart = CALIPER_PARTS.find((p) => p.id === selectedPartId) || CALIPER_PARTS[0]

  const playVoice = (text: string) => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'ko-KR'
        utterance.rate = 0.85
        window.speechSynthesis.speak(utterance)
      }
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
            <BookOpen className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Cấu Tạo Thước Kẹp Song Ngữ Hàn - Việt
            </h3>
            <p className="text-xs text-slate-500">
              Nắm vững tên gọi các bộ phận để hiểu ngay câu lệnh của giám khảo trong phòng thi tay nghề.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Anatomy Explorer */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Parts List Buttons */}
        <div className="md:col-span-5 space-y-2">
          {CALIPER_PARTS.map((part) => {
            const isSelected = part.id === selectedPartId
            return (
              <div
                key={part.id}
                className={`flex w-full items-center justify-between rounded-xl border transition ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/80 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedPartId(part.id)}
                  className="min-w-0 flex-1 rounded-lg p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <strong className="text-xs font-bold text-slate-900">
                      {part.nameVi}
                    </strong>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {part.badge}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-blue-700">
                    {part.nameKo}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => playVoice(part.nameKo)}
                  aria-label={`Nghe phát âm ${part.nameVi}`}
                  className="mr-2 grid size-10 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-blue-100/50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  title="Nghe phát âm"
                >
                  <Volume2 className="size-4" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Selected Part Detail Card */}
        <div className="md:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Chi tiết bộ phận
              </span>
              <h4 className="text-xl font-black text-slate-900 mt-0.5">
                {selectedPart.nameVi}
              </h4>
              <p className="text-sm font-bold text-blue-700 mt-1">
                {selectedPart.nameKo}{' '}
                <span className="text-xs text-slate-500 font-normal">
                  ({selectedPart.pronunciation})
                </span>
              </p>
            </div>

            <button
              onClick={() => playVoice(selectedPart.nameKo)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <Volume2 className="size-3.5" />
              <span>Phát âm</span>
            </button>
          </div>

          {/* Description */}
          <div className="space-y-1.5 text-xs text-slate-700">
            <strong className="text-slate-900 text-sm font-bold block">
              Chức năng công nghiệp:
            </strong>
            <p className="leading-relaxed">{selectedPart.description}</p>
          </div>

          {/* Exam Tip */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <Lightbulb className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-amber-950 mb-0.5">
                Bí quyết phòng thi EPS:
              </strong>
              <p className="leading-relaxed">{selectedPart.examTip}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

