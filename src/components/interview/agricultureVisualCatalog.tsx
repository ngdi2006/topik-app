import type { LucideIcon } from 'lucide-react'
import { ArrowDown, ArrowUp, Box, Boxes, CircleDot, Crop, Droplets, Fence, Hand, Hammer, Leaf, MoveHorizontal, Package, Pickaxe, Power, RotateCw, Scale, Scissors, Shield, Shovel, Sprout, Tractor, Trees, UserRound, Wheat, Wrench, Zap } from 'lucide-react'

export type AgricultureVisualDefinition = { id: string; label: string; ko: string; icon: LucideIcon }
const visual = (id: string, label: string, ko: string, icon: LucideIcon): AgricultureVisualDefinition => ({ id, label, ko, icon })

export const AGRICULTURE_TARGET_DEFINITIONS: AgricultureVisualDefinition[] = [
  visual('weeds','Cỏ dại','잡초',Leaf), visual('rice','Lúa','벼',Wheat), visual('potato','Khoai tây','감자',Sprout),
  visual('sweet_potato','Khoai lang','고구마',Sprout), visual('hard_soil','Đất cứng','단단한 땅',Shovel), visual('soil','Đất','흙',Shovel),
  visual('sand','Cát','모래',CircleDot), visual('compost','Phân ủ','퇴비',Package), visual('seedling','Cây con','모종',Sprout),
  visual('dry_debris','Cỏ khô và lá rụng','마른 풀과 낙엽',Leaf), visual('manure','Phân chuồng','배설물',Package), visual('crop','Cây trồng','작물',Sprout),
  visual('seed','Hạt giống','씨앗',CircleDot), visual('thick_branch','Cành cây dày','굵은 가지',Trees), visual('branch','Cành cây','가지',Trees),
  visual('livestock','Gia súc','가축',UserRound), visual('water','Nước','물',Droplets), visual('water_pesticide','Nước và thuốc','물과 농약',Droplets),
  visual('produce','Nông sản','농산물',Wheat), visual('feed','Thức ăn gia súc','사료',Package), visual('fertilizer','Phân bón','비료',Package),
  visual('pests','Sâu bọ','벌레',CircleDot), visual('crop_disease','Bệnh cây trồng','작물의 병해',Leaf), visual('height','Vị trí cao','높은 곳',ArrowUp),
  visual('animals','Động vật','동물',UserRound), visual('fertilizer_soil','Phân bón và đất','비료와 흙',Package), visual('livestock_ear','Tai gia súc','가축의 귀',UserRound),
  visual('field','Ruộng','밭',Crop), visual('body','Cơ thể','몸',UserRound), visual('feet','Chân','발',UserRound), visual('arms','Cánh tay','팔',Hand),
  visual('soil_leaves','Đất và lá rụng','흙과 낙엽',Leaf), visual('toolbox_left','Hộp dụng cụ bên trái','왼쪽 공구함',Boxes),
  visual('toolbox_right','Hộp dụng cụ bên phải','오른쪽 공구함',Boxes), visual('toolbox','Hộp dụng cụ','공구함',Box), visual('box','Hộp','함',Box),
  visual('dedicated_box','Hộp chuyên dụng','전용함',Shield), visual('power','Nguồn điện','전원',Power), visual('switch','Công tắc','스위치',Power),
  visual('lever','Cần gạt','레버',MoveHorizontal), visual('button','Nút bấm','버튼',CircleDot), visual('handle','Tay cầm','핸들',RotateCw),
  visual('wire','Dây thép','철사',Zap), visual('copper_wire','Dây đồng','구리선',Zap), visual('electric_wire','Dây điện','전선',Zap),
  visual('nut','Đai ốc','너트',Wrench), visual('bolt','Bu lông','볼트',Wrench), visual('hex_bolt','Bu lông lục giác','육각형 볼트',Wrench),
  visual('slotted_screw','Ốc vít rãnh thẳng','일자 나사',Wrench), visual('phillips_screw','Ốc vít chữ thập','십자 나사',Wrench), visual('nail','Đinh','못',Hammer),
]

export const AGRICULTURE_ACTION_DEFINITIONS: AgricultureVisualDefinition[] = [
  visual('cut_grass','Cắt cỏ','베다',Scissors), visual('harvest','Gặt','베다',Wheat), visual('remove','Loại bỏ','제거하다',Hand),
  visual('dig','Đào','파다',Pickaxe), visual('scoop','Xúc','퍼다',Shovel), visual('transplant','Bứng và trồng','뽑고 심다',Sprout),
  visual('rake','Cào gom','긁어모으다',Leaf), visual('break_up','Đập vỡ','부수다',Hammer), visual('mix','Trộn đều','섞다',RotateCw),
  visual('clear','Dọn','치우다',Hand), visual('water','Tưới nước','물을 뿌리다',Droplets), visual('sow','Gieo hạt','심다',Sprout),
  visual('spray','Phun thuốc','농약을 치다',Droplets), visual('cut_branch','Cắt cành','자르다',Scissors), visual('prune','Tỉa cành','다듬다',Scissors),
  visual('saw','Cưa/cắt','자르다',Scissors), visual('feed','Cho ăn','주다',Hand), visual('put_into','Đặt/đựng vào','넣다',Box),
  visual('weigh','Cân','측정하다',Scale), visual('prevent','Phòng bệnh','방지하다',Shield), visual('harvest_store','Thu hoạch và đựng','수확하고 담다',Wheat),
  visual('spread','Rải','뿌리다',Hand), visual('climb','Leo lên','올라가다',ArrowUp), visual('block','Ngăn tiếp cận','막다',Fence),
  visual('support','Chống đỡ','받쳐주다',Trees), visual('cover','Bọc/phủ','씌우다',Shield), visual('transport','Vận chuyển','운반하다',Tractor),
  visual('water_auto','Tưới tự động','자동 분사',Droplets), visual('attach','Gắn vào','붙이다',Wrench), visual('detach','Tháo ra','떼다',Wrench),
  visual('punch','Đục lỗ','구멍을 뚫다',CircleDot), visual('sit','Ngồi làm việc','앉다',UserRound), visual('sweep','Quét','쓸다',Leaf),
  visual('wear','Mang/đeo','신다',Shield), visual('turn_on','Bật','켜다',Power), visual('turn_off','Tắt','끄다',Power),
  visual('move_up','Gạt lên','올리다',ArrowUp), visual('move_down','Gạt xuống','내리다',ArrowDown), visual('pull','Kéo','당기다',ArrowDown),
  visual('push','Đẩy','밀다',ArrowUp), visual('press','Ấn','누르다',CircleDot), visual('turn','Xoay','돌리다',RotateCw),
  visual('bend','Uốn','구부리다',RotateCw), visual('cut','Cắt','자르다',Scissors), visual('strip','Tuốt vỏ','벗기다',Scissors),
  visual('tighten','Siết','조이다',Wrench), visual('loosen','Tháo','풀다',Wrench), visual('hammer','Đóng đinh','박다',Hammer), visual('pull_nail','Nhổ đinh','빼다',Hammer),
]

export type AgricultureToolGroup = 'Làm đất & thủ công'|'Gieo trồng & chăm sóc'|'Cắt tỉa & thu hoạch'|'Chăn nuôi'|'Chứa & vận chuyển'|'Bảo hộ'|'Linh kiện & điều khiển'|'Lắp ráp & cắt'
export const AGRICULTURE_TOOL_GROUP_ORDER: AgricultureToolGroup[] = ['Làm đất & thủ công','Gieo trồng & chăm sóc','Cắt tỉa & thu hoạch','Chăn nuôi','Chứa & vận chuyển','Bảo hộ','Linh kiện & điều khiển','Lắp ráp & cắt']
const ids = (words: string[]) => words.map(word => `agriculture_${word.replace(/[\s()]/g,'').toLowerCase().replace(/[^a-z0-9가-힣]/g,'_')}`)
const groups: Record<AgricultureToolGroup,string[]> = {
  'Làm đất & thủ công':ids(['낫','호미','괭이','곡괭이','삽','모종삽','갈퀴','쇠스랑','대빗자루']),
  'Gieo trồng & chăm sóc':ids(['호스','물뿌리개','모종판','농약분무기','농약','비료','울타리망','지주대','봉지','스프링클러','멀칭비닐']),
  'Cắt tỉa & thu hoạch':ids(['양손가위','전정가위','톱','바구니','예초기']),
  'Chăn nuôi':ids(['사료','건초','바가지','귀표','귀표펀칭기']),
  'Chứa & vận chuyển':ids(['고무통','쌀자루(마대)','저울','사다리','일륜차','손수레']),
  'Bảo hộ':ids(['작업방석','장화','토시']),
  'Linh kiện & điều khiển':ids(['너트','볼트','나사못','베어링','기어','코일 스프링','용접봉','톱날','전원 스위치','스위치','레버','버튼','핸들']),
  'Lắp ráp & cắt':ids(['드라이버','펜치','절단기','니퍼','와이어 스트리퍼','소켓 렌치','스패너','멍키 스패너','육각 렌치','일자 드라이버','십자 드라이버','망치','장도리']),
}
export const AGRICULTURE_TOOL_GROUP_BY_ID = Object.fromEntries(Object.entries(groups).flatMap(([group,toolIds])=>toolIds.map(id=>[id,group]))) as Record<string,AgricultureToolGroup>
export const findAgricultureTarget = (id:string|null|undefined) => AGRICULTURE_TARGET_DEFINITIONS.find(item=>item.id===id)
export const getAgricultureTargetImage = (id:string|null|undefined) => findAgricultureTarget(id) ? `/assets/workshop/agriculture-targets-3d/${id}.png` : null
export const getAgricultureToolImage = (id:string|null|undefined) => id?.startsWith('agriculture_') ? `/assets/workshop/agriculture-tools-3d/${id}.png` : null
export const findAgricultureAction = (id:string|null|undefined) => AGRICULTURE_ACTION_DEFINITIONS.find(item=>item.id===id)
export function AgricultureEntityIcon({id,kind,className='size-7'}:{id:string|null|undefined;kind:'target'|'action';className?:string}) { const Icon=(kind==='target'?findAgricultureTarget(id):findAgricultureAction(id))?.icon||Sprout; return <Icon aria-hidden="true" className={className} strokeWidth={1.8}/> }
