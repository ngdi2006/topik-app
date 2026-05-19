import { Lesson } from '@/types/lesson'

export const LESSONS: Lesson[] = [
  {
    id: 'lesson-01',
    chapter: 1,
    lessonNumber: 1,
    titleKorean: '자기소개',
    titleVietnamese: 'Tự giới thiệu',
    description: 'Học cách giới thiệu bản thân, quốc tịch và nghề nghiệp',
    vocabulary: [
      {
        word: '이름',
        romanization: 'ireum',
        meaning: 'tên',
        example: '제 이름은 민수입니다.',
        exampleMeaning: 'Tên tôi là Minsu.'
      },
      {
        word: '나라',
        romanization: 'nara',
        meaning: 'quốc gia',
        example: '저는 베트남 나라에서 왔습니다.',
        exampleMeaning: 'Tôi đến từ Việt Nam.'
      },
      {
        word: '회사',
        romanization: 'hoesa',
        meaning: 'công ty',
        example: '저는 회사에서 일합니다.',
        exampleMeaning: 'Tôi làm việc ở công ty.'
      },
      {
        word: '학생',
        romanization: 'haksaeng',
        meaning: 'học sinh, sinh viên',
        example: '저는 학생입니다.',
        exampleMeaning: 'Tôi là sinh viên.'
      },
      {
        word: '선생님',
        romanization: 'seonsaengnim',
        meaning: 'giáo viên',
        example: '김 선생님은 한국어를 가르칩니다.',
        exampleMeaning: 'Thầy Kim dạy tiếng Hàn.'
      },
      {
        word: '친구',
        romanization: 'chingu',
        meaning: 'bạn bè',
        example: '이 사람은 제 친구입니다.',
        exampleMeaning: 'Người này là bạn tôi.'
      }
    ],
    grammar: [
      {
        pattern: 'N은/는',
        explanation: 'Trợ từ chủ đề, dùng để giới thiệu chủ đề của câu',
        usage: 'Dùng 은 sau phụ âm, 는 sau nguyên âm',
        examples: [
          { korean: '저는 학생입니다.', vietnamese: 'Tôi là sinh viên.' },
          { korean: '이름은 민수입니다.', vietnamese: 'Tên là Minsu.' }
        ]
      },
      {
        pattern: 'N입니다/입니까?',
        explanation: 'Vị ngữ danh từ lịch sự (khẳng định/nghi vấn)',
        usage: 'Dùng trong văn nói trang trọng, lịch sự',
        examples: [
          { korean: '저는 베트남 사람입니다.', vietnamese: 'Tôi là người Việt Nam.' },
          { korean: '학생입니까?', vietnamese: 'Bạn là sinh viên à?' }
        ]
      }
    ],
    conversations: [
      {
        title: 'Gặp gỡ lần đầu',
        context: 'Hai người gặp nhau lần đầu tại công ty',
        lines: [
          {
            speaker: '민수',
            korean: '안녕하세요? 저는 민수입니다.',
            vietnamese: 'Xin chào. Tôi là Minsu.'
          },
          {
            speaker: '투안',
            korean: '안녕하세요? 저는 투안입니다. 베트남 사람입니다.',
            vietnamese: 'Xin chào. Tôi là Tuấn. Tôi là người Việt Nam.'
          },
          {
            speaker: '민수',
            korean: '반갑습니다. 회사원입니까?',
            vietnamese: 'Rất vui được gặp bạn. Bạn là nhân viên công ty à?'
          },
          {
            speaker: '투안',
            korean: '네, 회사원입니다.',
            vietnamese: 'Vâng, tôi là nhân viên công ty.'
          }
        ]
      }
    ],
    culture: [
      {
        title: 'Văn hóa chào hỏi Hàn Quốc',
        content: 'Người Hàn Quốc rất coi trọng việc chào hỏi. Khi gặp lần đầu, họ thường cúi đầu nhẹ và nói "안녕하세요?" (Xin chào). Trong môi trường công việc, việc sử dụng ngôn ngữ trang trọng là rất quan trọng.'
      }
    ]
  },
  {
    id: 'lesson-02',
    chapter: 1,
    lessonNumber: 2,
    titleKorean: '일상생활',
    titleVietnamese: 'Sinh hoạt hàng ngày',
    description: 'Học từ vựng và cách diễn đạt về sinh hoạt hàng ngày',
    vocabulary: [
      {
        word: '아침',
        romanization: 'achim',
        meaning: 'buổi sáng',
        example: '아침에 운동합니다.',
        exampleMeaning: 'Tôi tập thể dục vào buổi sáng.'
      },
      {
        word: '점심',
        romanization: 'jeomsim',
        meaning: 'bữa trưa',
        example: '점심을 먹습니다.',
        exampleMeaning: 'Tôi ăn trưa.'
      },
      {
        word: '저녁',
        romanization: 'jeonyeok',
        meaning: 'bữa tối, buổi tối',
        example: '저녁에 친구를 만납니다.',
        exampleMeaning: 'Tôi gặp bạn vào buổi tối.'
      },
      {
        word: '일하다',
        romanization: 'ilhada',
        meaning: 'làm việc',
        example: '회사에서 일합니다.',
        exampleMeaning: 'Tôi làm việc ở công ty.'
      },
      {
        word: '쉬다',
        romanization: 'swida',
        meaning: 'nghỉ ngơi',
        example: '주말에 집에서 쉽니다.',
        exampleMeaning: 'Tôi nghỉ ngơi ở nhà vào cuối tuần.'
      },
      {
        word: '공부하다',
        romanization: 'gongbuhada',
        meaning: 'học tập',
        example: '도서관에서 한국어를 공부합니다.',
        exampleMeaning: 'Tôi học tiếng Hàn ở thư viện.'
      }
    ],
    grammar: [
      {
        pattern: 'V-습니다/ㅂ니다',
        explanation: 'Vị ngữ động từ lịch sự (thể trang trọng)',
        usage: 'Dùng 습니다 sau phụ âm, ㅂ니다 sau nguyên âm',
        examples: [
          { korean: '저는 회사에서 일합니다.', vietnamese: 'Tôi làm việc ở công ty.' },
          { korean: '한국어를 공부합니다.', vietnamese: 'Tôi học tiếng Hàn.' }
        ]
      },
      {
        pattern: 'N에서',
        explanation: 'Trợ từ chỉ địa điểm diễn ra hành động',
        usage: 'Dùng sau danh từ chỉ địa điểm',
        examples: [
          { korean: '회사에서 일합니다.', vietnamese: 'Làm việc ở công ty.' },
          { korean: '식당에서 밥을 먹습니다.', vietnamese: 'Ăn cơm ở nhà hàng.' }
        ]
      }
    ],
    conversations: [
      {
        title: 'Nói về lịch trình hàng ngày',
        context: 'Hai đồng nghiệp nói chuyện về công việc',
        lines: [
          {
            speaker: '투안',
            korean: '민수 씨, 매일 몇 시에 일어납니까?',
            vietnamese: 'Anh Minsu, hàng ngày anh dậy lúc mấy giờ?'
          },
          {
            speaker: '민수',
            korean: '저는 아침 6시에 일어납니다. 투안 씨는요?',
            vietnamese: 'Tôi dậy lúc 6 giờ sáng. Còn anh Tuấn?'
          },
          {
            speaker: '투안',
            korean: '저는 7시에 일어납니다. 그리고 8시에 회사에 갑니다.',
            vietnamese: 'Tôi dậy lúc 7 giờ. Và đi công ty lúc 8 giờ.'
          },
          {
            speaker: '민수',
            korean: '점심은 어디에서 먹습니까?',
            vietnamese: 'Anh ăn trưa ở đâu?'
          },
          {
            speaker: '투안',
            korean: '회사 식당에서 먹습니다.',
            vietnamese: 'Tôi ăn ở căng tin công ty.'
          }
        ]
      }
    ],
    culture: [
      {
        title: 'Giờ làm việc tại Hàn Quốc',
        content: 'Giờ làm việc tiêu chuẩn tại Hàn Quốc thường là từ 9 giờ sáng đến 6 giờ chiều. Nhiều công ty có căng tin nội bộ phục vụ bữa trưa cho nhân viên. Văn hóa làm việc chăm chỉ và trách nhiệm cao được đánh giá cao.'
      }
    ]
  },
  {
    id: 'lesson-03',
    chapter: 1,
    lessonNumber: 3,
    titleKorean: '쇼핑',
    titleVietnamese: 'Mua sắm',
    description: 'Học cách hỏi giá, mua hàng và thanh toán',
    vocabulary: [
      {
        word: '가게',
        romanization: 'gage',
        meaning: 'cửa hàng',
        example: '이 가게에서 옷을 삽니다.',
        exampleMeaning: 'Tôi mua quần áo ở cửa hàng này.'
      },
      {
        word: '돈',
        romanization: 'don',
        meaning: 'tiền',
        example: '돈이 얼마 있습니까?',
        exampleMeaning: 'Bạn có bao nhiêu tiền?'
      },
      {
        word: '사다',
        romanization: 'sada',
        meaning: 'mua',
        example: '과일을 삽니다.',
        exampleMeaning: 'Tôi mua trái cây.'
      },
      {
        word: '팔다',
        romanization: 'palda',
        meaning: 'bán',
        example: '이 가게는 신발을 팝니다.',
        exampleMeaning: 'Cửa hàng này bán giày.'
      },
      {
        word: '비싸다',
        romanization: 'bissada',
        meaning: 'đắt',
        example: '이 옷은 너무 비쌉니다.',
        exampleMeaning: 'Quần áo này quá đắt.'
      },
      {
        word: '싸다',
        romanization: 'ssada',
        meaning: 'rẻ',
        example: '이 가방은 쌉니다.',
        exampleMeaning: 'Cái túi này rẻ.'
      },
      {
        word: '얼마',
        romanization: 'eolma',
        meaning: 'bao nhiêu (tiền)',
        example: '이것은 얼마입니까?',
        exampleMeaning: 'Cái này bao nhiêu tiền?'
      }
    ],
    grammar: [
      {
        pattern: 'N을/를',
        explanation: 'Trợ từ tân ngữ',
        usage: 'Dùng 을 sau phụ âm, 를 sau nguyên âm',
        examples: [
          { korean: '빵을 삽니다.', vietnamese: 'Mua bánh mì.' },
          { korean: '물을 마십니다.', vietnamese: 'Uống nước.' }
        ]
      },
      {
        pattern: 'A-습니다/ㅂ니다',
        explanation: 'Vị ngữ tính từ lịch sự',
        usage: 'Dùng để diễn tả tính chất, trạng thái',
        examples: [
          { korean: '이 옷은 예쁩니다.', vietnamese: 'Quần áo này đẹp.' },
          { korean: '날씨가 좋습니다.', vietnamese: 'Thời tiết tốt.' }
        ]
      }
    ],
    conversations: [
      {
        title: 'Mua đồ ở cửa hàng',
        context: 'Khách hàng mua quần áo tại cửa hàng',
        lines: [
          {
            speaker: '손님',
            korean: '이 티셔츠는 얼마입니까?',
            vietnamese: 'Áo phông này bao nhiêu tiền?'
          },
          {
            speaker: '점원',
            korean: '2만 원입니다.',
            vietnamese: '20,000 won ạ.'
          },
          {
            speaker: '손님',
            korean: '좀 비쌉니다. 더 싼 것 있습니까?',
            vietnamese: 'Hơi đắt. Có cái nào rẻ hơn không?'
          },
          {
            speaker: '점원',
            korean: '네, 이것은 1만 5천 원입니다.',
            vietnamese: 'Vâng, cái này 15,000 won ạ.'
          },
          {
            speaker: '손님',
            korean: '좋습니다. 이것으로 주세요.',
            vietnamese: 'Được. Cho tôi cái này.'
          }
        ]
      }
    ],
    culture: [
      {
        title: 'Văn hóa mua sắm tại Hàn Quốc',
        content: 'Tại Hàn Quốc, bạn có thể mua sắm ở siêu thị, cửa hàng tiện lợi (편의점), chợ truyền thống (시장), hoặc trung tâm thương mại. Giá cả thường cố định ở siêu thị và cửa hàng, nhưng có thể thương lượng ở chợ truyền thống. Thẻ tín dụng được chấp nhận rộng rãi.'
      }
    ]
  }
]
