import { ExamResultType, QuestionBankType, WeakCategory, Question } from './types';

// Hàm lọc ra các category_id bị sai từ ExamResult và đếm số lượng
export const getWeakCategories = (
  examResult: ExamResultType,
  questionBank: QuestionBankType
): WeakCategory[] => {
  const errorCounts: { [key: string]: number } = {};

  // Lọc các câu sai và đếm theo category_id
  examResult.details.forEach((detail) => {
    if (!detail.is_correct) {
      errorCounts[detail.category_id] = (errorCounts[detail.category_id] || 0) + 1;
    }
  });

  // Chuyển sang mảng và lấy thêm tên category, sau đó sắp xếp giảm dần
  const weakCategories: WeakCategory[] = Object.keys(errorCounts).map((categoryId) => {
    return {
      categoryId,
      name: questionBank[categoryId]?.name || "Chưa xác định",
      errorCount: errorCounts[categoryId]
    };
  }).sort((a, b) => b.errorCount - a.errorCount);

  return weakCategories;
};

// Hàm lấy ngẫu nhiên N câu hỏi từ một category (đảm bảo không trùng)
export const getRandomQuestions = (
  categoryId: string,
  questionBank: QuestionBankType,
  count: number = 5
): Question[] => {
  const categoryData = questionBank[categoryId];
  if (!categoryData || !categoryData.questions) return [];

  const allQuestions = [...categoryData.questions];
  const shuffled = allQuestions.sort(() => 0.5 - Math.random());
  
  return shuffled.slice(0, count);
};

const COMMON_DICT: Record<string, string> = {
  "수출": "Xuất khẩu", "증가": "Tăng lên", "감소": "Giảm xuống", "유지": "Duy trì",
  "인구": "Dân số", "운동": "Tập thể dục", "건강": "Sức khỏe", "사람": "Người",
  "우산": "Cái ô", "비가": "Mưa", "시작": "Bắt đầu", "결정": "Quyết định",
  "동생": "Em", "가족": "Gia đình", "학교": "Trường học", "공부": "Học tập",
  "성적": "Thành tích", "병원": "Bệnh viện", "지도": "Bản đồ", "시험": "Kỳ thi",
  "포기": "Từ bỏ", "소풍": "Dã ngoại", "취소": "Hủy bỏ", "슬펐다": "Đã buồn",
  "피곤": "Mệt mỏi", "일찍": "Sớm", "결국": "Kết cục", "어려웠다": "Đã khó",
  "가장": "Nhất", "비슷한": "Giống nhau", "알맞은": "Phù hợp", "고르십시오": "Hãy chọn",
  "다음": "Tiếp theo", "밑줄": "Gạch chân", "부분": "Phần", "의미": "Ý nghĩa",
  "내용": "Nội dung", "그래프": "Biểu đồ", "꾸준히": "Đều đặn", "갑자기": "Đột nhiên",
  "변화": "Sự thay đổi", "계속": "Tiếp tục"
};

const BASE_FORM_DICT: Record<string, { word: string, meaning: string }> = {
  "있습니다": { word: "있다", meaning: "Có / Ở" },
  "있어요": { word: "있다", meaning: "Có / Ở" },
  "있고": { word: "있다", meaning: "Có / Ở" },
  "있는": { word: "있다", meaning: "Có / Ở" },
  "없습니다": { word: "없다", meaning: "Không có" },
  "없어요": { word: "없다", meaning: "Không có" },
  "없는": { word: "없다", meaning: "Không có" },
  "합니다": { word: "하다", meaning: "Làm" },
  "하는": { word: "하다", meaning: "Làm" },
  "입니다": { word: "이다", meaning: "Là" },
  "인": { word: "이다", meaning: "Là" },
  "같습니다": { word: "같다", meaning: "Giống nhau" },
  "같은": { word: "같다", meaning: "Giống nhau" },
  "많습니다": { word: "많다", meaning: "Nhiều" },
  "많은": { word: "많다", meaning: "Nhiều" },
  "좋습니다": { word: "좋다", meaning: "Tốt / Thích" },
  "좋은": { word: "좋다", meaning: "Tốt / Thích" },
  "다릅니다": { word: "다르다", meaning: "Khác nhau" },
  "다른": { word: "다르다", meaning: "Khác nhau" },
  "어렵습니다": { word: "어렵다", meaning: "Khó" },
  "어려운": { word: "어렵다", meaning: "Khó" },
  "쉽습니다": { word: "쉽다", meaning: "Dễ" },
  "쉬운": { word: "쉽다", meaning: "Dễ" },
  "조립하고": { word: "조립하다", meaning: "Lắp ráp" }
};

function stripParticles(word: string): string {
    return word.replace(/(은|는|이|가|을|를|에|에서|로|으로|와|과|도|만|의|부터|까지)$/, '');
}

export const extractTextFromContent = (content: any): string => {
  if (typeof content === 'string') {
    let text = content;
    // Decode HTML entities cơ bản trước để lộ ra thẻ bị mã hóa
    text = text.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
    // Xóa tất cả các thẻ HTML
    text = text.replace(/<[^>]*>/g, ' ');
    // Xóa tiếp các mã HTML entities còn sót lại
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    // Xóa khoảng trắng thừa
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }
  if (!content) return '';
  if (Array.isArray(content)) {
    return content.map(extractTextFromContent).join(' ');
  }
  if (typeof content === 'object') {
    if (content.type === 'text' && content.text) return content.text;
    if (content.content) return extractTextFromContent(content.content);
    return '';
  }
  return String(content);
};

export const extractVocabFromQuestions = (questions: any[], maxVocab: number = 5) => {
  const vocabList: any[] = [];
  const usedWords = new Set<string>();
  
  const IGNORE_WORDS = ["다음", "알맞은", "고르십시오", "가장", "것을", "읽고", "물음에", "답하십시오", "무엇", "대해", "대해서"];

  // Lần 1: Cố gắng lấy từ vựng trong COMMON_DICT từ tất cả các câu
  for (const q of questions) {
    if (vocabList.length >= maxVocab) break;

    const rawContent = extractTextFromContent(q.content);
    const text = (rawContent + " " + (q.options || []).join(" ")).replace(/[\n\r]/g, " ");
    let words: string[] = Array.from(text.match(/[\uAC00-\uD7A3]+/g) || []);
    
    words = words.filter(w => !IGNORE_WORDS.some(ig => w.includes(ig)));
    words.sort(() => 0.5 - Math.random());

    const sentences = text.split(/(?<=[.?!])\s+/);

    for (const word of words) {
      if (vocabList.length >= maxVocab) break;
      if (word.length >= 2 && !usedWords.has(word)) {
        let matchedKey = null;
        for (const key of Object.keys(COMMON_DICT)) {
           if (word.includes(key)) {
               matchedKey = key;
               break;
           }
        }
        
        if (matchedKey && !usedWords.has(matchedKey)) {
            usedWords.add(matchedKey);
            usedWords.add(word); // Ngăn không cho lấy lại từ gốc này ở bước sau
            let example = sentences.find(s => s.includes(matchedKey)) || sentences.find(s => s.includes(word));
            if (!example) example = `${matchedKey} 관련된 문제입니다.`;
            
            vocabList.push({
              id: `v_${q.id || Date.now()}_${vocabList.length}`,
              word: matchedKey,
              meaning: COMMON_DICT[matchedKey],
              explanation: `Từ vựng cốt lõi thường gặp trong TOPIK. Hãy chú ý sắc thái nghĩa qua ví dụ bên dưới.`,
              example: example,
              fillInBlankQuestion: example.replace(new RegExp(matchedKey, 'g'), "(   )"),
              fillInBlankAnswer: matchedKey
            });
        }
      }
    }
  }

  // Lần 2: Nếu vẫn chưa đủ maxVocab thẻ, lấy thêm các từ ngẫu nhiên trong câu
  for (const q of questions) {
    if (vocabList.length >= maxVocab) break;

    const rawContent = extractTextFromContent(q.content);
    const text = (rawContent + " " + (q.options || []).join(" ")).replace(/[\n\r]/g, " ");
    let words: string[] = Array.from(text.match(/[\uAC00-\uD7A3]+/g) || []);
    
    words = words.filter(w => !IGNORE_WORDS.some(ig => w.includes(ig)));
    words.sort(() => 0.5 - Math.random());

    const sentences = text.split(/(?<=[.?!])\s+/);

    for (const rawWord of words) {
       if (vocabList.length >= maxVocab) break;
       
       // Thử kiểm tra dạng chia động/tính từ trước
       if (BASE_FORM_DICT[rawWord] && !usedWords.has(BASE_FORM_DICT[rawWord].word)) {
           const baseInfo = BASE_FORM_DICT[rawWord];
           usedWords.add(baseInfo.word);
           usedWords.add(rawWord);
           let example = sentences.find(s => s.includes(rawWord)) || `${rawWord} 관련된 문제입니다.`;
           
           vocabList.push({
               id: `v_${q.id || Date.now()}_${vocabList.length}`,
               word: baseInfo.word,
               meaning: baseInfo.meaning,
               explanation: `Dạng gốc của từ là "${baseInfo.word}", nhưng đã được chia thành "${rawWord}" do kết hợp với ngữ pháp đuôi câu.`,
               example: example,
               fillInBlankQuestion: example.replace(new RegExp(rawWord, 'g'), "(   )"),
               fillInBlankAnswer: rawWord
           });
           continue;
       }

       // Nếu không phải dạng chia, thử loại bỏ trợ từ để lấy danh từ gốc
       const cleanWord = stripParticles(rawWord);
       
       if (cleanWord.length >= 2 && !usedWords.has(cleanWord)) {
          usedWords.add(cleanWord);
          usedWords.add(rawWord);
          let example = sentences.find(s => s.includes(rawWord)) || `${rawWord} 관련된 문제입니다.`;
          vocabList.push({
           id: `v_${q.id || Date.now()}_${vocabList.length}`,
           word: cleanWord,
           meaning: `Ý nghĩa của "${cleanWord}"`,
           explanation: `Hãy ghi nhớ từ vựng này và quan sát cách nó được dùng trong ngữ cảnh ví dụ bên dưới để dịch câu tốt hơn.`,
           example: example,
           fillInBlankQuestion: example.replace(new RegExp(rawWord, 'g'), "(   )"),
           fillInBlankAnswer: rawWord
          });
       }
    }
  }

  if (vocabList.length === 0) {
     vocabList.push({
       id: `v_dummy_1`,
       word: "오답",
       meaning: "Câu trả lời sai",
       explanation: "Từ vựng chung thường gặp khi ôn tập lỗi sai trong đề thi TOPIK.",
       example: "오답 노트를 작성합니다.",
       fillInBlankQuestion: "(   ) 노트를 작성합니다.",
       fillInBlankAnswer: "오답"
     });
  }

  return vocabList;
};

const GRAMMAR_PATTERNS: { regex: RegExp, name: string, usage: string }[] = [
  { regex: /고\s*있/, name: "-고 있다", usage: "Đang làm gì... (thì hiện tại tiếp diễn)" },
  { regex: /ㄹ\s*수\s*있/, name: "-ㄹ 수 있다", usage: "Có thể làm gì..." },
  { regex: /ㄹ\s*수\s*없/, name: "-ㄹ 수 없다", usage: "Không thể làm gì..." },
  { regex: /아야\s*하|어야\s*하|여야\s*하/, name: "-아/어야 하다", usage: "Phải làm gì..." },
  { regex: /기\s*때문/, name: "-기 때문에", usage: "Bởi vì..." },
  { regex: /기\s*위해/, name: "-기 위해서", usage: "Để mà..." },
  { regex: /기\s*전에/, name: "-기 전에", usage: "Trước khi..." },
  { regex: /ㄴ\s*후에|은\s*후에/, name: "-ㄴ/은 후에", usage: "Sau khi..." },
  { regex: /고\s*싶/, name: "-고 싶다", usage: "Muốn làm gì..." },
  { regex: /지\s*않/, name: "-지 않다", usage: "Không làm gì... (phủ định)" },
  { regex: /지\s*못하|지\s*못 하/, name: "-지 못하다", usage: "Không thể làm gì..." },
  { regex: /는\s*것\s*같/, name: "-는 것 같다", usage: "Có vẻ như..." },
  { regex: /ㄹ\s*것\s*같/, name: "-ㄹ 것 같다", usage: "Có lẽ sẽ..." },
  { regex: /면\s*안\s*되|면\s*안되/, name: "-면 안 되다", usage: "Không được làm gì..." },
  { regex: /도\s*되/, name: "-아/어도 되다", usage: "Được phép làm gì..." },
  { regex: /기로\s*하/, name: "-기로 하다", usage: "Quyết định làm gì..." },
  { regex: /는\s*동안/, name: "-는 동안", usage: "Trong lúc..." },
  { regex: /ㄹ\s*때|을\s*때|는\s*때/, name: "-ㄹ/을 때", usage: "Khi, lúc..." },
  { regex: /뿐만\s*아니라/, name: "-뿐만 아니라", usage: "Không những... mà còn..." },
  { regex: /는\s*반면/, name: "-는 반면", usage: "Trong khi đó, ngược lại..." },
  { regex: /ㄹ\s*뿐/, name: "-ㄹ 뿐이다", usage: "Chỉ là..." },
  { regex: /에\s*따르면/, name: "-에 따르면", usage: "Theo như..." },
  { regex: /에\s*비해/, name: "-에 비해", usage: "So với..." },
  { regex: /는\s*대신/, name: "-는 대신", usage: "Thay vì..." },
  { regex: /기\s*시작/, name: "-기 시작하다", usage: "Bắt đầu làm gì..." },
  { regex: /로\s*인해/, name: "-로 인해", usage: "Do, vì (nguyên nhân)..." },
  { regex: /에도\s*불구하고/, name: "-에도 불구하고", usage: "Mặc dù, bất chấp..." },
  { regex: /ㄹ\s*지라도|을\s*지라도/, name: "-ㄹ지라도", usage: "Cho dù..." },
  { regex: /으면서|면서/, name: "-으면서", usage: "Vừa... vừa..." },
  { regex: /는데|은데|ㄴ데/, name: "-는데", usage: "Nhưng mà, thế mà..." },
  { regex: /지만/, name: "-지만", usage: "Nhưng..." },
  { regex: /으므로|므로/, name: "-으므로", usage: "Cho nên, vì vậy..." },
  { regex: /으려면|려면/, name: "-으려면", usage: "Nếu muốn..." },
  { regex: /다가/, name: "-다가", usage: "Đang... thì..." },
  { regex: /더니/, name: "-더니", usage: "Trước đó... thì bây giờ..." },
  { regex: /도록/, name: "-도록", usage: "Để cho, sao cho..." },
];

export const extractGrammarFromQuestions = (questions: any[], maxGrammar: number = 3) => {
    const grammarList: any[] = [];
    const usedPatterns = new Set<string>();
    
    for (const q of questions) {
        if (grammarList.length >= maxGrammar) break;
        
        const rawContent = extractTextFromContent(q.content);
        const optText = (q.options || []).map((o: any) => typeof o === 'string' ? o : '').join(' ');
        const text = (rawContent + " " + optText).replace(/[\n\r]/g, " ");
        
        for (const pattern of GRAMMAR_PATTERNS) {
            if (grammarList.length >= maxGrammar) break;
            if (usedPatterns.has(pattern.name)) continue;
            
            const match = pattern.regex.exec(text);
            if (match) {
                usedPatterns.add(pattern.name);
                
                // Find the sentence containing this match
                const matchIdx = match.index;
                const before = text.slice(Math.max(0, matchIdx - 30), matchIdx);
                const after = text.slice(matchIdx, Math.min(text.length, matchIdx + 40));
                let example = (before + after).trim();
                // Clean up example
                if (example.length < 5) example = text.slice(0, 60).trim();
                
                grammarList.push({
                    id: `g_${q.id || Date.now()}_${grammarList.length}`,
                    structures: pattern.name,
                    usage: pattern.usage,
                    explanation: `Nắm vững ngữ pháp này sẽ giúp bạn liên kết câu và hiểu ý đồ của đoạn văn nhanh hơn.`,
                    example: example,
                    fillInBlankQuestion: example.replace(match[0], "(   )"),
                    fillInBlankAnswer: match[0]
                });
                // Không break ở đây để có thể tìm thêm cấu trúc khác trong cùng một câu nếu còn dư chỗ
            }
        }
    }

    // If still empty, extract a Korean ending pattern from any question
    if (grammarList.length === 0 && questions.length > 0) {
        const q = questions[0];
        const rawContent = extractTextFromContent(q.content);
        const text = rawContent.replace(/[\n\r]/g, " ");
        
        // Try to find any verb/adjective ending
        const endingMatch = text.match(/([\uAC00-\uD7A3]{2,4}(?:다|요|니다|습니다|세요|ㅂ니다))/);
        if (endingMatch) {
            grammarList.push({
                id: `g_${q.id || 'auto'}_0`,
                structures: endingMatch[1],
                usage: `Dạng đuôi câu phổ biến`,
                explanation: `Đây là một dạng đuôi câu hoặc vĩ tố liên kết thường gặp. Hãy chú ý cách nó biểu đạt thái độ của người nói.`,
                example: text.slice(0, 60).trim(),
                fillInBlankQuestion: text.slice(0, 60).replace(endingMatch[1], "(   )").trim(),
                fillInBlankAnswer: endingMatch[1]
            });
        } else {
            // Absolute last resort - pick a random word from the text
            const words = text.match(/[\uAC00-\uD7A3]{3,}/g) || [];
            const word = words[0] || "문법";
            grammarList.push({
                id: `g_fallback_0`,
                structures: word,
                usage: `Biểu hiện ngữ pháp`,
                explanation: `Hãy tìm hiểu cách kết hợp từ này với các thành phần khác trong câu qua ví dụ bên dưới.`,
                example: text.slice(0, 60).trim() || `${word} 관련된 문제입니다.`,
                fillInBlankQuestion: (text.slice(0, 60) || `${word} 관련된 문제입니다.`).replace(word, "(   )").trim(),
                fillInBlankAnswer: word
            });
        }
    }

    return grammarList;
};
