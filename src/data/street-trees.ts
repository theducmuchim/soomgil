/**
 * 대전 가로수길 — 소나무·참나무 구간.
 *
 * ── 출처 ────────────────────────────────────────────────
 * 공공데이터포털 "전국가로수길정보표준데이터"(data.go.kr/data/15021145)의
 * 컬럼 구조를 그대로 따른다.
 *   가로수길명 / 시작위경도 / 종료위경도 / 가로수종류 / 가로수수량 / 길이 / 도로명
 *
 * ⚠ 아래 데이터는 아직 **예시**다.
 * 실제 표준데이터를 받으면 loadStreetTrees() 만 파일 읽기로 바꾸면 되고,
 * 이 구조를 쓰는 tree-proximity.ts 는 손대지 않아도 된다.
 *
 * 실제 데이터로 교체하는 방법은 README 의 "가로수길 데이터" 항목 참조.
 *
 * ── 왜 선분인가 ─────────────────────────────────────────
 * 표준데이터가 가로수길을 "시작점 → 종료점" 한 쌍으로만 준다. 실제로는 도로를
 * 따라 굽어 있지만, 대전 시내 가로수길은 대부분 직선 도로 구간이라
 * 선분 근사로도 경로와의 근접 판정에는 충분하다.
 */

/** 꽃가루를 많이 내는 수종만 다룬다. 은행나무·플라타너스 등은 대상이 아니다 */
export type PollenTreeSpecies = '소나무' | '참나무';

export interface StreetTreeLine {
  id: string;
  /** 가로수길명 */
  name: string;
  /** 가로수종류 */
  species: PollenTreeSpecies;
  /** [위도, 경도] */
  start: [number, number];
  end: [number, number];
  /** 가로수수량 (그루) — 밀도가 높을수록 노출이 크다 */
  count: number;
  /** 도로명 */
  road: string;
}

/**
 * 예시 데이터.
 *
 * 대전에서 실제로 가로수가 늘어선 도로 구간에, 소나무·참나무가 심겼다고 가정해
 * 배치했다. 좌표는 해당 도로의 실제 구간을 따른다.
 */
export const STREET_TREE_LINES: StreetTreeLine[] = [
  {
    id: 'gyejoksan-road',
    name: '계족산 진입로 소나무길',
    species: '소나무',
    start: [36.3752, 127.4285],
    end: [36.3861, 127.4392],
    count: 320,
    road: '장동로',
  },
  {
    id: 'bomunsan-road',
    name: '보문산 순환로 참나무길',
    species: '참나무',
    start: [36.3062, 127.4118],
    end: [36.2971, 127.4265],
    count: 410,
    road: '보문산로',
  },
  {
    id: 'hanbat-arboretum',
    name: '한밭수목원 둘레 소나무길',
    species: '소나무',
    start: [36.3702, 127.3846],
    end: [36.3651, 127.3921],
    count: 260,
    road: '둔산대로',
  },
  {
    id: 'gapcheon-west',
    name: '갑천 서안 참나무길',
    species: '참나무',
    start: [36.3512, 127.3562],
    end: [36.3808, 127.3742],
    count: 520,
    road: '갑천도시고속화도로',
  },
  {
    id: 'cnu-daehak-ro',
    name: '충남대 대학로 소나무길',
    species: '소나무',
    start: [36.3618, 127.3448],
    end: [36.3701, 127.3489],
    count: 180,
    road: '대학로',
  },
  {
    id: 'expo-ro',
    name: '엑스포로 참나무길',
    species: '참나무',
    start: [36.3742, 127.3852],
    end: [36.3801, 127.3961],
    count: 240,
    road: '엑스포로',
  },
  {
    id: 'daecheong-lake',
    name: '대청호반 참나무길',
    species: '참나무',
    start: [36.4612, 127.4718],
    end: [36.4801, 127.4862],
    count: 680,
    road: '대청로',
  },
  {
    id: 'yuseong-oncheon-ro',
    name: '유성온천로 소나무길',
    species: '소나무',
    start: [36.3521, 127.3388],
    end: [36.3572, 127.3462],
    count: 150,
    road: '온천로',
  },
];

/**
 * 가로수길 목록을 돌려준다.
 *
 * TODO(live): 실제 표준데이터를 받으면 여기서 파일을 읽도록 바꾼다.
 * 대전 지역만 필터링하고 가로수종류가 소나무·참나무인 것만 남기면 된다.
 * 나머지 코드는 이 함수의 반환값만 보므로 바꿀 필요가 없다.
 */
export function loadStreetTrees(): StreetTreeLine[] {
  return STREET_TREE_LINES;
}

/** 이 데이터가 실제 관측인지 예시인지 — 화면에 밝히기 위해 쓴다 */
export const STREET_TREE_SOURCE: 'mock' | 'standard-data' = 'mock';
