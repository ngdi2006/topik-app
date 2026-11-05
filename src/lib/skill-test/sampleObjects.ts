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
  geometry?: 'bolt-width' | 'bolt-length' | 'flange-inner' | 'flange-outer'
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
    nameVi: 'Bu-lông lục giác M12',
    nameKo: '육각 볼트 M12',
    koreanPronunciation: 'yuk-gak bol-teu',
    category: 'fastener',
    measureType: 'outer',
    targetValueMm: 12.00,
    toleranceMm: 0.05,
    description: 'Đo đường kính ngoài thân ren của bu-lông lục giác bằng mỏ kẹp ngoài.',
    instructionKo: '버니어 캘리퍼스로 육각 볼트의 외경을 측정하세요.',
    instructionVi: 'Hãy dùng mỏ kẹp ngoài để đo đường kính ngoài của bu-lông.',
    color: '#94a3b8',
    widthMm: 12.00,
    heightMm: 55.00,
    features: {
      outerDiameter: 12.00,
    },
  },
  {
    id: 'steel-cylinder-24-35',
    nameVi: 'Trục thép trụ tròn gia công',
    nameKo: '원형 환봉',
    koreanPronunciation: 'won-hyeong hwan-bong',
    category: 'mechanical',
    measureType: 'outer',
    targetValueMm: 24.35,
    toleranceMm: 0.05,
    description: 'Phôi tiện tròn cơ khí đòi hỏi độ chính xác vạch du xích 0.05mm.',
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
    nameVi: 'Ống thép tròn rỗng (Đo đường kính trong)',
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
    nameVi: 'Vòng bi bạc đạn (Lỗ cốt trục)',
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
    nameVi: 'Trục có lỗ khoan (Đo chiều sâu)',
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
    nameVi: 'Căn mẫu chuẩn 15.00 mm',
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
    nameVi: 'Phôi thép chữ U (Rãnh phay)',
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
    nameVi: 'Mặt bích ren (Độ dày vành gờ)',
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
      outerDiameter: 8.25,
    },
  },
]

