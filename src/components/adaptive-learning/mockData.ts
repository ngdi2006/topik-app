import { QuestionBankType, ExamResultType } from './types';

export const QuestionBank: QuestionBankType = {
  "dang_01": {
    name: "Tìm từ đồng nghĩa / Trích xuất biểu đồ",
    vocab_list: [
      { id: "v1_1", word: "증가하다", meaning: "Tăng lên", explanation: "Từ này thường dùng để chỉ số lượng, quy mô, mức độ... ngày càng nhiều hơn. Ngược nghĩa là '감소하다'.", example: "최근 스마트폰 사용자가 크게 증가하고 있습니다.", fillInBlankQuestion: "최근 스마트폰 사용자가 크게 (   )고 있습니다.", fillInBlankAnswer: "증가하" },
      { id: "v1_2", word: "감소하다", meaning: "Giảm xuống", explanation: "Dùng khi số lượng hoặc tỷ lệ bị thu hẹp, ít đi. Ngược nghĩa là '증가하다'.", example: "출산율이 해마다 감소하고 있어 큰 문제입니다.", fillInBlankQuestion: "출산율이 해마다 (   )고 있어 큰 문제입니다.", fillInBlankAnswer: "감소하" },
      { id: "v1_3", word: "유지하다", meaning: "Duy trì", explanation: "Giữ nguyên một trạng thái, mức độ nào đó mà không để nó thay đổi.", example: "건강을 유지하기 위해 매일 운동을 합니다.", fillInBlankQuestion: "건강을 (   )기 위해 매일 운동을 합니다.", fillInBlankAnswer: "유지하" },
      { id: "v1_4", word: "발생하다", meaning: "Phát sinh, xảy ra", explanation: "Dùng khi một sự việc, tai nạn, hay vấn đề nào đó bắt đầu xảy ra.", example: "어제 고속도로에서 큰 교통사고가 발생했습니다.", fillInBlankQuestion: "어제 고속도로에서 큰 교통사고가 (   )했습니다.", fillInBlankAnswer: "발생" },
      { id: "v1_5", word: "해결하다", meaning: "Giải quyết", explanation: "Tìm ra lối thoát, xử lý xong một vấn đề, khó khăn.", example: "우리 팀은 그 어려운 문제를 마침내 해결했습니다.", fillInBlankQuestion: "우리 팀은 그 어려운 문제를 마침내 (   )했습니다.", fillInBlankAnswer: "해결" }
    ],
    grammar_list: [
      { id: "g1_1", structures: "-기 시작하다", usage: "Bắt đầu làm gì...", explanation: "Cấu trúc này gắn vào sau thân động từ để thể hiện sự bắt đầu của một hành động hay trạng thái nào đó.", example: "오후부터 비가 오기 시작했어요.", fillInBlankQuestion: "오후부터 비가 (   ) 시작했어요.", fillInBlankAnswer: "오기" },
      { id: "g1_2", structures: "-(으)ㄴ/는 반면(에)", usage: "Trái lại, mặt khác...", explanation: "Sử dụng khi so sánh hai vế có nội dung trái ngược nhau.", example: "이 식당은 음식 값이 비싼 반면에 맛은 아주 좋아요.", fillInBlankQuestion: "이 식당은 음식 값이 비싼 (   ) 맛은 아주 좋아요.", fillInBlankAnswer: "반면에" }
    ],
    questions: [
      { id: "q_101", content: "다음 밑줄 친 부분과 의미가 가장 비슷한 것을 고르십시오.\n\n수출이 작년에 비해 크게 **증가했다**.", options: ["늘어났다", "줄어들었다", "변함없다", "시작했다"], answer: "늘어났다" },
      { id: "q_102", content: "다음 밑줄 친 부분과 의미가 가장 비슷한 것을 고르십시오.\n\n인구가 점차 **감소하고** 있습니다.", options: ["많아지고", "줄어들고", "유지되고", "시작하고"], answer: "줄어들고" },
      { id: "q_103", content: "이 그래프의 내용과 같은 것을 고르십시오.\n(그래프: 2020년 10%, 2021년 20%, 2022년 30%)", options: ["계속 감소하고 있다", "변화가 없다", "꾸준히 증가하고 있다", "갑자기 줄어들었다"], answer: "꾸준히 증가하고 있다" },
      { id: "q_104", content: "다음 밑줄 친 부분과 의미가 가장 비슷한 것을 고르십시오.\n\n건강을 **유지하기** 위해 운동을 합니다.", options: ["지키기", "잃기", "찾기", "버리기"], answer: "지키기" },
      { id: "q_105", content: "다음 괄호에 알맞은 것을 고르십시오.\n\n비가 오(  ) 사람들이 우산을 썼다.", options: ["기 시작해서", "는 반면에", "ㄹ 뿐만 아니라", "기로 결정해서"], answer: "기 시작해서" }
    ]
  },
  "dang_02": {
    name: "Sắp xếp câu thành đoạn văn",
    vocab_list: [
      { id: "v2_1", word: "따라서", meaning: "Vì vậy, do đó", explanation: "Là liên từ nối hai câu, trong đó câu trước là nguyên nhân, lý do của câu sau.", example: "어제 비가 많이 왔다. 따라서 소풍은 취소되었다.", fillInBlankQuestion: "어제 비가 많이 왔다. (   ) 소풍은 취소되었다.", fillInBlankAnswer: "따라서" },
      { id: "v2_2", word: "그러나", meaning: "Tuy nhiên", explanation: "Liên từ biểu thị sự trái ngược hoặc chuyển ý giữa hai câu.", example: "시험이 아주 어려웠다. 그러나 포기하지 않고 끝까지 풀었다.", fillInBlankQuestion: "시험이 아주 어려웠다. (   ) 포기하지 않고 끝까지 풀었다.", fillInBlankAnswer: "그러나" },
      { id: "v2_3", word: "게다가", meaning: "Hơn nữa, thêm vào đó", explanation: "Dùng để bổ sung thêm thông tin cùng chiều với nội dung phía trước.", example: "날씨가 춥다. 게다가 비까지 내리고 있다.", fillInBlankQuestion: "날씨가 춥다. (   ) 비까지 내리고 있다.", fillInBlankAnswer: "게다가" },
      { id: "v2_4", word: "왜냐하면", meaning: "Bởi vì", explanation: "Đứng đầu câu sau để giải thích lý do cho câu trước đó. Thường đi kèm với đuôi '-기 때문이다'.", example: "나는 일찍 일어났다. 왜냐하면 아침 운동을 하기 때문이다.", fillInBlankQuestion: "나는 일찍 일어났다. (   ) 아침 운동을 하기 때문이다.", fillInBlankAnswer: "왜냐하면" },
      { id: "v2_5", word: "결국", meaning: "Kết cục, cuối cùng thì", explanation: "Biểu thị kết quả cuối cùng sau khi trải qua một quá trình hay sự việc nào đó.", example: "열심히 공부한 끝에 결국 시험에 합격했습니다.", fillInBlankQuestion: "열심히 공부한 끝에 (   ) 시험에 합격했습니다.", fillInBlankAnswer: "결국" }
    ],
    grammar_list: [
      { id: "g2_1", structures: "-기 때문에", usage: "Bởi vì...", explanation: "Gắn vào thân động từ/tính từ để chỉ nguyên nhân, lý do. Thường không dùng với đuôi câu mệnh lệnh, rủ rê.", example: "눈이 많이 오기 때문에 길이 아주 미끄럽습니다.", fillInBlankQuestion: "눈이 많이 (   ) 때문에 길이 아주 미끄럽습니다.", fillInBlankAnswer: "오기" },
      { id: "g2_2", structures: "-(으)므로", usage: "Vì, do...", explanation: "Thể hiện lý do mang tính khách quan, trang trọng, thường dùng trong văn viết hoặc phát biểu.", example: "바닥이 미끄러우므로 조심하시기 바랍니다.", fillInBlankQuestion: "바닥이 미끄러우(   ) 조심하시기 바랍니다.", fillInBlankAnswer: "므로" }
    ],
    questions: [
      { id: "q_201", content: "(가) 비가 왔다. (나) 소풍이 취소되었다. (다) 우리는 슬펐다.", options: ["가-나-다", "다-나-가", "나-다-가", "가-다-나"], answer: "가-나-다" },
      { id: "q_202", content: "(가) 하지만 포기하지 않았다. (나) 시험이 너무 어려웠다. (다) 결국 합격했다.", options: ["나-가-다", "가-나-다", "다-나-가", "나-다-가"], answer: "나-가-다" },
      { id: "q_203", content: "(가) 따라서 길을 잃었다. (나) 지도를 안 가져왔다.", options: ["나-가", "가-나", "나-가-다", "가-다"], answer: "나-가" },
      { id: "q_204", content: "(가) 그래서 병원에 갔다. (나) 배가 너무 아팠다.", options: ["나-가", "가-나", "나-다", "가-다"], answer: "나-가" },
      { id: "q_205", content: "(가) 열심히 공부했다. (나) 그래서 좋은 성적을 받았다.", options: ["가-나", "나-가", "가-다", "다-나"], answer: "가-나" }
    ]
  }
};

export const ExamResult: ExamResultType = {
  student_id: "user_abc",
  total_score: 70,
  details: [
    { question_id: "q_101", category_id: "dang_01", is_correct: false },
    { question_id: "q_102", category_id: "dang_01", is_correct: false },
    { question_id: "q_103", category_id: "dang_01", is_correct: false },
    { question_id: "q_201", category_id: "dang_02", is_correct: false },
    { question_id: "q_202", category_id: "dang_02", is_correct: true }
  ]
};
