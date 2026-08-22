-- Remove tool-practice questions that cannot be simulated meaningfully on the
-- interview work table. This is intentionally scoped to "Sử dụng công cụ".
DELETE FROM public.interview_questions
WHERE category = 'Sử dụng công cụ'
  AND (
    question_text ~ '(사다리|지게차|대차|핸드카|핸드파레트트럭|밴딩기|드릴링머신|전기[[:space:]]*드릴|구멍을 뚫는 기계|혼합기|테이블톱|에어콤프레샤|호이스트)'
    OR vietnamese_meaning ~* '(xe[[:space:]]*nâng|xe[[:space:]]*đẩy[[:space:]]*hàng|xe[[:space:]]*đẩy[[:space:]]*tay|máy[[:space:]]*đóng[[:space:]]*đai|máy[[:space:]]*khoan|khoan[[:space:]]*điện|máy[[:space:]]*trộn|cưa[[:space:]]*bàn|máy[[:space:]]*nén[[:space:]]*khí|tời[[:space:]]*điện|sử dụng[[:space:]]*thang)'
  );
