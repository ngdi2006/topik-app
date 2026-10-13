import crypto from 'node:crypto'
import process from 'node:process'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { KOREAN_PRONUNCIATION_VERSION, toKoreanPronunciationText } from '../src/lib/korean-pronunciation.ts'

dotenv.config({ path: '.env.local' })

const execute = process.argv.includes('--execute')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const elevenLabsKey = process.env.ELEVENLABS_API_KEY
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'PDoCXqBQFGsvfO0hNkEs'
const modelId = process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2'
const audioBucket = process.env.SUPABASE_TTS_BUCKET || 'tts-audio'

if (!supabaseUrl || !serviceRoleKey) throw new Error('Thiếu cấu hình Supabase')
if (execute && !elevenLabsKey) throw new Error('Thiếu ELEVENLABS_API_KEY')

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
const normalize = value => String(value || '').replace(/[\s()]/g, '').toLowerCase()
const slug = value => normalize(value).replace(/[^a-z0-9가-힣]/g, '_')
const q = (source, tool, toolVi, ko, vi, targetId, targetKo, targetVi, actionId, actionKo, actionVi, group) => ({
  source, tool, toolVi, ko, vi, targetId, targetKo, targetVi, actionId, actionKo, actionVi, group,
})

// Các lựa chọn có dấu “/” trong tài liệu được tách thành câu nguyên tử.
const questions = [
  q('1a','낫','Liềm','낫을 사용하여 잡초를 베는 행동을 합니다.','Sử dụng liềm để cắt cỏ dại.','weeds','잡초','cỏ dại','cut_grass','베다','cắt','hand_tools'),
  q('1b','낫','Liềm','낫을 사용하여 벼를 베는 행동을 합니다.','Sử dụng liềm để gặt lúa.','rice','벼','lúa','harvest','베다','gặt','hand_tools'),
  q('2a','호미','Cuốc nhỏ','호미를 사용하여 잡초를 제거하는 행동을 합니다.','Sử dụng cuốc nhỏ để loại bỏ cỏ dại.','weeds','잡초','cỏ dại','remove','제거하다','loại bỏ','hand_tools'),
  q('2b','호미','Cuốc nhỏ','호미를 사용하여 감자를 캐는 행동을 합니다.','Sử dụng cuốc nhỏ để đào khoai tây.','potato','감자','khoai tây','dig','캐다','đào','hand_tools'),
  q('2c','호미','Cuốc nhỏ','호미를 사용하여 고구마를 캐는 행동을 합니다.','Sử dụng cuốc nhỏ để đào khoai lang.','sweet_potato','고구마','khoai lang','dig','캐다','đào','hand_tools'),
  q('3','괭이','Cuốc đào','괭이를 사용하여 딱딱한 땅을 파는 행동을 합니다.','Sử dụng cuốc đào để đào đất cứng.','hard_soil','딱딱한 땅','đất cứng','dig','파다','đào','hand_tools'),
  q('4','곡괭이','Cuốc chim','곡괭이를 사용하여 단단한 땅을 파는 행동을 합니다.','Sử dụng cuốc chim để đào đất cứng.','hard_soil','단단한 땅','đất cứng','dig','파다','đào','hand_tools'),
  q('5a','삽','Xẻng','삽을 사용하여 흙을 퍼는 행동을 합니다.','Sử dụng xẻng để xúc đất.','soil','흙','đất','scoop','퍼다','xúc','hand_tools'),
  q('5b','삽','Xẻng','삽을 사용하여 모래를 퍼는 행동을 합니다.','Sử dụng xẻng để xúc cát.','sand','모래','cát','scoop','퍼다','xúc','hand_tools'),
  q('5c','삽','Xẻng','삽을 사용하여 퇴비를 퍼는 행동을 합니다.','Sử dụng xẻng để xúc phân ủ.','compost','퇴비','phân ủ','scoop','퍼다','xúc','hand_tools'),
  q('6','모종삽','Xẻng bứng cây','모종삽을 사용하여 모종을 뽑고 심는 행동을 합니다.','Sử dụng xẻng bứng cây để bứng và trồng cây con.','seedling','모종','cây con','transplant','뽑고 심다','bứng và trồng','hand_tools'),
  q('7','갈퀴','Cái cào','갈퀴를 사용하여 마른 풀과 낙엽을 긁어모아 정리하는 행동을 합니다.','Sử dụng cào để thu gom cỏ khô và lá rụng.','dry_debris','마른 풀과 낙엽','cỏ khô và lá rụng','rake','긁어모으다','cào gom','hand_tools'),
  q('8a','쇠스랑','Cái chĩa','쇠스랑을 사용하여 단단한 흙을 부수는 행동을 합니다.','Sử dụng chĩa để đập vỡ đất cứng.','hard_soil','단단한 흙','đất cứng','break_up','부수다','đập vỡ','hand_tools'),
  q('8b','쇠스랑','Cái chĩa','쇠스랑을 사용하여 퇴비를 고르게 섞는 행동을 합니다.','Sử dụng chĩa để trộn đều phân ủ.','compost','퇴비','phân ủ','mix','섞다','trộn đều','hand_tools'),
  q('8c','쇠스랑','Cái chĩa','쇠스랑을 사용하여 배설물을 치우는 행동을 합니다.','Sử dụng chĩa để dọn phân.','manure','배설물','phân','clear','치우다','dọn','hand_tools'),
  q('9','호스','Vòi nước','호스를 사용하여 물을 뿌리는 행동을 합니다.','Sử dụng vòi để tưới nước.','crop','작물','cây trồng','water','물을 뿌리다','tưới nước','irrigation'),
  q('10','물뿌리개','Bình tưới nước','물뿌리개를 사용하여 물을 뿌리는 행동을 합니다.','Sử dụng bình tưới để tưới nước.','crop','작물','cây trồng','water','물을 뿌리다','tưới nước','irrigation'),
  q('11','모종판','Khay gieo hạt','파종판을 사용하여 씨앗을 심는 행동을 합니다.','Sử dụng khay gieo hạt để ươm hạt giống.','seed','씨앗','hạt giống','sow','심다','gieo hạt','planting'),
  q('12','농약분무기','Bình phun thuốc trừ sâu','농약 분무기를 사용하여 농약을 치는 행동을 합니다.','Sử dụng bình phun để phun thuốc trừ sâu.','crop','작물','cây trồng','spray','농약을 치다','phun thuốc','irrigation'),
  q('13','양손가위','Kéo cắt cành','양손가위를 사용하여 굵은 가지를 자르는 행동을 합니다.','Sử dụng kéo cắt cành để cắt cành dày.','thick_branch','굵은 가지','cành dày','cut_branch','자르다','cắt','pruning'),
  q('14','전정가위','Kéo tỉa cây','전정가위를 사용하여 가지를 다듬는 행동을 합니다.','Sử dụng kéo tỉa để tỉa cành.','branch','가지','cành cây','prune','다듬다','tỉa','pruning'),
  q('15','톱','Cưa','톱을 사용하여 두꺼운 가지를 자르는 행동을 합니다.','Sử dụng cưa để cắt cành cây dày.','thick_branch','두꺼운 가지','cành cây dày','saw','자르다','cưa/cắt','pruning'),
  q('16a','사료','Thức ăn gia súc','사료를 가져가서 가축에게 주는 행동을 합니다.','Mang thức ăn và cho gia súc ăn.','livestock','가축','gia súc','feed','주다','cho ăn','livestock'),
  q('16b','건초','Cỏ khô','건초를 가져가서 가축에게 주는 행동을 합니다.','Mang cỏ khô và cho gia súc ăn.','livestock','가축','gia súc','feed','주다','cho ăn','livestock'),
  q('17a','고무통','Thùng cao su','고무통에 물을 담는 행동을 합니다.','Cho nước vào thùng cao su.','water','물','nước','put_into','담다','đựng vào','container'),
  q('17b','고무통','Thùng cao su','고무통에 물과 농약을 섞는 행동을 합니다.','Trộn nước và thuốc trừ sâu trong thùng cao su.','water_pesticide','물과 농약','nước và thuốc trừ sâu','mix','섞다','trộn','container'),
  q('18a','쌀자루(마대)','Bao tải','마대를 사용하여 농산물을 담는 행동을 합니다.','Sử dụng bao tải để đựng nông sản.','produce','농산물','nông sản','put_into','담다','đựng vào','container'),
  q('18b','쌀자루(마대)','Bao tải','마대를 사용하여 사료를 담는 행동을 합니다.','Sử dụng bao tải để đựng thức ăn gia súc.','feed','사료','thức ăn gia súc','put_into','담다','đựng vào','container'),
  q('19a','저울','Cân','저울을 사용하여 농산물 무게를 측정하는 행동을 합니다.','Sử dụng cân để cân nông sản.','produce','농산물','nông sản','weigh','무게를 측정하다','cân','measure'),
  q('19b','저울','Cân','저울을 사용하여 비료 양을 측정하는 행동을 합니다.','Sử dụng cân để cân lượng phân bón.','fertilizer','비료','phân bón','weigh','양을 측정하다','cân','measure'),
  q('19c','저울','Cân','저울을 사용하여 사료 양을 측정하는 행동을 합니다.','Sử dụng cân để cân lượng thức ăn gia súc.','feed','사료','thức ăn gia súc','weigh','양을 측정하다','cân','measure'),
  q('20a','농약','Thuốc trừ sâu','농약을 사용하여 벌레를 없애는 행동을 합니다.','Sử dụng thuốc trừ sâu để loại bỏ sâu bọ.','pests','벌레','sâu bọ','remove','없애다','loại bỏ','supplies'),
  q('20b','농약','Thuốc trừ sâu','농약을 사용하여 작물의 병해를 방지하는 행동을 합니다.','Sử dụng thuốc trừ sâu để phòng bệnh cây trồng.','crop_disease','작물의 병해','bệnh cây trồng','prevent','방지하다','phòng bệnh','supplies'),
  q('21','바구니','Giỏ, rổ','바구니를 사용하여 농산물을 수확하고 담는 행동을 합니다.','Sử dụng giỏ để thu hoạch và đựng nông sản.','produce','농산물','nông sản','harvest_store','수확하고 담다','thu hoạch và đựng','container'),
  q('22','비료','Phân bón','비료를 사용하여 뿌리는 행동을 합니다.','Sử dụng phân bón để rải phân.','crop','작물','cây trồng','spread','뿌리다','rải','supplies'),
  q('23','사다리','Thang','사다리를 사용하여 올라가는 행동을 합니다.','Sử dụng thang để leo lên.','height','높은 곳','vị trí cao','climb','올라가다','leo lên','transport'),
  q('24','울타리망','Lưới hàng rào','울타리망을 사용하여 야생동물이나 가축의 접근을 막는 행동을 합니다.','Dùng lưới hàng rào để ngăn động vật đến gần.','animals','야생동물이나 가축','động vật','block','접근을 막다','ngăn tiếp cận','supplies'),
  q('25','지주대','Cọc chống cây','지주대를 사용하여 작물을 받쳐주는 행동을 합니다.','Dùng cọc để chống đỡ cây trồng.','crop','작물','cây trồng','support','받쳐주다','chống đỡ','supplies'),
  q('26','바가지','Gáo','바가지를 사용하여 사료를 주는 행동을 합니다.','Sử dụng gáo để cho gia súc ăn.','livestock','가축','gia súc','feed','사료를 주다','cho ăn','livestock'),
  q('27','봉지','Túi, bao','봉지를 사용하여 작물에 씌우는 행동을 합니다.','Sử dụng bao để bọc cây trồng.','crop','작물','cây trồng','cover','씌우다','bọc','supplies'),
  q('28','일륜차','Xe rùa','일륜차를 사용하여 비료와 흙을 운반하는 행동을 합니다.','Sử dụng xe rùa để vận chuyển phân bón và đất.','fertilizer_soil','비료와 흙','phân bón và đất','transport','운반하다','vận chuyển','transport'),
  q('29','손수레','Xe kéo tay','손수레를 사용하여 농작물을 운반하는 행동을 합니다.','Sử dụng xe kéo tay để vận chuyển nông sản.','produce','농작물','nông sản','transport','운반하다','vận chuyển','transport'),
  q('30','스프링클러','Vòi phun tưới nước','스프링클러를 사용하여 자동으로 물을 분사합니다.','Sử dụng vòi phun để tưới nước tự động.','crop','작물','cây trồng','water_auto','자동으로 물을 분사하다','tưới tự động','irrigation'),
  q('31','예초기','Máy cắt cỏ','예초기를 사용하여 잡초를 베는 행동을 합니다.','Sử dụng máy cắt cỏ để cắt cỏ dại.','weeds','잡초','cỏ dại','cut_grass','베다','cắt','machines'),
  q('32a','귀표','Thẻ tai','귀표를 이용하여 가축의 귀에 붙이는 행동을 합니다.','Gắn thẻ tai vào tai gia súc.','livestock_ear','가축의 귀','tai gia súc','attach','붙이다','gắn vào','livestock'),
  q('32b','귀표','Thẻ tai','귀표를 이용하여 가축의 귀에서 떼는 행동을 합니다.','Tháo thẻ khỏi tai gia súc.','livestock_ear','가축의 귀','tai gia súc','detach','떼다','tháo ra','livestock'),
  q('33','귀표펀칭기','Dụng cụ bấm thẻ tai','귀표천공기를 이용하여 가축의 귀에 구멍을 뚫는 행동을 합니다.','Dùng dụng cụ bấm thẻ để đục lỗ tai gia súc.','livestock_ear','가축의 귀','tai gia súc','punch','구멍을 뚫다','đục lỗ','livestock'),
  q('34','멀칭비닐','Màng phủ','멀칭비닐을 이용하여 밭을 덮는 행동을 합니다.','Dùng màng phủ để phủ ruộng.','field','밭','ruộng','cover','덮다','phủ','supplies'),
  q('35','작업방석','Ghế làm việc','작업방석을 이용하여 앉아서 작업하는 행동을 합니다.','Dùng ghế ngồi để ngồi làm việc.','body','몸','cơ thể','sit','앉아서 작업하다','ngồi làm việc','protective'),
  q('36','대빗자루','Chổi lớn','대빗자루를 이용하여 흙이나 낙엽을 쓸어 내는 행동을 합니다.','Dùng chổi lớn để quét đất và lá rụng.','soil_leaves','흙이나 낙엽','đất và lá rụng','sweep','쓸어 내다','quét','hand_tools'),
  q('37','장화','Ủng','장화를 이용하여 발에 신는 행동을 합니다.','Mang ủng vào chân.','feet','발','chân','wear','신다','mang','protective'),
  q('38','토시','Ống tay bảo hộ','고무토시를 이용하여 팔에 끼는 행동을 합니다.','Đeo ống tay bảo hộ vào tay.','arms','팔','cánh tay','wear','끼다','đeo','protective'),
  q('39a','드라이버','Tua vít','드라이버를 왼쪽 아래 선반에 있는 공구함에 넣습니다.','Bỏ tua vít vào hộp công cụ ở kệ dưới bên trái.','toolbox_left','왼쪽 아래 공구함','hộp công cụ dưới bên trái','put_into','넣다','đặt vào','assembly'),
  q('39b','드라이버','Tua vít','드라이버를 오른쪽 아래 선반에 있는 공구함에 넣습니다.','Bỏ tua vít vào hộp công cụ ở kệ dưới bên phải.','toolbox_right','오른쪽 아래 공구함','hộp công cụ dưới bên phải','put_into','넣다','đặt vào','assembly'),
  q('40a','너트','Đai ốc','너트를 공구함에 넣습니다.','Bỏ đai ốc vào hộp công cụ.','toolbox','공구함','hộp công cụ','put_into','넣다','đặt vào','parts'),
  q('40b','볼트','Bu lông','볼트를 공구함에 넣습니다.','Bỏ bu lông vào hộp công cụ.','toolbox','공구함','hộp công cụ','put_into','넣다','đặt vào','parts'),
  q('40c','나사못','Ốc vít','나사못을 공구함에 넣습니다.','Bỏ ốc vít vào hộp công cụ.','toolbox','공구함','hộp công cụ','put_into','넣다','đặt vào','parts'),
  q('41a','베어링','Ổ bi','베어링을 함에 넣습니다.','Bỏ ổ bi vào hộp.','box','함','hộp','put_into','넣다','đặt vào','parts'),
  q('41b','기어','Bánh răng','기어를 함에 넣습니다.','Bỏ bánh răng vào hộp.','box','함','hộp','put_into','넣다','đặt vào','parts'),
  q('41c','코일 스프링','Lò xo xoắn','코일 스프링을 함에 넣습니다.','Bỏ lò xo xoắn vào hộp.','box','함','hộp','put_into','넣다','đặt vào','parts'),
  q('42','용접봉','Que hàn','용접봉을 전용함에 넣습니다.','Bỏ que hàn vào hộp chuyên dụng.','dedicated_box','전용함','hộp chuyên dụng','put_into','넣다','đặt vào','parts'),
  q('43','톱날','Lưỡi cưa','톱날을 전용함에 넣습니다.','Bỏ lưỡi cưa vào hộp chuyên dụng.','dedicated_box','전용함','hộp chuyên dụng','put_into','넣다','đặt vào','parts'),
  q('44a','전원 스위치','Công tắc nguồn','전원을 켜는 행동을 합니다.','Thực hiện hành động mở nguồn điện.','power','전원','nguồn điện','turn_on','켜다','bật','controls'),
  q('44b','전원 스위치','Công tắc nguồn','전원을 끄는 행동을 합니다.','Thực hiện hành động tắt nguồn điện.','power','전원','nguồn điện','turn_off','끄다','tắt','controls'),
  q('45a','스위치','Công tắc','스위치를 올리는 행동을 합니다.','Thực hiện hành động gạt công tắc lên.','switch','스위치','công tắc','move_up','올리다','gạt lên','controls'),
  q('45b','스위치','Công tắc','스위치를 내리는 행동을 합니다.','Thực hiện hành động gạt công tắc xuống.','switch','스위치','công tắc','move_down','내리다','gạt xuống','controls'),
  q('46a','레버','Cần gạt','레버를 당기는 행동을 합니다.','Thực hiện hành động kéo cần gạt.','lever','레버','cần gạt','pull','당기다','kéo','controls'),
  q('46b','레버','Cần gạt','레버를 미는 행동을 합니다.','Thực hiện hành động đẩy cần gạt.','lever','레버','cần gạt','push','밀다','đẩy','controls'),
  q('47','버튼','Nút bấm','버튼을 누르는 행동을 합니다.','Thực hiện hành động ấn nút.','button','버튼','nút bấm','press','누르다','ấn','controls'),
  q('48','핸들','Tay cầm','핸들을 돌리는 행동을 합니다.','Thực hiện hành động xoay tay cầm.','handle','핸들','tay cầm','turn','돌리다','xoay','controls'),
  q('49','펜치','Kìm','펜치를 이용하여 철사를 구부리는 행동을 합니다.','Sử dụng kìm để uốn dây thép.','wire','철사','dây thép','bend','구부리다','uốn','cutting'),
  q('50','절단기','Kìm cộng lực','절단기를 이용하여 철사를 자르는 행동을 합니다.','Sử dụng kìm cộng lực để cắt dây thép.','wire','철사','dây thép','cut','자르다','cắt','cutting'),
  q('51a','니퍼','Kìm cắt','니퍼를 이용하여 구리선을 절단하는 행동을 합니다.','Sử dụng kìm cắt để cắt dây đồng.','copper_wire','구리선','dây đồng','cut','절단하다','cắt','cutting'),
  q('51b','와이어 스트리퍼','Kìm tuốt dây','와이어 스트리퍼를 이용하여 전선 피복을 벗기는 행동을 합니다.','Sử dụng kìm tuốt dây để tước vỏ dây điện.','electric_wire','전선','dây điện','strip','피복을 벗기다','tuốt vỏ','cutting'),
  q('52a','소켓 렌치','Bộ cờ lê đầu khẩu','소켓 렌치를 이용하여 너트를 조이는 행동을 합니다.','Sử dụng cờ lê đầu khẩu để siết đai ốc.','nut','너트','đai ốc','tighten','조이다','siết','assembly'),
  q('52b','소켓 렌치','Bộ cờ lê đầu khẩu','소켓 렌치를 이용하여 너트를 푸는 행동을 합니다.','Sử dụng cờ lê đầu khẩu để tháo đai ốc.','nut','너트','đai ốc','loosen','풀다','tháo','assembly'),
  q('53a','스패너','Cờ lê','스패너를 이용하여 너트를 조이는 행동을 합니다.','Sử dụng cờ lê để siết đai ốc.','nut','너트','đai ốc','tighten','조이다','siết','assembly'),
  q('53b','스패너','Cờ lê','스패너를 이용하여 볼트를 조이는 행동을 합니다.','Sử dụng cờ lê để siết bu lông.','bolt','볼트','bu lông','tighten','조이다','siết','assembly'),
  q('54a','멍키 스패너','Mỏ lết','멍키 스패너를 이용하여 너트를 조이는 행동을 합니다.','Sử dụng mỏ lết để siết đai ốc.','nut','너트','đai ốc','tighten','조이다','siết','assembly'),
  q('54b','멍키 스패너','Mỏ lết','멍키 스패너를 이용하여 너트를 푸는 행동을 합니다.','Sử dụng mỏ lết để tháo đai ốc.','nut','너트','đai ốc','loosen','풀다','tháo','assembly'),
  q('55a','육각 렌치','Khóa lục giác','육각 렌치를 이용하여 육각형 볼트를 조이는 행동을 합니다.','Sử dụng khóa lục giác để siết bu lông lục giác.','hex_bolt','육각형 볼트','bu lông lục giác','tighten','조이다','siết','assembly'),
  q('55b','육각 렌치','Khóa lục giác','육각 렌치를 이용하여 육각형 볼트를 푸는 행동을 합니다.','Sử dụng khóa lục giác để tháo bu lông lục giác.','hex_bolt','육각형 볼트','bu lông lục giác','loosen','풀다','tháo','assembly'),
  q('55c','일자 드라이버','Tua vít đầu dẹt','일자 드라이버를 이용하여 일자형 홈이 있는 나사를 조이는 행동을 합니다.','Sử dụng tua vít đầu dẹt để siết ốc vít rãnh thẳng.','slotted_screw','일자형 홈이 있는 나사','ốc vít rãnh thẳng','tighten','조이다','siết','assembly'),
  q('55d','일자 드라이버','Tua vít đầu dẹt','일자 드라이버를 이용하여 일자형 홈이 있는 나사를 푸는 행동을 합니다.','Sử dụng tua vít đầu dẹt để tháo ốc vít rãnh thẳng.','slotted_screw','일자형 홈이 있는 나사','ốc vít rãnh thẳng','loosen','풀다','tháo','assembly'),
  q('56','십자 드라이버','Tua vít chữ thập','십자 드라이버를 이용하여 십자 홈이 있는 나사를 조이는 행동을 합니다.','Sử dụng tua vít chữ thập để siết ốc vít rãnh chữ thập.','phillips_screw','십자 홈이 있는 나사','ốc vít rãnh chữ thập','tighten','조이다','siết','assembly'),
  q('57','망치','Búa','망치를 이용하여 못을 박는 행동을 합니다.','Sử dụng búa để đóng đinh.','nail','못','đinh','hammer','박다','đóng','assembly'),
  q('58','장도리','Búa nhổ đinh','장도리를 이용하여 못을 빼는 행동을 합니다.','Sử dụng búa nhổ đinh để nhổ đinh.','nail','못','đinh','pull_nail','빼다','nhổ','assembly'),
]

const groupWords = Object.groupBy ? Object.groupBy(questions, item => item.group) : questions.reduce((acc, item) => ((acc[item.group] ||= []).push(item), acc), {})
const toolId = word => `agriculture_${slug(word)}`
const sharedToolImages = {
  '드라이버':'01_tuavit_driver.png','펜치':'04_kimmonhon_pliers.png','니퍼':'07_kimcat_nipper.png','절단기':'25_kimcongluc_jeoldangi.png',
  '소켓 렌치':'08_cole_daukhau_socketwrench.png','스패너':'10_cole_spanner.png','멍키 스패너':'11_molet_monkeyspanner.png','육각 렌치':'13_khoalucgiac_hexwrench.png',
  '일자 드라이버':'02_tuavitdet_iljadriver_marked.png','십자 드라이버':'03_tuavitchuthap_sipjadriver_marked.png','망치':'17_bua_mangchi.png','장도리':'18_buanhodinh_jangdori.png',
  '전원 스위치':'68_bangdieukhien_controlpanel.png','스위치':'68_bangdieukhien_controlpanel.png','톱날':'19_cuasat_soetop.png','저울':'60_candia_jeopsijeoul.png',
  '너트':'/assets/workshop/details-v2/nut.png','볼트':'/assets/workshop/details-v2/bolt.png','나사못':'/assets/workshop/details-v2/slotted_screw.png',
  '베어링':'/assets/workshop/details-v2/bearing.png','기어':'/assets/workshop/details-v2/gear.png','코일 스프링':'/assets/workshop/details-v2/coil_spring.png',
  '용접봉':'/assets/workshop/details-v2/welding_rod.png','레버':'/assets/workshop/details-v2/lever.png','버튼':'/assets/workshop/details-v2/emergency_button.png',
  '핸들':'/assets/workshop/details-v2/lever.png','와이어 스트리퍼':'07_kimcat_nipper.png',
}

function audioPath(text) {
  return `${voiceId}/${crypto.createHash('sha256').update(`${text}_${voiceId}_${KOREAN_PRONUNCIATION_VERSION}`).digest('hex')}.mp3`
}
async function objectExists(bucket, objectPath) {
  const slash = objectPath.lastIndexOf('/')
  const folder = slash < 0 ? '' : objectPath.slice(0, slash)
  const name = slash < 0 ? objectPath : objectPath.slice(slash + 1)
  const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 10, search: name })
  if (error) throw error
  return (data || []).some(item => item.name === name)
}
async function ensureAudio(text) {
  const spoken = toKoreanPronunciationText(text)
  const objectPath = audioPath(spoken)
  if (!await objectExists(audioBucket, objectPath)) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': elevenLabsKey, 'Content-Type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text: spoken, model_id: modelId, voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true } }),
      signal: AbortSignal.timeout(45_000),
    })
    if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`)
    const { error } = await supabase.storage.from(audioBucket).upload(objectPath, Buffer.from(await response.arrayBuffer()), { contentType: 'audio/mpeg', cacheControl: '31536000' })
    if (error) throw error
  }
  return `${supabaseUrl}/storage/v1/object/public/${audioBucket}/${objectPath}`
}

const { data: vocabulary = [], error: vocabularyError } = await supabase.from('vocabulary_vong2').select('word_kr,word_vi,image_url').eq('industry', 'AGRICULTURE')
if (vocabularyError) throw vocabularyError
const vocabularyByWord = new Map(vocabulary.map(item => [normalize(item.word_kr), item]))
const aliases = new Map([['곡괭이','괭이'],['모종삽','삽'],['모종판','모종판'],['귀표펀칭기','귀표펀칭기'],['건초','건초'],['토시','토시']].map(([a,b]) => [normalize(a), normalize(b)]))
function vocabFor(item) {
  const sharedImage = sharedToolImages[item.tool]
  const sharedUrl = sharedImage?.startsWith('/') ? sharedImage : sharedImage ? `/assets/workshop/tools/game-v2/${sharedImage}` : null
  return vocabularyByWord.get(normalize(item.tool)) || vocabularyByWord.get(aliases.get(normalize(item.tool))) || { word_kr: item.tool, word_vi: item.toolVi, image_url: sharedUrl }
}
function optionFor(item) {
  const vocab = vocabFor(item)
  return { id: toolId(item.tool), name_ko: item.tool, name_vi: item.toolVi || vocab.word_vi, image_url: vocab.image_url }
}

const { data: existing = [], error: existingError } = await supabase.from('interview_questions').select('id,question_text,order_index,tool_config').eq('industry','Nông nghiệp').eq('category','Sử dụng công cụ')
if (existingError) throw existingError
const { data: orders = [], error: orderError } = await supabase.from('interview_questions').select('order_index').order('order_index',{ ascending:false, nullsFirst:false }).limit(1)
if (orderError) throw orderError
const existingBySource = new Map(existing.filter(row => row.tool_config?.source_document === 'SDCC-NÔNG NGHIỆP.pdf').map(row => [String(row.tool_config.source_item), row]))
const existingByQuestion = new Map(existing.map(row => [row.question_text.trim(), row]))
const startingOrder = Number(orders[0]?.order_index || 0) + 1

function payload(item, index, audioUrl) {
  const peers = groupWords[item.group] || []
  const options = Array.from(new Map([item, ...peers].map(row => [row.tool, row])).values()).slice(0, 6).map(optionFor)
  const correctTool = toolId(item.tool)
  return {
    industry:'Nông nghiệp', category:'Sử dụng công cụ', question_text:item.ko, vietnamese_meaning:item.vi,
    question_audio_url:audioUrl, suggested_answers:[`Công cụ: ${item.toolVi} | Vật thể: ${item.targetVi} | Thao tác: ${item.actionVi}`,`${item.tool}: ${item.toolVi} · ${item.actionKo}: ${item.actionVi}`],
    countdown_after_audio:8, tool_image_url:vocabFor(item).image_url, target_zone_id:item.targetId,
    order_index:(existingBySource.get(item.source)||existingByQuestion.get(item.ko))?.order_index ?? startingOrder+index,
    tool_config:{ schema_version:4, manual_override:true, source_document:'SDCC-NÔNG NGHIỆP.pdf', source_item:item.source,
      tools_on_desk:options.map(option=>option.id), tool_options:options, correct_tool:correctTool, target_object:item.targetId, requires_target:true,
      correct_action:item.actionId, requires_action:true,
      vocabulary_analysis:[{term:item.tool,meaning:item.toolVi,role:'tool',group:item.group},{term:item.targetKo,meaning:item.targetVi,role:'target'},{term:item.actionKo,meaning:item.actionVi,role:'action'}],
      answer_steps:[{step:1,kind:'tool',expected:correctTool},{step:2,kind:'target',expected:item.targetId},{step:3,kind:'action',expected:item.actionId}],
      scoring:{tool:1,target:1,action:1,pass_all_required:true}, vietnamese_instruction:item.vi,
      game_config:{schemaVersion:1,type:'select_tool',toolId:correctTool,objectId:item.targetId,actionId:item.actionId,distractorIds:options.filter(option=>option.id!==correctTool).map(option=>option.id)},
    },
  }
}

console.log(JSON.stringify({ sourceItems:58, importedSourceRange:'1-58 (toàn bộ tài liệu)', atomicQuestions:questions.length, agricultureVocabulary:vocabulary.length, existingQuestions:existing.length, insertCount:questions.filter(item=>!existingBySource.has(item.source)&&!existingByQuestion.has(item.ko)).length, updateCount:questions.filter(item=>existingBySource.has(item.source)||existingByQuestion.has(item.ko)).length, missingImages:questions.filter(item=>!vocabFor(item).image_url).map(item=>item.tool).filter((v,i,a)=>a.indexOf(v)===i) },null,2))
if (!execute) { console.log('Chế độ xem trước; thêm --execute để tạo âm thanh và nhập dữ liệu.'); process.exit(0) }

let inserted=0, updated=0
for (const [index,item] of questions.entries()) {
  const row=existingBySource.get(item.source)||existingByQuestion.get(item.ko)
  const data=payload(item,index,await ensureAudio(item.ko))
  const { error }=row ? await supabase.from('interview_questions').update(data).eq('id',row.id) : await supabase.from('interview_questions').insert(data)
  if (error) throw error
  row ? updated++ : inserted++
  console.log(`[${row?'update':'insert'} ${item.source}] ${item.ko}`)
}
console.log(JSON.stringify({inserted,updated,total:questions.length},null,2))
