// Workshop sample objects for EPS-TOPIK Round 2 Caliper Measurement Practice

export type MeasureType = 'outer' | 'inner' | 'depth' | 'step'

export interface WorkshopObject {
  id: string
  nameVi: string
  nameKo: string
  koreanPronunciation: string
  category: 'mechanical' | 'tubing' | 'fastener' | 'gauge'
  measureType: MeasureType
  targetValueMm: number
  toleranceMm: number
  description: string
  instructionKo: string
  instructionVi: string
  color: string
  widthMm: number
  heightMm: number
  geometry?: 'bolt-width' | 'bolt-length' | 'flange-inner' | 'flange-outer' | 'pipe-outer' | 'bearing-outer'
  features: {
    outerDiameter?: number
    innerDiameter?: number
    depth?: number
    stepHeight?: number
    boltLength?: number
    boltHeadWidth?: number
    boltShaftDiameter?: number
    boltHeadHeight?: number
    flangeThickness?: number
  }
}

export const WORKSHOP_OBJECTS: WorkshopObject[] = [
  {
    id: 'hex-bolt-m12',
    nameVi: 'Bu-lông · Đường kính ren',
    nameKo: '육각 볼트 나사 외경',
    koreanPronunciation: 'yuk-gak bol-teu',
    category: 'fastener',
    geometry: 'bolt-width',
    measureType: 'outer',
    targetValueMm: 12.00,
    toleranceMm: 0.05,
    description: 'Đo đường kính ngoài thân ren của bu-lông lục giác bằng mỏ kẹp ngoài.',
    instructionKo: '버니어 캘리퍼스로 육각 볼트의 외경을 측정하세요.',
    instructionVi: 'Hãy dùng mỏ kẹp ngoài để đo đường kính ngoài của bu-lông.',
    color: '#94a3b8',
    widthMm: 20.00,
    heightMm: 55.00,
    features: {
      outerDiameter: 12.00,
      boltShaftDiameter: 12.00,
      boltLength: 55.00,
      boltHeadWidth: 20.00,
      boltHeadHeight: 7.00,
    },
  },
  {
    id: 'steel-cylinder-24-35',
    nameVi: 'Trục thép · Đường kính ngoài',
    nameKo: '원형 환봉',
    koreanPronunciation: 'won-hyeong hwan-bong',
    category: 'mechanical',
    measureType: 'outer',
    targetValueMm: 24.35,
    toleranceMm: 0.05,
    description: 'Đo đường kính ngoài của phôi tiện tròn bằng mỏ kẹp ngoài.',
    instructionKo: '원형 환봉의 외경을 정밀하게 측정하십시오.',
    instructionVi: 'Hãy đo chính xác đường kính ngoài của trục trụ kim loại.',
    color: '#64748b',
    widthMm: 24.35,
    heightMm: 48.00,
    features: {
      outerDiameter: 24.35,
    },
  },
  {
    id: 'pipe-inner-18-50',
    nameVi: 'Ống thép · Đường kính trong',
    nameKo: '강관 내경',
    koreanPronunciation: 'gang-gwan nae-gyeong',
    category: 'tubing',
    measureType: 'inner',
    targetValueMm: 18.50,
    toleranceMm: 0.05,
    description: 'Sử dụng 2 mỏ kẹp phía trên (mỏ đo trong) đưa vào lòng ống để đo đường kính trong.',
    instructionKo: '내경 측정 턱을 이용하여 파이프의 내경을 측정하세요.',
    instructionVi: 'Dùng mỏ kẹp trong phía trên để đo đường kính lòng ống rỗng.',
    color: '#475569',
    widthMm: 28.00,
    heightMm: 45.00,
    features: {
      outerDiameter: 28.00,
      innerDiameter: 18.50,
    },
  },
  {
    id: 'ball-bearing-inner-15-00',
    nameVi: 'Vòng bi · Đường kính trong',
    nameKo: '베어링 내경',
    koreanPronunciation: 'be-eo-ring nae-gyeong',
    category: 'mechanical',
    measureType: 'inner',
    targetValueMm: 15.00,
    toleranceMm: 0.05,
    description: 'Đo đường kính trong của vòng bi bạc đạn công nghiệp.',
    instructionKo: '베어링 안쪽 지름(내경)을 측정하십시오.',
    instructionVi: 'Hãy đo đường kính lỗ trong của vòng bi.',
    color: '#cbd5e1',
    widthMm: 35.00,
    heightMm: 35.00,
    features: {
      outerDiameter: 35.00,
      innerDiameter: 15.00,
    },
  },
  {
    id: 'stepped-depth-shaft-14-80',
    nameVi: 'Lỗ khoan · Chiều sâu',
    nameKo: '단차 가공물 깊이',
    koreanPronunciation: 'dan-cha ga-gong-mul gip-i',
    category: 'mechanical',
    measureType: 'depth',
    targetValueMm: 14.80,
    toleranceMm: 0.05,
    description: 'Thọc thanh đo sâu (Depth Rod) ở đuôi thước kẹp vào đáy lỗ để đo chiều sâu.',
    instructionKo: '깊이 측정 바를 홀 바닥에 대고 깊이를 측정하세요.',
    instructionVi: 'Hãy dùng thanh đo sâu ở đuôi thước để đo độ sâu của lỗ khoan.',
    color: '#64748b',
    widthMm: 30.00,
    heightMm: 40.00,
    features: {
      outerDiameter: 30.00,
      depth: 14.80,
    },
  },
  {
    id: 'gauge-block-15-00',
    nameVi: 'Khối căn · Độ dày',
    nameKo: '게이지 블록',
    koreanPronunciation: 'ge-i-ji beul-lok',
    category: 'gauge',
    measureType: 'outer',
    targetValueMm: 15.00,
    toleranceMm: 0.05,
    description: 'Khối căn mẫu thép mài siêu phẳng dùng để hiệu chuẩn và kiểm tra thước kẹp.',
    instructionKo: '게이지 블록의 두께를 측정하여 영점을 확인하세요.',
    instructionVi: 'Hãy đo độ dày của căn mẫu kiểm định độ chuẩn xác của thước.',
    color: '#94a3b8',
    widthMm: 15.00,
    heightMm: 35.00,
    features: {
      outerDiameter: 15.00,
    },
  },
  {
    id: 'u-slot-bracket-21-65',
    nameVi: 'Phôi chữ U · Rộng rãnh',
    nameKo: 'U홈 브래킷',
    koreanPronunciation: 'yu-hom beu-rae-kit',
    category: 'mechanical',
    measureType: 'inner',
    targetValueMm: 21.65,
    toleranceMm: 0.05,
    description: 'Đo khoảng cách giữa 2 má trong của phôi rãnh chữ U.',
    instructionKo: 'U홈 가공물의 내부 폭을 측정하십시오.',
    instructionVi: 'Hãy đo khoảng cách độ rộng bên trong của rãnh chữ U.',
    color: '#71717a',
    widthMm: 36.00,
    heightMm: 30.00,
    features: {
      innerDiameter: 21.65,
    },
  },
  {
    id: 'flange-thickness-8-25',
    nameVi: 'Mặt bích · Độ dày',
    nameKo: '플랜지 두께',
    koreanPronunciation: 'peul-raen-ji du-kke',
    category: 'mechanical',
    measureType: 'outer',
    targetValueMm: 8.25,
    toleranceMm: 0.05,
    description: 'Đo độ dày của thành vành gờ kim loại.',
    instructionKo: '플랜지 림의 두께를 측정하십시오.',
    instructionVi: 'Hãy đo độ dày của gờ viền mặt bích kim loại.',
    color: '#6b7280',
    widthMm: 8.25,
    heightMm: 40.00,
    features: {
      outerDiameter: 40.00,
      innerDiameter: 10.00,
      flangeThickness: 8.25,
    },
  },
  {
    id: 'bolt-length',
    nameVi: 'Bu-lông · Chiều dài',
    nameKo: '육각 볼트 길이',
    koreanPronunciation: 'yuk-gak bol-teu gil-i',
    category: 'fastener',
    geometry: 'bolt-length',
    measureType: 'outer',
    targetValueMm: 55.00,
    toleranceMm: 0.05,
    description: 'Đo chiều dài toàn bộ bu-lông đặt ngang giữa hai mỏ kẹp ngoài.',
    instructionKo: '육각 볼트의 전체 길이를 측정하세요.',
    instructionVi: 'Kẹp từ mặt ngoài đầu bu-lông đến đầu mút thân ren.',
    color: '#94a3b8',
    widthMm: 20.00,
    heightMm: 55.00,
    features: { outerDiameter: 12.00, boltShaftDiameter: 12.00, boltLength: 55.00, boltHeadWidth: 20.00, boltHeadHeight: 7.00 },
  },
  {
    id: 'flange-outer',
    nameVi: 'Mặt bích · Đường kính ngoài',
    nameKo: '플랜지 외경',
    koreanPronunciation: 'peul-raen-ji oe-gyeong',
    category: 'mechanical',
    geometry: 'flange-outer',
    measureType: 'outer',
    targetValueMm: 76.00,
    toleranceMm: 0.05,
    description: 'Đo đường kính ngoài của vành mặt bích bằng hai mỏ kẹp ngoài.',
    instructionKo: '플랜지의 바깥 지름을 측정하세요.',
    instructionVi: 'Kẹp hai mép ngoài đối diện của mặt bích.',
    color: '#94a3b8',
    widthMm: 76.00,
    heightMm: 76.00,
    features: { outerDiameter: 76.00, innerDiameter: 28.00, flangeThickness: 8.00 },
  },
  {
    id: 'flange-inner',
    nameVi: 'Mặt bích · Đường kính trong',
    nameKo: '플랜지 내경',
    koreanPronunciation: 'peul-raen-ji nae-gyeong',
    category: 'mechanical',
    geometry: 'flange-inner',
    measureType: 'inner',
    targetValueMm: 28.00,
    toleranceMm: 0.05,
    description: 'Đo đường kính lỗ tâm mặt bích bằng hai mỏ kẹp trong.',
    instructionKo: '플랜지의 안쪽 지름을 측정하세요.',
    instructionVi: 'Mở hai mỏ kẹp trong để chạm hai thành đối diện của lỗ mặt bích.',
    color: '#94a3b8',
    widthMm: 76.00,
    heightMm: 76.00,
    features: { outerDiameter: 76.00, innerDiameter: 28.00, flangeThickness: 8.00 },
  },
  {
    id: 'pipe-outer',
    nameVi: 'Ống thép · Đường kính ngoài',
    nameKo: '강관 외경',
    koreanPronunciation: 'gang-gwan oe-gyeong',
    category: 'tubing',
    geometry: 'pipe-outer',
    measureType: 'outer',
    targetValueMm: 32.00,
    toleranceMm: 0.05,
    description: 'Đo đường kính ngoài của ống thép rỗng bằng hai mỏ kẹp ngoài.',
    instructionKo: '파이프의 바깥 지름을 측정하세요.',
    instructionVi: 'Kẹp hai mặt ngoài đối diện của thành ống.',
    color: '#64748b',
    widthMm: 32.00,
    heightMm: 38.00,
    features: { outerDiameter: 32.00, innerDiameter: 22.00 },
  },
  {
    id: 'bearing-outer',
    nameVi: 'Vòng bi · Đường kính ngoài',
    nameKo: '베어링 외경',
    koreanPronunciation: 'be-eo-ring oe-gyeong',
    category: 'mechanical',
    geometry: 'bearing-outer',
    measureType: 'outer',
    targetValueMm: 42.00,
    toleranceMm: 0.05,
    description: 'Đo đường kính vòng ngoài của vòng bi bằng hai mỏ kẹp ngoài.',
    instructionKo: '베어링의 바깥 지름을 측정하세요.',
    instructionVi: 'Kẹp hai mép đối diện của vòng ngoài vòng bi.',
    color: '#cbd5e1',
    widthMm: 42.00,
    heightMm: 10.00,
    features: { outerDiameter: 42.00, innerDiameter: 20.00 },
  },
]

