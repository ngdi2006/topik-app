/**
 * Seed script: Tạo 60+ câu hỏi toán học theo 4 chủ đề vào bảng interview_questions
 * Topics: arithmetic | length | weight | time
 * Run: node scratch/seed_math_full.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const INDUSTRIES = ['Sản xuất chế tạo', 'Xây dựng', 'Nông nghiệp', 'Ngư nghiệp', 'Lâm nghiệp', 'Dịch vụ']

function ttsUrl(text) {
    return `https://translate.google.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q=${encodeURIComponent(text)}`
}

// 4 chủ đề toán học với câu hỏi phong phú
const MATH_QUESTIONS = {
    arithmetic: [
        // Cộng
        { q: '이 더하기 삼하면 얼마입니까?',   vi: '2 cộng 3 là bao nhiêu?',          ans: '오입니다. (5)' },
        { q: '오 더하기 사하면 얼마입니까?',   vi: '5 cộng 4 là bao nhiêu?',          ans: '구입니다. (9)' },
        { q: '칠 더하기 팔하면 얼마입니까?',   vi: '7 cộng 8 là bao nhiêu?',          ans: '십오입니다. (15)' },
        { q: '십이 더하기 육하면 얼마입니까?', vi: '12 cộng 6 là bao nhiêu?',         ans: '십팔입니다. (18)' },
        { q: '이십 더하기 오하면 얼마입니까?', vi: '20 cộng 5 là bao nhiêu?',         ans: '이십오입니다. (25)' },
        // Trừ
        { q: '십 빼기 사하면 얼마입니까?',    vi: '10 trừ 4 là bao nhiêu?',          ans: '육입니다. (6)' },
        { q: '이십 빼기 오하면 얼마입니까?',  vi: '20 trừ 5 là bao nhiêu?',          ans: '십오입니다. (15)' },
        { q: '삼십 빼기 십이하면 얼마입니까?',vi: '30 trừ 12 là bao nhiêu?',         ans: '십팔입니다. (18)' },
        { q: '오십 빼기 이십오하면 얼마입니까?', vi: '50 trừ 25 là bao nhiêu?',      ans: '이십오입니다. (25)' },
        { q: '백 빼기 사십오하면 얼마입니까?', vi: '100 trừ 45 là bao nhiêu?',       ans: '오십오입니다. (55)' },
        // Nhân
        { q: '이 곱하기 삼하면 얼마입니까?',  vi: '2 nhân 3 là bao nhiêu?',          ans: '육입니다. (6)' },
        { q: '삼 곱하기 삼하면 얼마입니까?',  vi: '3 nhân 3 là bao nhiêu?',          ans: '구입니다. (9)' },
        { q: '사 곱하기 오하면 얼마입니까?',  vi: '4 nhân 5 là bao nhiêu?',          ans: '이십입니다. (20)' },
        { q: '육 곱하기 칠하면 얼마입니까?',  vi: '6 nhân 7 là bao nhiêu?',          ans: '사십이입니다. (42)' },
        { q: '팔 곱하기 구하면 얼마입니까?',  vi: '8 nhân 9 là bao nhiêu?',          ans: '칠십이입니다. (72)' },
        // Chia
        { q: '십 나누기 이하면 얼마입니까?',  vi: '10 chia 2 là bao nhiêu?',         ans: '오입니다. (5)' },
        { q: '십 나누기 오하면 얼마입니까?',  vi: '10 chia 5 là bao nhiêu?',         ans: '이입니다. (2)' },
        { q: '이십사 나누기 사하면 얼마입니까?', vi: '24 chia 4 là bao nhiêu?',      ans: '육입니다. (6)' },
        { q: '삼십육 나누기 육하면 얼마입니까?', vi: '36 chia 6 là bao nhiêu?',      ans: '육입니다. (6)' },
        { q: '백 나누기 이십하면 얼마입니까?', vi: '100 chia 20 là bao nhiêu?',      ans: '오입니다. (5)' },
    ],
    length: [
        // km ↔ m
        { q: '일 킬로미터가 몇 미터입니까?',   vi: '1km là bao nhiêu mét?',           ans: '천 미터입니다. (1000m)' },
        { q: '이 킬로미터가 몇 미터입니까?',   vi: '2km là bao nhiêu mét?',           ans: '이천 미터입니다. (2000m)' },
        { q: '삼 킬로미터가 몇 미터입니까?',   vi: '3km là bao nhiêu mét?',           ans: '삼천 미터입니다. (3000m)' },
        { q: '오백 미터가 몇 킬로미터입니까?', vi: '500m là bao nhiêu km?',           ans: '영점 오 킬로미터입니다. (0.5km)' },
        { q: '이천 미터가 몇 킬로미터입니까?', vi: '2000m là bao nhiêu km?',          ans: '이 킬로미터입니다. (2km)' },
        { q: '삼천오백 미터가 몇 킬로미터입니까?', vi: '3500m là bao nhiêu km?',      ans: '삼점 오 킬로미터입니다. (3.5km)' },
        // m ↔ cm
        { q: '일 미터가 몇 센티미터입니까?',   vi: '1m là bao nhiêu cm?',             ans: '백 센티미터입니다. (100cm)' },
        { q: '이 미터가 몇 센티미터입니까?',   vi: '2m là bao nhiêu cm?',             ans: '이백 센티미터입니다. (200cm)' },
        { q: '오십 센티미터가 몇 미터입니까?', vi: '50cm là bao nhiêu m?',            ans: '영점 오 미터입니다. (0.5m)' },
        { q: '이백오십 센티미터가 몇 미터입니까?', vi: '250cm là bao nhiêu m?',       ans: '이점 오 미터입니다. (2.5m)' },
        // cm ↔ mm
        { q: '일 센티미터가 몇 밀리미터입니까?', vi: '1cm là bao nhiêu mm?',          ans: '십 밀리미터입니다. (10mm)' },
        { q: '오 센티미터가 몇 밀리미터입니까?', vi: '5cm là bao nhiêu mm?',          ans: '오십 밀리미터입니다. (50mm)' },
        { q: '삼십 밀리미터가 몇 센티미터입니까?', vi: '30mm là bao nhiêu cm?',       ans: '삼 센티미터입니다. (3cm)' },
        // Trọng lượng vật
        { q: '이 미터 오십 센티미터는 몇 센티미터입니까?', vi: '2m 50cm là bao nhiêu cm?', ans: '이백오십 센티미터입니다. (250cm)' },
        { q: '일 미터가 몇 밀리미터입니까?', vi: '1m là bao nhiêu mm?',               ans: '천 밀리미터입니다. (1000mm)' },
    ],
    weight: [
        // kg ↔ g
        { q: '일 킬로그램이 몇 그램입니까?',   vi: '1kg là bao nhiêu g?',             ans: '천 그램입니다. (1000g)' },
        { q: '이 킬로그램이 몇 그램입니까?',   vi: '2kg là bao nhiêu g?',             ans: '이천 그램입니다. (2000g)' },
        { q: '사 킬로그램이 몇 그램입니까?',   vi: '4kg là bao nhiêu g?',             ans: '사천 그램입니다. (4000g)' },
        { q: '오백 그램이 몇 킬로그램입니까?', vi: '500g là bao nhiêu kg?',           ans: '영점 오 킬로그램입니다. (0.5kg)' },
        { q: '삼천 그램이 몇 킬로그램입니까?', vi: '3000g là bao nhiêu kg?',          ans: '삼 킬로그램입니다. (3kg)' },
        { q: '이천오백 그램이 몇 킬로그램입니까?', vi: '2500g là bao nhiêu kg?',      ans: '이점 오 킬로그램입니다. (2.5kg)' },
        // tấn ↔ kg
        { q: '일 톤이 몇 킬로그램입니까?',     vi: '1 tấn là bao nhiêu kg?',          ans: '천 킬로그램입니다. (1000kg)' },
        { q: '이 톤이 몇 킬로그램입니까?',     vi: '2 tấn là bao nhiêu kg?',          ans: '이천 킬로그램입니다. (2000kg)' },
        { q: '오백 킬로그램이 몇 톤입니까?',   vi: '500kg là bao nhiêu tấn?',         ans: '영점 오 톤입니다. (0.5 tấn)' },
        { q: '삼천 킬로그램이 몇 톤입니까?',   vi: '3000kg là bao nhiêu tấn?',        ans: '삼 톤입니다. (3 tấn)' },
        // câu hỏi hỗn hợp thực tế
        { q: '이거 무게가 얼마예요?',          vi: 'Trọng lượng vật này là bao nhiêu?', ans: '오점 칠 킬로그램입니다. (5.7kg)' },
        { q: '하루 작업량이 몇 킬로그램입니까?', vi: 'Sản lượng làm việc 1 ngày là bao nhiêu kg?', ans: '오십 킬로그램입니다. (50kg)' },
        { q: '백 그램이 몇 킬로그램입니까?',   vi: '100g là bao nhiêu kg?',           ans: '영점 일 킬로그램입니다. (0.1kg)' },
        { q: '이 킬로그램 오백 그램은 몇 그램입니까?', vi: '2kg 500g là bao nhiêu g?', ans: '이천오백 그램입니다. (2500g)' },
        { q: '일 킬로그램의 절반은 몇 그램입니까?', vi: 'Nửa 1kg là bao nhiêu g?',    ans: '오백 그램입니다. (500g)' },
    ],
    time: [
        // Giờ, phút
        { q: '일 시간이 몇 분입니까?',         vi: '1 giờ là bao nhiêu phút?',        ans: '육십 분입니다. (60 phút)' },
        { q: '이 시간이 몇 분입니까?',         vi: '2 giờ là bao nhiêu phút?',        ans: '백이십 분입니다. (120 phút)' },
        { q: '삼십 분이 몇 시간입니까?',       vi: '30 phút là bao nhiêu giờ?',       ans: '반 시간입니다. (nửa giờ)' },
        { q: '일 분이 몇 초입니까?',           vi: '1 phút là bao nhiêu giây?',       ans: '육십 초입니다. (60 giây)' },
        { q: '하루가 몇 시간입니까?',          vi: '1 ngày có bao nhiêu giờ?',        ans: '이십사 시간입니다. (24 giờ)' },
        { q: '일 주일이 며칠입니까?',          vi: '1 tuần có bao nhiêu ngày?',       ans: '칠 일입니다. (7 ngày)' },
        { q: '한 달이 보통 며칠입니까?',       vi: '1 tháng thường có bao nhiêu ngày?', ans: '삼십 일 또는 삼십일 일입니다. (30 hoặc 31 ngày)' },
        // Nhiệt độ
        { q: '물이 어는 온도는 몇 도입니까?',  vi: 'Nước đóng băng ở bao nhiêu độ C?', ans: '영 도씨입니다. (0°C)' },
        { q: '물이 끓는 온도는 몇 도입니까?',  vi: 'Nước sôi ở bao nhiêu độ C?',      ans: '백 도씨입니다. (100°C)' },
        { q: '정상 체온은 몇 도입니까?',       vi: 'Nhiệt độ cơ thể bình thường là bao nhiêu?', ans: '삼십칠 도씨입니다. (37°C)' },
        // Hỗn hợp thực tế
        { q: '오전 여덟 시부터 오후 다섯 시까지 몇 시간입니까?', vi: 'Từ 8 giờ sáng đến 5 giờ chiều là mấy tiếng?', ans: '아홉 시간입니다. (9 giờ)' },
        { q: '이틀이 몇 시간입니까?',          vi: '2 ngày là bao nhiêu giờ?',        ans: '사십팔 시간입니다. (48 giờ)' },
        { q: '삼십 분은 몇 초입니까?',         vi: '30 phút là bao nhiêu giây?',      ans: '천팔백 초입니다. (1800 giây)' },
        { q: '일 년이 몇 달입니까?',           vi: '1 năm có bao nhiêu tháng?',       ans: '열두 달입니다. (12 tháng)' },
        { q: '이 시간 삼십 분은 몇 분입니까?', vi: '2 giờ 30 phút là bao nhiêu phút?', ans: '백오십 분입니다. (150 phút)' },
    ]
}

async function main() {
    console.log('Deleting existing math questions from interview_questions...')
    const { error: deleteErr } = await supabase
        .from('interview_questions')
        .delete()
        .eq('category', 'Toán học')

    if (deleteErr) {
        console.error('Delete error:', deleteErr)
        process.exit(1)
    }
    console.log('Cleared existing math questions.')

    const rows = []
    for (const [topic, questions] of Object.entries(MATH_QUESTIONS)) {
        for (const industry of INDUSTRIES) {
            for (const q of questions) {
                rows.push({
                    industry,
                    category: 'Toán học',
                    question_text: q.q,
                    vietnamese_meaning: q.vi,
                    // Encode topic + answer: ["{topic}:arithmetic", "오입니다. (5)"]
                    suggested_answers: [`__topic__:${topic}`, q.ans],
                    question_audio_url: ttsUrl(q.q),
                    countdown_after_audio: 8,
                })
            }
        }
    }

    console.log(`Inserting ${rows.length} rows...`)
    const CHUNK = 50
    for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK)
        const { error } = await supabase.from('interview_questions').insert(chunk)
        if (error) {
            console.error('Insert error at chunk', i, error)
            process.exit(1)
        }
        console.log(`Inserted chunk ${i} – ${i + chunk.length}`)
    }
    console.log('Done! Total inserted:', rows.length)
}

main().catch(console.error)
