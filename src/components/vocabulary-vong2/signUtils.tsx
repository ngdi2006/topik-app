'use client'
import React from 'react';

const mappings: Record<string, { shortKr: string; hlKr: string; shortVi: string; hlVi: string; }> = {
  "가시성이 높은 옷 (반사조끼) 을 착용하시오": {
    "shortKr": "충돌 사고 방지를 위해 반사조끼를 착용하십시오.",
    "hlKr": "indigo(\"반사조끼 착용\") + \" (충돌 방지)\"",
    "shortVi": "Bắt buộc mặc áo phản quang để tránh tai nạn va chạm.",
    "hlVi": "indigo(\"Bắt buộc mặc áo phản quang\") + \" để tránh \" + amber(\"tai nạn va chạm\")"
  },
  "머리 보호구를 착용하시오": {
    "shortKr": "낙하물로부터 머리를 보호하기 위해 안전모를 착용하십시오.",
    "hlKr": "indigo(\"안전모 착용\") + \" (머리 보호)\"",
    "shortVi": "Đội mũ bảo hộ để tránh chấn thương do vật rơi.",
    "hlVi": "indigo(\"Bắt buộc đội mũ bảo hộ\") + \" để bảo vệ đầu khỏi \" + amber(\"vật rơi\")"
  },

  "보호장갑을 착용하시오": {
    "shortKr": "손 상해와 위험 물질 접촉을 막기 위해 안전장갑을 착용하십시오.",
    "hlKr": "indigo(\"안전장갑 착용\") + \" (손 보호)\"",
    "shortVi": "Đeo găng tay bảo hộ để bảo vệ tay khỏi nguy hiểm.",
    "hlVi": "indigo(\"Bắt buộc đeo găng tay bảo hộ\") + \" để bảo vệ tay\""
  },
"안전장갑을 착용하시오": {
  "shortKr": "손 상해와 위험 물질 접촉을 막기 위해 안전장갑을 착용하십시오.",
    "hlKr": "indigo(\"안전장갑 착용\") + \" (손 보호)\"",
      "shortVi": "Đeo găng tay bảo hộ để bảo vệ tay khỏi nguy hiểm.",
        "hlVi": "indigo(\"Bắt buộc đeo găng tay bảo hộ\") + \" để bảo vệ tay\""
},
"경적을 울리시오": {
  "shortKr": "사고 예방을 위해 모퉁이나 출입구 통과 시 경적을 울리십시오.",
    "hlKr": "indigo(\"경적 사용\") + \" (사고 예방)\"",
      "shortVi": "Bấm còi khi qua khúc cua hoặc cửa ra vào.",
        "hlVi": "indigo(\"Bắt buộc bấm còi\") + \" khi qua \" + amber(\"khúc cua, cửa ra vào\")"
},
"방호복을 착용하시오": {
  "shortKr": "안전과 건강을 보호하기 위해 보호복을 착용하십시오.",
    "hlKr": "indigo(\"보호복 착용\") + \" (안전 보호)\"",
      "shortVi": "Mặc quần áo bảo hộ để bảo vệ cơ thể.",
        "hlVi": "indigo(\"Bắt buộc mặc quần áo bảo hộ\") + \" để bảo vệ cơ thể\""
},
"불투명 보안대를 반드시 착용하시오": {
  "shortKr": "눈을 보호하기 위해 보안경을 의무적으로 착용하십시오.",
    "hlKr": "indigo(\"보안경 착용\") + \" (눈 보호)\"",
      "shortVi": "Đeo kính bảo hộ để bảo vệ mắt khi gia công.",
        "hlVi": "indigo(\"Bắt buộc đeo kính bảo hộ\") + \" để bảo vệ mắt\""
},
"보안경(눈 보호기)을 착용하시오": {
  "shortKr": "눈을 보호하기 위해 보안경을 의무적으로 착용하십시오.",
    "hlKr": "indigo(\"보안경 착용\") + \" (눈 보호)\"",
      "shortVi": "Đeo kính bảo hộ để bảo vệ mắt khi gia công.",
        "hlVi": "indigo(\"Bắt buộc đeo kính bảo hộ\") + \" để bảo vệ mắt\""
},
"귀마개(청각 보호기)를 착용하시오": {
  "shortKr": "소음 피해와 청각 보호를 위해 귀덮개나 귀마개를 착용하십시오.",
    "hlKr": "indigo(\"귀마개/귀덮개 착용\") + \" (청각 보호)\"",
      "shortVi": "Đeo chụp tai hoặc nút bịt tai để bảo vệ thính giác.",
        "hlVi": "indigo(\"Bắt buộc đeo chụp tai/nút bịt tai\") + \" để \" + emerald(\"bảo vệ thính giác\")"
},
"사용설명서,책자를 참조하십시오": {
  "shortKr": "안전한 작업을 위해 사용설명서와 책자를 참조하십시오.",
    "hlKr": "indigo(\"사용설명서 참조\") + \" (안전 작업)\"",
      "shortVi": "Đọc kỹ sách hướng dẫn sử dụng để đảm bảo an toàn.",
        "hlVi": "indigo(\"Đọc kỹ hướng dẫn sử dụng\") + \" để bảo đảm an toàn\""
},
"마스크를 착용하시오": {
  "shortKr": "먼지와 유해 가스 흡입 방지를 위해 마스크를 착용하십시오.",
    "hlKr": "indigo(\"마스크 착용\") + \" (호흡기 보호)\"",
      "shortVi": "Đeo khẩu trang để tránh bụi mịn và khí độc.",
        "hlVi": "indigo(\"Bắt buộc đeo khẩu trang\") + \" chống \" + amber(\"bụi mịn, khí độc\")"
},
"보호용 앞치마를 착용하시오": {
  "shortKr": "오염과 화학 화상 방지를 위해 보호 앞치마를 착용하십시오.",
    "hlKr": "indigo(\"보호 앞치마 착용\") + \" (방수/화학 방지)\"",
      "shortVi": "Mặc tạp dề bảo hộ để chống thấm và hóa chất.",
        "hlVi": "indigo(\"Bắt buộc mặc tạp dề bảo hộ\") + \" để chống thấm, hóa chất\""
},
"손을 씻으시오": {
  "shortKr": "개인위생과 감염병 예방을 위해 비누로 손을 깨끗이 씻으십시오.",
    "hlKr": "emerald(\"손 씻기\") + \" (위생 관리)\"",
      "shortVi": "Rửa tay bằng xà phòng để phòng tránh dịch bệnh.",
        "hlVi": "\"Hãy \" + emerald(\"rửa tay bằng xà phòng\") + \" để phòng dịch bệnh\""
},
"손잡이를 사용하시오": {
  "shortKr": "계단 이동 시 미끄러짐 방지를 위해 손잡이를 잡으십시오.",
    "hlKr": "indigo(\"손잡이 잡기\") + \" (미끄러짐 방지)\"",
      "shortVi": "Bám vào lan can khi đi cầu thang để tránh trượt ngã.",
        "hlVi": "\"Hãy \" + indigo(\"bám vào lan can, tay vịn\") + \" để tránh trượt ngã\""
},
"얼굴 보호구를 착용하시오": {
  "shortKr": "얼굴과 생명 보호를 위해 안면 보호구를 착용하십시오.",
    "hlKr": "indigo(\"안면 보호구 착용\") + \" (얼굴 보호)\"",
      "shortVi": "Đeo mặt nạ bảo hộ để bảo vệ khuôn mặt.",
        "hlVi": "indigo(\"Bắt buộc đeo đồ bảo hộ mặt\") + \" để bảo vệ khuôn mặt\""
},
"잠г시오": {
  "shortKr": "안전 확보와 사고 예방을 위해 장비를 반드시 잠г십시오.",
    "hlKr": "indigo(\"장비 잠그기\") + \" (안전 확보)\"",
      "shortVi": "Khóa thiết bị lại để đảm bảo an toàn.",
        "hlVi": "indigo(\"Bắt buộc khóa lại\") + \" để bảo đảm an toàn\""
},
"안전띠를 착용하시오": {
  "shortKr": "고소 작업 시 추락 사고 예방을 위해 안전대를 착용하십시오.",
    "hlKr": "indigo(\"안전대 착용\") + \" (추락 방지)\"",
      "shortVi": "Thắt dây an toàn khi làm việc trên cao để tránh ngã.",
        "hlVi": "indigo(\"Bắt buộc thắt dây an toàn\") + \" khi làm việc trên cao\""
},
"안전벨트를 착용하시오": {
  "shortKr": "고소 작업 시 추락 사고 예방을 위해 안전대를 착용하십시오.",
    "hlKr": "indigo(\"안전대 착용\") + \" (추락 방지)\"",
      "shortVi": "Thắt dây an toàn khi làm việc trên cao để tránh ngã.",
        "hlVi": "indigo(\"Bắt buộc thắt dây an toàn\") + \" khi làm việc trên cao\""
},
"용접마스크를 착용하시오": {
  "shortKr": "용접 작업 시 눈 và 얼굴 보호를 위해 보안면을 착용하십시오.",
    "hlKr": "indigo(\"보안면 착용\") + \" (용접 보호)\"",
      "shortVi": "Đeo mặt nạ hàn để bảo vệ mắt và mặt.",
        "hlVi": "indigo(\"Bắt buộc đeo mặt nạ hàn\") + \" để bảo vệ mắt và mặt\""
},
"전기 플러그를 콘센트에서분리하시오": {
  "shortKr": "감전 사고와 전력 낭비 방지를 위해 플러그를 뽑으십시오.",
    "hlKr": "indigo(\"플러그 분리\") + \" (감전 방지)\"",
      "shortVi": "Rút phích cắm ra khỏi ổ cắm để phòng điện giật.",
        "hlVi": "indigo(\"Bắt buộc rút phích cắm\") + \" để phòng tránh điện giật\""
},
"이 통로를 이용하시오": {
  "shortKr": "차량 충돌을 방지하기 위해 지정된 통로로 통행하십시오.",
    "hlKr": "emerald(\"보행자 통로 이용\") + \" (안전 통행)\"",
      "shortVi": "Đi đúng lối đi dành riêng cho người đi bộ.",
        "hlVi": "\"Hãy \" + emerald(\"đi đúng lối đi bộ\") + \" để tránh va chạm\""
},
"호흡기 보호장치를 착용하시오": {
  "shortKr": "유해 물질 흡입 방지를 위해 호흡기 보호장구를 착용하십시오.",
    "hlKr": "indigo(\"호흡기 보호구 착용\") + \" (가스 방지)\"",
      "shortVi": "Đeo thiết bị bảo vệ đường hô hấp để tránh khí độc.",
        "hlVi": "indigo(\"Bắt buộc đeo thiết bị bảo vệ đường hô hấp\")"
},
"안전화를 착용하시오": {
  "shortKr": "발을 보호하고 미끄러짐 방지를 위해 안전화를 착용하십시오.",
    "hlKr": "indigo(\"안전화 착용\") + \" (발 보호)\"",
      "shortVi": "Đi giày bảo hộ để bảo vệ chân và tránh trơn trượt.",
        "hlVi": "indigo(\"Bắt buộc đi giày bảo hộ\") + \" để bảo vệ chân\""
},
"일반적인 강제 행동 표시": {
  "shortKr": "작업장 내 규정과 지시 사항을 준수하십시오.",
    "hlKr": "indigo(\"일반 지시 사항 준수\")",
      "shortVi": "Chỉ dẫn thực hiện các hành động bắt buộc chung.",
        "hlVi": "indigo(\"Bắt buộc thực hiện\") + \" các chỉ dẫn an toàn chung\""
},
"낙하(추락)": {
  "shortKr": "물건이 떨어지거나 사람이 추락할 위험이 있으니 주의하십시오.",
    "hlKr": "amber(\"추락/낙하물 주의\") + \" (낙하 경고)\"",
      "shortVi": "Cảnh báo nguy hiểm rơi ngã hoặc vật rơi từ trên cao.",
        "hlVi": "amber(\"Cảnh báo ngã cao, vật rơi\") + \", chú ý an toàn\""
},
"낙하물": {
  "shortKr": "물건이 떨어지거나 사람이 추락할 위험이 있으니 주의하십시오.",
    "hlKr": "amber(\"추락/낙하물 주의\") + \" (낙하 경고)\"",
      "shortVi": "Cảnh báo nguy hiểm rơi ngã hoặc vật rơi từ trên cao.",
        "hlVi": "amber(\"Cảnh báo ngã cao, vật rơi\") + \", chú ý an toàn\""
},
"미끄러운 표면": {
  "shortKr": "바닥이 미끄러워 넘어질 위험이 있으니 보행 시 주의하십시오.",
    "hlKr": "\"바닥 \" + amber(\"미끄럼 주의\") + \" (넘어짐 경고)\"",
      "shortVi": "Cảnh báo sàn trơn trượt, đi lại cẩn thận.",
        "hlVi": "amber(\"Cảnh báo sàn trơn trượt\") + \", đi lại cẩn thận\""
},
"인화물질": {
  "shortKr": "화재 예방을 위해 화기 반입을 엄격히 금지합니다.",
    "hlKr": "amber(\"인화성 물질 경고\") + \" (\" + red(\"화기 엄금\") + \")\"",
      "shortVi": "Cảnh báo chất dễ cháy, nghiêm cấm mang nguồn lửa.",
        "hlVi": "amber(\"Cảnh báo chất dễ cháy\") + \", \" + red(\"cấm mang lửa\") + \" vào\""
},
"바닥면 장애물": {
  "shortKr": "바닥의 장애물로 인해 걸려 넘어질 위험이 있으니 주의하십시오.",
    "hlKr": "\"바닥 \" + amber(\"장애물 주의\") + \" (넘어짐 예방)\"",
      "shortVi": "Cảnh báo chướng ngại vật trên sàn gây vấp ngã.",
        "hlVi": "amber(\"Cảnh báo chướng ngại vật trên sàn\") + \" gây vấp ngã\""
},
"일반 경고 표시": {
  "shortKr": "안전사고 예방을 위해 주변의 모든 위험에 주의하십시오.",
    "hlKr": "amber(\"일반 경고\") + \" (안전 유의)\"",
      "shortVi": "Cảnh báo các nguy cơ mất an toàn chung.",
        "hlVi": "amber(\"Cảnh báo nguy hiểm chung\") + \", chú ý an toàn\""
},
"독성 물질": {
  "shortKr": "인체에 해로운 독성 물질과 가스가 있으니 주의하십시오.",
    "hlKr": "amber(\"독성 물질 경고\") + \" (\" + red(\"출입 금지\") + \")\"",
      "shortVi": "Cảnh báo chất độc hại, tuyệt đối không tự ý vào.",
        "hlVi": "amber(\"Cảnh báo chất độc hại\") + \", \" + red(\"tuyệt đối không vào\")"
},
"방사능 물질 또는 이온화 방사선": {
  "shortKr": "인체에 치명적인 방사능 물질이 있으니 신속히 대피하십시오.",
    "hlKr": "amber(\"방사능 물질 경고\") + \" (대피 필요)\"",
      "shortVi": "Cảnh báo nguy hiểm từ chất phóng xạ, bức xạ.",
        "hlVi": "amber(\"Cảnh báo chất phóng xạ\") + \", tránh tiếp xúc\""
},
"전기": {
  "shortKr": "고전압 감전 위험이 있으니 전선을 만지지 마십시오.",
    "hlKr": "amber(\"감전 위험 경고\") + \" (전기 조심)\"",
      "shortVi": "Cảnh báo điện cao áp, đề phòng nguy cơ điện giật.",
        "hlVi": "amber(\"Cảnh báo điện cao áp\") + \", đề phòng \" + amber(\"điện giật\")"
},
"뜨거운 표면": {
  "shortKr": "화상 위험이 있으니 뜨거운 표면에 접촉하지 마십시오.",
    "hlKr": "amber(\"고온 표면 경고\") + \" (\" + red(\"접촉 금지\") + \")\"",
      "shortVi": "Cảnh báo bề mặt nóng, nguy cơ gây bỏng.",
        "hlVi": "amber(\"Cảnh báo bề mặt nóng\") + \", tránh \" + red(\"chạm tay vào\")"
},
"생물학적 위험": {
  "shortKr": "바이러스 및 감염병 전파 위험이 있으니 접근에 주의하십시오.",
    "hlKr": "amber(\"생물학적 위험 경고\") + \" (감염 주의)\"",
      "shortVi": "Cảnh báo mối nguy hiểm sinh học và bệnh truyền nhiễm.",
        "hlVi": "amber(\"Cảnh báo mối nguy sinh học\") + \" và dịch bệnh\""
},
"지게차와 산업용 운반기계": {
  "shortKr": "지게차 등 대형 장비 이동 구역이므로 충돌에 주의하십시오.",
    "hlKr": "amber(\"지게차 통행 경고\") + \" (충돌 주의)\"",
      "shortVi": "Cảnh báo khu vực xe nâng và máy công nghiệp hoạt động.",
        "hlVi": "amber(\"Cảnh báo xe nâng, máy công nghiệp\") + \" qua lại\""
},
"금연, 담배를 피우지 마시오": {
  "shortKr": "이 구역은 화재 예방을 위해 흡연을 금지하는 곳입니다.",
    "hlKr": "red(\"금연\") + \" (화재 예방)\"",
      "shortVi": "Cấm hút thuốc để phòng cháy nổ và bảo đảm an toàn.",
        "hlVi": "red(\"Cấm hút thuốc\") + \" để phòng cháy nổ, bảo đảm an toàn\""
},
"리프트 승객용으로 사용 금지": {
  "shortKr": "사고 방지를 위해 승객의 리프트 탑승을 금지합니다.",
    "hlKr": "red(\"탑승 금지\") + \" (화물 전용 리프트)\"",
      "shortVi": "Cấm hành khách sử dụng thang nâng hàng.",
        "hlVi": "red(\"Cấm hành khách sử dụng\") + \" thang nâng hàng\""
},
"밀지 마시오": {
  "shortKr": "추락 및 넘어짐 사고 방지를 위해 밀지 마십시오.",
    "hlKr": "red(\"밀기 금지\") + \" (추락 방지)\"",
      "shortVi": "Cấm xô đẩy để tránh té ngã tai nạn.",
        "hlVi": "red(\"Cấm xô đẩy\") + \" để tránh té ngã nguy hiểm\""
},
"술 취한 사람 금지": {
  "shortKr": "안전사고 예방을 위해 음주자의 출입을 금지합니다.",
    "hlKr": "\"음주자 \" + red(\"출입 금지\") + \" (안전 제일)\"",
      "shortVi": "Cấm người say rượu vào khu vực làm việc.",
        "hlVi": "red(\"Cấm người say rượu\") + \" vào nơi làm việc\""
},
"기대지 마시오": {
  "shortKr": "파손 및 추락 사고 예방을 위해 기대지 마십시오.",
    "hlKr": "red(\"기댐 금지\") + \" (파손/추락 방지)\"",
      "shortVi": "Cấm dựa vào để tránh đổ vỡ hoặc té ngã.",
        "hlVi": "red(\"Cấm dựa vào\") + \" để tránh đổ vỡ hoặc té ngã\""
},
"만지지 마시오": {
  "shortKr": "감전 및 화상 예방을 위해 장비를 만지지 마십시오.",
    "hlKr": "red(\"접촉 금지\") + \" (만지지 마시오)\"",
      "shortVi": "Cấm chạm tay vào thiết bị để tránh điện giật, bỏng.",
        "hlVi": "red(\"Cấm chạm tay\") + \" vào thiết bị để tránh điện giật\""
},
"사진 촬영 금지": {
  "shortKr": "보안 유지와 기밀 보호를 위해 사진 촬영을 금지합니다.",
    "hlKr": "red(\"사진 촬영 금지\") + \" (보안 유지)\"",
      "shortVi": "Cấm quay phim, chụp ảnh để bảo vệ an ninh.",
        "hlVi": "red(\"Cấm quay phim, chụp ảnh\") + \" để bảo vệ thông tin\""
},
"스위치의 상태를바꾸지 마시오": {
  "shortKr": "기계 오작동 방지를 위해 스위치를 조작하지 마십시오.",
    "hlKr": "red(\"스위치 조작 금지\") + \" (기계 오작동 방지)\"",
      "shortVi": "Cấm thay đổi trạng thái công tắc để tránh lỗi máy.",
        "hlVi": "red(\"Cấm thay đổi trạng thái công tắc\") + \" điều khiển\""
},
"뛰지 마시오": {
  "shortKr": "미끄러짐 및 부상 방지를 위해 작업장에서 뛰지 마십시오.",
    "hlKr": "red(\"뛰기 금지\") + \" (넘어짐 예방)\"",
      "shortVi": "Cấm chạy nhảy trong khu vực làm việc để tránh ngã.",
        "hlVi": "red(\"Cấm chạy nhảy\") + \" tại nơi làm việc\""
},
"물로 소화하지 마시오": {
  "shortKr": "화재 확산 및 위험 방지를 위해 물로 불을 끄지 마십시오.",
    "hlKr": "red(\"물 사용 금지\") + \" (소화 주의)\"",
      "shortVi": "Cấm dùng nước dập lửa đối với đám cháy đặc biệt.",
        "hlVi": "red(\"Cấm dùng nước dập lửa\") + \" cho đám cháy này\""
},
"손을 넣지 마시오": {
  "shortKr": "손 끼임 및 절단 사고 방지를 위해 손을 넣지 마십시오.",
    "hlKr": "red(\"손 투입 금지\") + \" (끼임 사고 방지)\"",
      "shortVi": "Cấm đưa tay vào khe hẹp hoặc máy đang chạy.",
        "hlVi": "red(\"Cấm đưa tay vào\") + \" máy móc đang hoạt động\""
},
"식음료 금지": {
  "shortKr": "위생 관리와 중독 예방을 위해 취식을 금지합니다.",
    "hlKr": "red(\"음식물 반입 금지\") + \" (위생 관리)\"",
      "shortVi": "Cấm ăn uống để giữ vệ sinh và tránh độc hại.",
        "hlVi": "red(\"Cấm ăn uống\") + \" tại khu vực làm việc\""
},
"로프에 매듭을 짓지 마시오": {
  "shortKr": "로프 손상 및 사고 방지를 위해 매듭을 짓지 마십시오.",
    "hlKr": "red(\"로프 매듭 금지\") + \" (안전선 보호)\"",
      "shortVi": "Cấm thắt nút trên dây thừng để giữ khả năng chịu lực.",
        "hlVi": "red(\"Cấm thắt nút dây thừng\") + \" để đảm bảo độ bền\""
},
"물을 마시지 마시오": {
  "shortKr": "유해 물질 오염 위험이 있으니 이 물을 마시지 마십시오.",
    "hlKr": "red(\"음용 금지\") + \" (마시지 마시오)\"",
      "shortVi": "Cấm uống nước tại nguồn nước chưa kiểm định này.",
        "hlVi": "red(\"Cấm uống nước\") + \" tại nguồn nước này\""
},
"수영 금지": {
  "shortKr": "익사 사고 예방을 위해 이 구역에서 수영을 금지합니다.",
    "hlKr": "red(\"수영 금지\") + \" (익사 위험)\"",
      "shortVi": "Cấm bơi lội để phòng tránh tai nạn đuối nước.",
        "hlVi": "red(\"Cấm bơi lội\") + \" để phòng tránh đuối nước\""
},
"실외신발 금지": {
  "shortKr": "청결 유지와 오염 방지를 위해 실외화를 금지합니다.",
    "hlKr": "red(\"실외화 착용 금지\") + \" (청결 유지)\"",
      "shortVi": "Cấm mang giày dép ngoài trời vào khu vực này.",
        "hlVi": "red(\"Cấm mang giày dép ngoài trời\") + \" vào đây\""
},
"앉지 마시오": {
  "shortKr": "통로 확보와 안전을 위해 이 구역에 앉지 마십시오.",
    "hlKr": "red(\"앉기 금지\") + \" (통로 확보)\"",
      "shortVi": "Cấm ngồi ở đây để đảm bảo lối đi thông thoáng.",
        "hlVi": "red(\"Cấm ngồi\") + \" để giữ lối đi thông thoáng\""
},
"일반적인 금지표지": {
  "shortKr": "안전 수칙을 준수하고 금지된 행동을 하지 마십시오.",
    "hlKr": "red(\"일반 금지\") + \" (안전 준수)\"",
      "shortVi": "Biển cấm chung, nghiêm cấm các hành vi nguy hiểm.",
        "hlVi": "red(\"Biển cấm chung\") + \", cấm hành vi nguy hiểm\""
},
"착화 금지; 화재, 발화원과 발연 금지": {
  "shortKr": "화재 및 폭발 방지를 위해 화기 사용을 금지합니다.",
    "hlKr": "red(\"화기 사용 금지\") + \" (발화원 차단)\"",
      "shortVi": "Cấm lửa, cấm châm lửa và các nguồn phát nhiệt.",
        "hlVi": "red(\"Cấm lửa và nguồn phát nhiệt\") + \" dưới mọi hình thức\""
},
"휴대폰 사용 금지": {
  "shortKr": "작업 집중 và 정밀 장비 보호를 위해 휴대폰을 금지합니다.",
    "hlKr": "red(\"휴대폰 사용 금지\") + \" (전자기장 방지)\"",
      "shortVi": "Cấm sử dụng điện thoại di động khi làm việc.",
        "hlVi": "red(\"Cấm sử dụng điện thoại di động\") + \" khi làm việc\""
},
"애견 금지": {
  "shortKr": "위생과 안전을 위해 반려동물 출입을 금지합니다.",
    "hlKr": "red(\"반려동물 출입 금지\") + \" (위생/안전)\"",
      "shortVi": "Cấm mang thú cưng vào khu vực làm việc.",
        "hlVi": "red(\"Cấm mang thú cưng\") + \" vào nơi làm việc\""
},
"임산부 출입 금지": {
  "shortKr": "태아와 임산부 보호를 위해 출입을 금지합니다.",
    "hlKr": "red(\"임산부 출입 금지\") + \" (안전 보호)\"",
      "shortVi": "Cấm phụ nữ mang thai đi vào khu vực này.",
        "hlVi": "red(\"Cấm phụ nữ mang thai\") + \" đi vào khu vực này\""
},
"토트랙을 벗어나지 마시오": {
  "shortKr": "열차 충돌 방지를 위해 선로 밖으로 나가지 마십시오.",
    "hlKr": "red(\"경로 이탈 금지\") + \" (선로 밖 진입 금지)\"",
      "shortVi": "Không bước ra khỏi đường ray để tránh tai nạn.",
        "hlVi": "red(\"Không tự ý bước ra\") + \" khỏi đường ray\""
},
"올라가지 마시오": {
  "shortKr": "추락 사고 예방을 위해 적재물에 올라가지 마십시오.",
    "hlKr": "red(\"올라가지 마시오\") + \" (추락 주의)\"",
      "shortVi": "Cấm leo trèo lên cao hoặc lên máy móc.",
        "hlVi": "red(\"Cấm leo trèo\") + \" lên cao hoặc máy móc\""
},
"장갑을 착용하지 마시오": {
  "shortKr": "회전하는 기계 작동 시 장갑 착용을 금지합니다.",
    "hlKr": "red(\"장갑 착용 금지\") + \" (말림 사고 예방)\"",
      "shortVi": "Cấm đeo găng tay khi dùng máy có trục xoay.",
        "hlVi": "red(\"Cấm đeo găng tay\") + \" khi dùng máy có trục xoay\""
},
"통행 금지": {
  "shortKr": "안전사고 예방을 위해 이 구역의 통행을 금지합니다.",
    "hlKr": "red(\"통행 금지\") + \" (보행자 통제)\"",
      "shortVi": "Cấm đi lại hoặc đi xuyên qua khu vực này.",
        "hlVi": "red(\"Cấm đi lại\") + \" trong khu vực nguy hiểm này\""
},
"의자를 흔들지 마시오": {
  "shortKr": "넘어짐 사고 예방을 위해 의자를 흔들지 마십시오.",
    "hlKr": "red(\"장난 금지\") + \" (의자 흔들기 금지)\"",
      "shortVi": "Cấm đùa nghịch hoặc lắc ghế gây ngã.",
        "hlVi": "red(\"Cấm đùa nghịch, lắc ghế\") + \" tránh ngã\""
},
"지게차, 산업용 차량 접근 금지": {
  "shortKr": "보행자 보호를 위해 지게차의 통행을 금지합니다.",
    "hlKr": "red(\"지게차 접근 금지\") + \" (보행자 보호)\"",
      "shortVi": "Cấm xe nâng và phương tiện vận chuyển qua lại.",
        "hlVi": "red(\"Cấm xe nâng, xe công nghiệp\") + \" qua lại\""
},
"휴대용 그라인더에 사용하지 마시오": {
  "shortKr": "파손 및 사고 방지를 위해 휴대용 그라인더를 쓰지 마십시오.",
    "hlKr": "red(\"그라인더 사용 금지\") + \" (기계 보호)\"",
      "shortVi": "Cấm dùng máy mài cầm tay tại khu vực này.",
        "hlVi": "red(\"Cấm dùng máy mài cầm tay\") + \" tại đây\""
},
"구급가방": {
  "shortKr": "응급처치용 구급가방이 보관되어 있는 곳입니다.",
    "hlKr": "emerald(\"구급함 보관소\") + \" (응급 처치)\"",
      "shortVi": "Nơi để túi cứu thương sơ cứu tại chỗ.",
        "hlVi": "emerald(\"Chỉ dẫn nơi để túi cứu thương\") + \" sơ cứu\""
},
"응급처치": {
  "shortKr": "부상 발생 시 응급처치를 할 수 있는 곳입니다.",
    "hlKr": "emerald(\"응급처치 구역\") + \" (안전 대피)\"",
      "shortVi": "Khu vực sơ cứu y tế khẩn cấp.",
        "hlVi": "emerald(\"Chỉ dẫn khu vực sơ cứu\") + \" y tế\""
},
"들것": {
  "shortKr": "응급 환자 이송을 위한 들것이 있는 곳입니다.",
    "hlKr": "emerald(\"들것 보관소\") + \" (환자 이송)\"",
      "shortVi": "Nơi để cáng cứu thương di chuyển người bệnh.",
        "hlVi": "emerald(\"Chỉ dẫn nơi để cáng cứu thương\")"
},
"비상망치": {
  "shortKr": "비상시 유리창을 깨기 위한 비상망치 위치 안내입니다.",
    "hlKr": "emerald(\"비상망치\") + \" (창문 파쇄용)\"",
      "shortVi": "Chỉ dẫn vị trí búa cứu hộ dùng khi khẩn cấp.",
        "hlVi": "emerald(\"Chỉ dẫn vị trí búa cứu hộ\") + \" khẩn cấp\""
},
"산소호흡기": {
  "shortKr": "질식 예방과 호흡을 위한 산소호흡기 위치 안내입니다.",
    "hlKr": "emerald(\"산소호흡기 보관소\") + \" (호흡기 구비)\"",
      "shortVi": "Chỉ dẫn nơi để bình oxy thở khẩn cấp.",
        "hlVi": "emerald(\"Chỉ dẫn nơi để bình oxy\") + \" thở khẩn cấp\""
},
"구명부이": {
  "shortKr": "익사 사고 방지를 위한 구명부이 위치 안내입니다.",
    "hlKr": "emerald(\"구명부이\") + \" (익사 방지)\"",
      "shortVi": "Chỉ dẫn vị trí đặt phao cứu sinh đường thủy.",
        "hlVi": "emerald(\"Chỉ dẫn vị trí đặt phao cứu sinh\")"
},
"반시계방향 열림": {
  "shortKr": "밸브나 문을 반시계방향으로 돌려 여는 곳입니다.",
    "hlKr": "emerald(\"반시계방향 열림\") + \" (조작 안내)\"",
      "shortVi": "Mở theo chiều ngược kim đồng hồ.",
        "hlVi": "\"Chỉ dẫn \" + emerald(\"mở ngược chiều kim đồng hồ\")"
},
"비상전화": {
  "shortKr": "비상사태 발생 시 신고를 위한 비상전화기 위치입니다.",
    "hlKr": "emerald(\"비상전화기 위치\") + \" (비상 연락)\"",
      "shortVi": "Chỉ dẫn vị trí điện thoại liên lạc khẩn cấp.",
        "hlVi": "emerald(\"Chỉ dẫn vị trí điện thoại khẩn cấp\")"
},
"시계방향으로 열림": {
  "shortKr": "밸브나 문을 시계방향으로 돌려 여는 곳입니다.",
    "hlKr": "emerald(\"시계방향 열림\") + \" (조작 안내)\"",
      "shortVi": "Mở theo chiều kim đồng hồ.",
        "hlVi": "\"Chỉ dẫn \" + emerald(\"mở theo chiều kim đồng hồ\")"
},
"구명조끼": {
  "shortKr": "수상 작업 시 착용해야 하는 구명조끼 보관함입니다.",
    "hlKr": "emerald(\"구명조끼 보관소\") + \" (안전 조끼)\"",
      "shortVi": "Chỉ dẫn nơi để áo phao cứu sinh.",
        "hlVi": "emerald(\"Chỉ dẫn nơi đặt áo phao cứu sinh\")"
},
"비상구(오)": {
  "shortKr": "화재 시 탈출을 돕기 위해 비상구가 오른쪽에 있습니다.",
    "hlKr": "emerald(\"비상구\") + \" (오른쪽 대피 경로)\"",
      "shortVi": "Chỉ dẫn lối thoát hiểm bên phải.",
        "hlVi": "emerald(\"Chỉ dẫn lối thoát hiểm bên phải\")"
},
"비상탈출용 호흡기": {
  "shortKr": "유독가스로부터 호흡기를 보호하는 마스크가 있습니다.",
    "hlKr": "emerald(\"비상탈출용 호흡기\") + \" (가스 마스크)\"",
      "shortVi": "Chỉ dẫn mặt nạ thở dùng để thoát hiểm khẩn cấp.",
        "hlVi": "emerald(\"Chỉ dẫn mặt nạ thở\") + \" thoát hiểm khẩn cấp\""
},
"비상구(왼)": {
  "shortKr": "화재 시 탈출을 돕기 위해 비상구가 왼쪽에 있습니다.",
    "hlKr": "emerald(\"비상구\") + \" (왼쪽 대피 경로)\"",
      "shortVi": "Chỉ dẫn lối thoát hiểm bên trái.",
        "hlVi": "emerald(\"Chỉ dẫn lối thoát hiểm bên trái\")"
},
"사다리가 있는 비상 창문": {
  "shortKr": "탈출용 사다리가 설치된 비상용 창문입니다.",
    "hlKr": "emerald(\"비상 창문\") + \" (탈출 사다리 구비)\"",
      "shortVi": "Chỉ dẫn cửa sổ thoát hiểm có trang bị thang.",
        "hlVi": "emerald(\"Chỉ dẫn cửa sổ thoát hiểm\") + \" có thang dây\""
},
"탈출사다리": {
  "shortKr": "고지대 탈출을 위한 구조용 사다리 위치 안내입니다.",
    "hlKr": "emerald(\"탈출 사다리\") + \" (인명 구조용)\"",
      "shortVi": "Chỉ dẫn thang thoát hiểm dùng khi khẩn cấp.",
        "hlVi": "emerald(\"Chỉ dẫn thang thoát hiểm\") + \" dùng khẩn cấp\""
},
"식수": {
  "shortKr": "마실 수 있는 깨끗한 물이 있는 식수대 안내입니다.",
    "hlKr": "emerald(\"식수대 안내\") + \" (식수 가능)\"",
      "shortVi": "Chỉ dẫn vị trí vòi nước uống sạch.",
        "hlVi": "emerald(\"Chỉ dẫn vòi nước uống\") + \" sạch\""
},
"구조창문": {
  "shortKr": "비상사태 시 구조를 위한 창문 위치를 안내합니다.",
    "hlKr": "emerald(\"구조 창문 위치\") + \" (비상 인명 구조)\"",
      "shortVi": "Chỉ dẫn vị trí cửa sổ cứu hộ cứu nạn.",
        "hlVi": "emerald(\"Chỉ dẫn vị trí cửa sổ cứu hộ\") + \" cứu nạn\""
},
"자동 심장박동기": {
  "shortKr": "심정지 환자에게 사용하는 자동 심장박동기의 위치를 안내합니다.",
    "hlKr": "emerald(\"자동 심장박동기 위치\") + \" (응급 처치)\"",
      "shortVi": "Chỉ dẫn vị trí đặt máy khử rung tim ngoài tự động.",
        "hlVi": "emerald(\"Máy khử rung tim ngoài tự động\") + \" (AED)\""
},
"오른쪽 슬라이딩 도어": {
  "shortKr": "문을 오른쪽으로 밀어 열어야 하는 미닫이문입니다.",
    "hlKr": "emerald(\"미닫이문\") + \" (오른쪽으로 trượt)\"",
      "shortVi": "Chỉ dẫn trượt cửa sang bên phải để mở.",
        "hlVi": "emerald(\"Mở bằng cách trượt cửa\") + \" sang bên phải\""
},
"왼쪽 슬라이딩 도어": {
  "shortKr": "문을 왼쪽으로 밀어 열어야 하는 미닫이문입니다.",
    "hlKr": "emerald(\"미닫이문\") + \" (왼쪽으로 trượt)\"",
      "shortVi": "Chỉ dẫn trượt cửa sang bên trái để mở.",
        "hlVi": "emerald(\"Mở bằng cách trượt cửa\") + \" sang bên trái\""
},
"왼쪽으로 밀면 열리는 문": {
  "shortKr": "문의 왼쪽을 앞으로 밀어야 열리는 여닫이문입니다.",
    "hlKr": "emerald(\"여닫이문\") + \" (왼쪽을 앞으로 밀기)\"",
      "shortVi": "Chỉ dẫn đẩy cửa về phía trái để mở.",
        "hlVi": "emerald(\"Mở bằng cách đẩy cửa\") + \" về phía trái\""
},
"오른쪽을 밀면 열리는 문": {
  "shortKr": "문의 오른쪽을 앞으로 밀어야 열리는 여닫이문입니다.",
    "hlKr": "emerald(\"여닫이문\") + \" (오른쪽을 앞으로 밀기)\"",
      "shortVi": "Chỉ dẫn đẩy cửa về phía phải để mở.",
        "hlVi": "emerald(\"Mở bằng cách đẩy cửa\") + \" về phía phải\""
},
"방화문": {
  "shortKr": "화재 확산 방지를 위해 평소 닫아두는 문입니다.",
    "hlKr": "emerald(\"방화문 경고\") + \" (상시 폐쇄)\"",
      "shortVi": "Chỉ dẫn cửa chống cháy ngăn khói và lửa.",
        "hlVi": "emerald(\"Chỉ dẫn cửa chống cháy\") + \" luôn đóng\""
},
"소화전": {
  "shortKr": "화재 진압용 고압 소화전이 보관되어 있는 곳입니다.",
    "hlKr": "emerald(\"소화전 위치\") + \" (화재 진압)\"",
      "shortVi": "Chỉ dẫn vị trí trụ chữa cháy phun nước.",
        "hlVi": "emerald(\"Chỉ dẫn vị trí trụ chữa cháy\") + \" phun nước\""
},
"오른쪽을 당기면 열리는 문": {
  "shortKr": "문의 오른쪽을 몸쪽으로 당겨야 열리는 문입니다.",
    "hlKr": "emerald(\"당기는 문\") + \" (오른쪽을 몸쪽으로 당기기)\"",
      "shortVi": "Chỉ dẫn kéo cửa từ bên phải để mở.",
        "hlVi": "emerald(\"Mở bằng cách kéo cửa\") + \" từ bên phải\""
},
"왼쪽을 당기면 열리는 문": {
  "shortKr": "문의 왼쪽을 몸쪽으로 당겨야 열리는 문입니다.",
    "hlKr": "emerald(\"당기는 문\") + \" (왼쪽을 몸쪽으로 당기기)\"",
      "shortVi": "Chỉ dẫn kéo cửa từ bên trái để mở.",
        "hlVi": "emerald(\"Mở bằng cách kéo cửa\") + \" từ bên trái\""
},
"소방사다리": {
  "shortKr": "화재 진압과 긴급 구조용 소방사다리 안내입니다.",
    "hlKr": "emerald(\"소방사다리 위치\") + \" (인명 구조)\"",
      "shortVi": "Chỉ dẫn vị trí thang cứu hỏa chữa cháy.",
        "hlVi": "emerald(\"Chỉ dẫn vị trí thang cứu hỏa\") + \" chữa cháy\""
},
"화재경보기": {
  "shortKr": "화재를 알리는 비상벨(발신기) 위치 안내입니다.",
    "hlKr": "emerald(\"화재경보기/비상벨\") + \" (화재 감지)\"",
      "shortVi": "Chỉ dẫn vị trí chuông nút bấm báo cháy.",
        "hlVi": "emerald(\"Chỉ dẫn vị trí nút chuông báo cháy\")"
},
"소방장비": {
  "shortKr": "화재 대피 및 진압을 위한 구조 장비함 위치입니다.",
    "hlKr": "emerald(\"소방장비 보관소\") + \" (화재 진압 장비)\"",
      "shortVi": "Chỉ dẫn vị trí thùng chứa thiết bị chữa cháy.",
        "hlVi": "emerald(\"Chỉ dẫn vị trí thiết bị chữa cháy\")"
},
"화재비상전화": {
  "shortKr": "소방서에 신속히 신고하기 위한 비상전화기입니다.",
    "hlKr": "emerald(\"화재비상전화기\") + \" (소방 신고용)\"",
      "shortVi": "Chỉ dẫn điện thoại báo cháy khẩn cấp.",
        "hlVi": "emerald(\"Chỉ dẫn điện thoại báo cháy khẩn cấp\")"
},
"소화기": {
  "shortKr": "초기 화재 진압을 위한 소화기가 보관되어 있습니다.",
    "hlKr": "emerald(\"소화기 위치\") + \" (초기 소화용)\"",
      "shortVi": "Chỉ dẫn vị trí bình chữa cháy xách tay.",
        "hlVi": "emerald(\"Chỉ dẫn vị trí bình chữa cháy\") + \" xách tay\""
}
};

// Helper to style components
const red = (text: string) => <span className="text-rose-600 font-extrabold">{text}</span>;
const amber = (text: string) => <span className="text-amber-600 font-extrabold">{text}</span>;
const indigo = (text: string) => <span className="text-indigo-600 font-extrabold">{text}</span>;

/**
 * Gets a short, concise plain-text Korean explanation matching a Vietnamese description or Korean word.
 */
export function getKoreanDescription(descVi: string, wordKr: string): string {
  const entry = mappings[wordKr];
  if (entry) return entry.shortKr;

  // Dynamic fallbacks
  if (descVi && descVi.startsWith("Biển báo này nghiêm cấm hành vi ")) {
    return `금지: ${wordKr}`;
  }
  if (descVi && descVi.startsWith("Biển báo này yêu cầu người lao động thực hiện đúng chỉ dẫn: ")) {
    return `지시: ${wordKr}`;
  }
  if (descVi && descVi.startsWith("Biển cảnh báo nguy hiểm hoặc nguy cơ mất an toàn liên quan đến: ")) {
    return `경고: ${wordKr}`;
  }
  if (descVi && descVi.startsWith("Biển chỉ dẫn vị trí hoặc thiết bị an toàn, cứu hộ: ")) {
    return `안전: ${wordKr}`;
  }
  return wordKr;
}

/**
 * Renders the verified Korean explanation as React content.
 * Do not evaluate the legacy highlight expression: adding React elements with
 * `+` coerces them to "[object Object]" and corrupts the sentence.
 */
export function renderDescriptionKr(descVi: string, wordKr: string): React.ReactNode {
  const entry = mappings[wordKr];
  if (entry) {
    return <span>{entry.shortKr}</span>;
  }

  // Dynamic patterns
  if (descVi && descVi.startsWith("Biển báo này nghiêm cấm hành vi ")) {
    return <>{red("금지")}: {wordKr}</>;
  }
  if (descVi && descVi.startsWith("Biển báo này yêu cầu người lao động thực hiện đúng chỉ dẫn: ")) {
    return <>{indigo("지시")}: {wordKr}</>;
  }
  if (descVi && descVi.startsWith("Biển cảnh báo nguy hiểm 또는 위험 우려: ")) {
    return <>{amber("경고")}: {wordKr}</>;
  }
  return <span>{wordKr}</span>;
}

/**
 * Renders the verified Vietnamese explanation as React content.
 */
export function renderDescriptionVi(descVi: string, wordVi: string = '', wordKr: string = ''): React.ReactNode {
  const entry = mappings[wordKr];
  if (entry) {
    return <span>{entry.shortVi}</span>;
  }
  return <span className="font-medium text-slate-650">{descVi}</span>;
}

/**
 * Returns plain-text, concise Vietnamese description without JSX tags.
 */
export function getShortDescriptionVi(descVi: string, wordVi: string = '', wordKr: string = ''): string {
  const entry = mappings[wordKr];
  if (entry) return entry.shortVi;
  return descVi;
}
