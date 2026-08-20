import type { IndicatorId, RiskLevel } from '@/types';

export type Unit = 'µg/m³' | 'ppm' | '℃' | '지수' | 'm/s';

export interface IndicatorMeta {
  id: IndicatorId;
  /** 화면 표기명 */
  label: string;
  /** 카드·범례용 짧은 이름 */
  shortLabel: string;
  unit: Unit;
  /** 데이터 출처 표기 (푸터·출처 배지에 그대로 노출) */
  source: string;
  /**
   * 4단계 경계값. [보통 시작, 높음 시작, 매우높음 시작]
   * value < b[0] → low, < b[1] → moderate, < b[2] → high, 그 이상 veryHigh
   */
  breakpoints: [number, number, number];
  /** 정규화 상한 — 이 값을 100점으로 본다 */
  normalizeMax: number;
  /** 정규화 하한 — 이 값을 0점으로 본다. 생략하면 0. */
  normalizeMin?: number;
  /**
   * 서비스 제공 기간 (월). 이 밖의 달에는 available=false 로 내려간다.
   * null이면 연중 제공.
   */
  serviceMonths: number[] | null;
  /** 값이 낮을수록 위험한 지표(한파)면 true */
  inverted?: boolean;
  description: string;
}

/**
 * 지표 메타 정의.
 *
 * ⚠ 체감온도 관련 주의
 * 기상청 생활기상지수의 "체감온도(대상·환경별)" 세부 지수는 2026-05-01 자로
 * 서비스가 종료되었다. 따라서 heat/cold 지표는
 *   (1) 단기예보(VilageFcstInfoService_2.0)의 TMP·REH·WSD 로 체감온도를 산출하고
 *   (2) 기상특보 API(WthrWrnInfoService)의 폭염·한파 특보로 등급을 보정
 * 하는 2단 구조로 만든다. 산출식은 lib/risk/apparent-temp.ts 참조.
 */
export const INDICATORS: Record<IndicatorId, IndicatorMeta> = {
  pinePollen: {
    id: 'pinePollen',
    label: '소나무 꽃가루농도위험지수',
    shortLabel: '소나무 꽃가루',
    unit: '지수',
    source: '기상청 꽃가루농도위험지수',
    breakpoints: [1, 2, 3],
    // 지수는 0~3 이산값. max를 3으로 두면 마지막 구간 폭이 0이 되므로 4로 잡는다.
    normalizeMax: 4,
    serviceMonths: [3, 4, 5, 6], // 3월~6월 제공
    description: '소나무 꽃가루 확산 위험도. 3~6월에만 제공된다.',
  },
  oakPollen: {
    id: 'oakPollen',
    label: '참나무 꽃가루농도위험지수',
    shortLabel: '참나무 꽃가루',
    unit: '지수',
    source: '기상청 꽃가루농도위험지수',
    breakpoints: [1, 2, 3],
    // 지수는 0~3 이산값. max를 3으로 두면 마지막 구간 폭이 0이 되므로 4로 잡는다.
    normalizeMax: 4,
    serviceMonths: [3, 4, 5, 6], // 3월~6월 제공
    description: '참나무 꽃가루 확산 위험도. 알레르기성 비염의 봄철 주요 원인.',
  },
  weedPollen: {
    id: 'weedPollen',
    label: '잡초류 꽃가루농도위험지수',
    shortLabel: '잡초 꽃가루',
    unit: '지수',
    source: '기상청 꽃가루농도위험지수',
    breakpoints: [1, 2, 3],
    // 지수는 0~3 이산값. max를 3으로 두면 마지막 구간 폭이 0이 되므로 4로 잡는다.
    normalizeMax: 4,
    serviceMonths: [8, 9, 10], // 8월~10월 제공
    description: '돼지풀·환삼덩굴 등 잡초류 꽃가루. 가을철 주요 원인.',
  },
  pm10: {
    id: 'pm10',
    label: '미세먼지 (PM-10)',
    shortLabel: '미세먼지',
    unit: 'µg/m³',
    source: '에어코리아 대기오염정보',
    breakpoints: [31, 81, 151], // 환경부 4단계 기준
    normalizeMax: 200,
    serviceMonths: null,
    description: '지름 10µm 이하 먼지. 환경부 예보 기준 4단계.',
  },
  pm25: {
    id: 'pm25',
    label: '초미세먼지 (PM-2.5)',
    shortLabel: '초미세먼지',
    unit: 'µg/m³',
    source: '에어코리아 대기오염정보',
    breakpoints: [16, 36, 76],
    normalizeMax: 100,
    serviceMonths: null,
    description: '지름 2.5µm 이하 먼지. 폐포까지 침투해 호흡기 영향이 크다.',
  },
  ozone: {
    id: 'ozone',
    label: '오존 (O₃)',
    shortLabel: '오존',
    unit: 'ppm',
    source: '에어코리아 대기오염정보',
    breakpoints: [0.031, 0.091, 0.151],
    normalizeMax: 0.2,
    serviceMonths: null,
    description: '햇빛이 강한 여름 낮에 광화학 반응으로 생성된다.',
  },
  yellowDust: {
    id: 'yellowDust',
    label: '황사',
    shortLabel: '황사',
    unit: 'µg/m³',
    source: '에어코리아 · 기상청',
    breakpoints: [150, 300, 800], // 황사위기경보 관심/주의/경계 참고
    normalizeMax: 1000,
    serviceMonths: null,
    description: 'PM-10 급등으로 판정. 봄철과 겨울철에 주로 유입된다.',
  },
  heat: {
    id: 'heat',
    label: '체감온도 (고온)',
    shortLabel: '폭염',
    unit: '℃',
    source: '기상청 단기예보 + 기상특보',
    breakpoints: [31, 33, 35], // 폭염주의보 33 / 폭염경보 35
    normalizeMax: 40,
    normalizeMin: 20, // 체감 20℃ 이하는 폭염 위험 0으로 본다
    serviceMonths: null,
    description: '단기예보 기온·습도·풍속으로 산출한 체감온도. 폭염특보로 보정.',
  },
  cold: {
    id: 'cold',
    label: '체감온도 (저온)',
    shortLabel: '한파',
    unit: '℃',
    source: '기상청 단기예보 + 기상특보',
    breakpoints: [-10, -12, -15], // 한파주의보 -12 / 한파경보 -15
    normalizeMax: -20,
    normalizeMin: 5, // 체감 5℃ 이상은 한파 위험 0으로 본다
    serviceMonths: null,
    inverted: true,
    description: '풍속냉각지수 기반 체감온도. 한파특보로 보정.',
  },
  stagnation: {
    id: 'stagnation',
    label: '대기정체지수',
    shortLabel: '대기정체',
    unit: '지수',
    source: '기상청 생활기상지수 3.0',
    breakpoints: [51, 76, 91],
    normalizeMax: 100,
    serviceMonths: null,
    description:
      '분지 지형인 대전에서 오염물질이 빠져나가지 못하는 정도. 다른 지표의 보정계수로 쓴다.',
  },
};

/** 위험 등급 표기 */
export const RISK_LEVELS: Record<
  RiskLevel,
  { label: string; color: string; bg: string; border: string; text: string }
> = {
  low: {
    label: '낮음',
    color: '#1A9E5C',
    bg: 'bg-risk-low/10',
    border: 'border-risk-low/30',
    text: 'text-risk-low',
  },
  moderate: {
    label: '보통',
    color: '#E0A800',
    bg: 'bg-risk-moderate/10',
    border: 'border-risk-moderate/30',
    text: 'text-risk-moderate',
  },
  high: {
    label: '높음',
    color: '#E4692B',
    bg: 'bg-risk-high/10',
    border: 'border-risk-high/30',
    text: 'text-risk-high',
  },
  veryHigh: {
    label: '매우높음',
    color: '#A3132B',
    bg: 'bg-risk-very-high/10',
    border: 'border-risk-very-high/30',
    text: 'text-risk-very-high',
  },
};

export const RISK_LEVEL_ORDER: RiskLevel[] = ['low', 'moderate', 'high', 'veryHigh'];
