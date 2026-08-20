/**
 * 숨쉬는길 도메인 타입
 *
 * 이 파일의 타입은 "정규화된" 데이터만 표현한다.
 * 공공데이터 API의 원본 응답 형태(response.body.items.item[] …)는
 * lib/api/*.ts 안에 각 파일 로컬 타입으로 두고, lib/normalize/*.ts 에서
 * 아래 타입으로 변환한다. 컴포넌트는 원본 형태를 절대 알지 못한다.
 */

/* ── 계절 ─────────────────────────────────────────────── */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/* ── 위험 등급 (기상청 4단계 체계에 맞춤) ─────────────────── */

export type RiskLevel = 'low' | 'moderate' | 'high' | 'veryHigh';

/* ── 위험 지표 ────────────────────────────────────────── */

export type IndicatorId =
  | 'pinePollen' // 소나무 꽃가루농도위험지수
  | 'oakPollen' // 참나무 꽃가루농도위험지수
  | 'weedPollen' // 잡초류 꽃가루농도위험지수
  | 'pm10' // 미세먼지
  | 'pm25' // 초미세먼지
  | 'ozone' // 오존
  | 'yellowDust' // 황사
  | 'heat' // 체감온도(고온) — 폭염특보 연동
  | 'cold' // 체감온도(저온) — 한파특보 연동
  | 'stagnation'; // 대기정체지수 (연중, 보정계수로 사용)

/** 지표 1개의 실측/예보값 1건 */
export interface IndicatorReading {
  id: IndicatorId;
  /** 원단위 값 (µg/m³, ppm, ℃, 지수 0~3 등 — indicators.ts의 unit 참조) */
  value: number;
  /** 0~100으로 정규화한 값. 위험도 합산은 항상 이 값으로 한다. */
  normalized: number;
  level: RiskLevel;
  /** 데이터를 만든 시각 (ISO 8601, KST) */
  observedAt: string;
  /** 해당 시점에 이 지표가 서비스 기간 밖이면 false */
  available: boolean;
}

/* ── 바람 ─────────────────────────────────────────────── */

export interface WindReading {
  /** 풍향 (도, 0=북 / 90=동 — 바람이 불어오는 방향) */
  degree: number;
  /** 풍속 (m/s) */
  speed: number;
  /** '북서', '남남동' 같은 한글 표기 */
  label: string;
}

/* ── 점수 분해 ─────────────────────────────────────────── */

/** 지표 하나가 종합 점수에 기여한 몫 */
export interface ScoreContribution {
  id: IndicatorId;
  /** 이번 계절에서의 가중치 (0~1) */
  weight: number;
  /** 지표의 0~100 정규화값 */
  normalized: number;
  /** weight × normalized — 보정 전 점수에 더해진 실제 점수 */
  points: number;
}

/**
 * 위험 점수 분해.
 *
 * 대기정체 보정을 최종 점수에만 녹이지 않고 단계별로 남긴다.
 * 화면에서 "대기정체로 위험도 +18% 상승" 을 그대로 그릴 수 있어야 하고,
 * 나중에 최종 점수에서 역산하면 100점 클램프 때문에 값이 틀어진다.
 */
export interface ScoreBreakdown {
  /** ① 보정 전 — 계절 가중치를 적용한 지표 가중합 (0~100) */
  baseScore: number;
  /** ② 보정계수 — 1.0이면 보정 없음, 1.18이면 18% 상승 */
  stagnationFactor: number;
  /** ③ 보정 후 — 최종 점수 (0~100, 클램프 적용) */
  score: number;
  /**
   * 보정으로 실제 오른 비율(%). 화면에 그대로 노출하는 값.
   * 클램프 이후 값으로 계산하므로 baseScore × factor 와 다를 수 있다.
   */
  stagnationDeltaPct: number;
  /** 지표별 기여도 — points 내림차순 */
  contributions: ScoreContribution[];
}

/* ── 지역 단위 위험도 ──────────────────────────────────── */

/** 자치구 5개 */
export type DistrictId = 'dong' | 'jung' | 'seo' | 'yuseong' | 'daedeok';

export interface District {
  id: DistrictId;
  name: string; // '유성구'
  /** 기상청 생활기상지수 areaNo */
  areaNo: string;
  /** 동네예보 격자 */
  grid: { nx: number; ny: number };
  /** 지도 라벨용 중심 좌표 */
  center: [number, number]; // [lat, lng]
}

export interface AreaRisk {
  /** 자치구 id 또는 행정동 코드 */
  areaId: string;
  areaName: string;
  /** 0~100 종합 위험 점수 = breakdown.score */
  score: number;
  level: RiskLevel;
  /** 보정 전 점수 · 보정계수 · 보정 후 점수 */
  breakdown: ScoreBreakdown;
  /** 이 지역의 점수를 가장 크게 끌어올린 지표 */
  dominantIndicator: IndicatorId;
  readings: IndicatorReading[];
  wind: WindReading;
}

/* ── 스냅샷 (모든 화면이 소비하는 최상위 객체) ───────────── */

export interface RiskSnapshot {
  /** 이 스냅샷 기준 시각 (ISO 8601, KST) */
  baseTime: string;
  season: Season;
  /** 이번 계절의 핵심 지표 (표시 우선순위 순) */
  primaryIndicators: IndicatorId[];
  /** 대전 전역 평균 (보정 전/후를 함께 들고 있다) */
  cityAverage: {
    score: number;
    level: RiskLevel;
    baseScore: number;
    stagnationDeltaPct: number;
  };
  districts: AreaRisk[];
  /** 대기정체지수 — 전 지역 공통 보정계수의 원본값 */
  stagnation: IndicatorReading;
  /** 발효 중인 기상특보 (폭염/한파/황사 등) */
  warnings: WeatherWarning[];
  /** 'mock' | 'live' — 화면 하단 출처 배지에 표시 */
  source: DataMode;
}

export interface WeatherWarning {
  type: 'heat' | 'cold' | 'dust' | 'ozone';
  /** '주의보' | '경보' */
  grade: '주의보' | '경보';
  title: string;
  issuedAt: string;
}

export type DataMode = 'mock' | 'live';

/* ── 경로 ─────────────────────────────────────────────── */

export interface RoutePoint {
  name: string;
  coord: [number, number];
}

/** 경로를 이루는 한 구간 (하나의 행정동을 통과) */
export interface RouteSegment {
  areaId: string;
  areaName: string;
  path: [number, number][];
  distanceM: number;
  durationSec: number;
  /** 이 구간의 지역 위험 점수 */
  areaScore: number;
  /** 풍향 보정 후 이 구간의 실효 위험 점수 */
  effectiveScore: number;
}

export type RouteKind = 'safest' | 'balanced' | 'fastest';

export interface RouteOption {
  id: string;
  kind: RouteKind;
  label: string; // '가장 안전한 길'
  segments: RouteSegment[];
  distanceM: number;
  durationSec: number;
  /** 노출량 가중평균 점수 0~100 */
  exposureScore: number;
  level: RiskLevel;
  /** 최단경로 대비 노출 증감률 (-32 = 32% 감소) */
  exposureDeltaPct: number;
}

export interface RouteResult {
  origin: RoutePoint;
  destination: RoutePoint;
  options: RouteOption[];
  baseTime: string;
  /**
   * 이 경로를 무엇으로 만들었는지.
   *  tmap : TMAP 보행자 경로 API — 실제 도로를 따라간다
   *  grid : 대전 전역 격자 위 A* — 앱키가 없거나 호출이 실패했을 때
   * 화면에 그대로 표시한다. 근사 경로를 실제 도로인 것처럼 보이면 안 된다.
   */
  engine: 'tmap' | 'grid';
}
