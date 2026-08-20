/**
 * 체감온도 산출
 *
 * ⚠ 왜 직접 계산하는가
 * 기상청 생활기상지수의 "체감온도(대상·환경별)" 세부 지수는 2026-05-01 자로
 * 서비스가 종료되었다. 그리고 단기예보(VilageFcstInfoService_2.0)는 체감온도를
 * 직접 주지 않고 TMP(기온) · REH(습도) · WSD(풍속)까지만 준다.
 * 따라서 체감온도는 이 파일에서 직접 산출한다.
 *
 * 이 값이 자체 산출값이라는 사실은 /guide 의 데이터 출처란에 명시한다.
 * 기상청 공식 발표 체감온도와 소수점 단위로 다를 수 있다.
 *
 * 산출식
 *  - 여름(기온 ≥ 25℃) : 기상청 여름철 체감온도(열지수 기반) 근사식, 기온·습도 사용
 *  - 겨울(기온 ≤ 10℃ 그리고 풍속 ≥ 1.3m/s) : 기상청 겨울철 체감온도(풍속냉각지수), 기온·풍속 사용
 *  - 그 밖의 구간 : 보정 없이 기온을 그대로 쓴다
 */

export interface ApparentTempInput {
  /** 기온 (℃) — 단기예보 TMP */
  tempC: number;
  /** 상대습도 (%) — 단기예보 REH */
  humidity: number;
  /** 풍속 (m/s) — 단기예보 WSD */
  windMs: number;
}

/**
 * 여름철 체감온도 (기상청 열지수 기반 근사식)
 * Tw = 습구온도. 기온과 습도로 Stull 근사식을 써서 구한다.
 */
export function summerApparentTemp(tempC: number, humidity: number): number {
  const rh = clamp(humidity, 1, 100);

  // Stull(2011) 습구온도 근사식
  const tw =
    tempC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(tempC + rh) -
    Math.atan(rh - 1.67633) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;

  // 기상청 여름철 체감온도 공식
  return (
    -0.2442 +
    0.55399 * tw +
    0.45535 * tempC -
    0.0022 * tw * tw +
    0.00278 * tw * tempC +
    3.0
  );
}

/**
 * 겨울철 체감온도 (기상청 풍속냉각지수)
 * 풍속은 m/s 로 받아 km/h 로 바꿔 쓴다.
 */
export function winterApparentTemp(tempC: number, windMs: number): number {
  const vKmh = windMs * 3.6;
  // 풍속 4.8km/h 미만이면 공식 적용 범위 밖이라 기온을 그대로 쓴다
  if (vKmh < 4.8) return tempC;

  const v016 = Math.pow(vKmh, 0.16);
  return 13.12 + 0.6215 * tempC - 11.37 * v016 + 0.3965 * tempC * v016;
}

/**
 * 계절 구분 없이 알아서 적절한 식을 고른다.
 * 여름/겨울 지표 양쪽에서 같은 함수를 쓸 수 있게 하나로 묶어둔 진입점.
 */
export function apparentTemp({ tempC, humidity, windMs }: ApparentTempInput): number {
  if (tempC >= 25) return round1(summerApparentTemp(tempC, humidity));
  if (tempC <= 10) return round1(winterApparentTemp(tempC, windMs));
  return round1(tempC);
}

/**
 * 특보 보정.
 *
 * 산출식이 실제 특보 발효 상황을 못 따라가는 경우가 있어서,
 * 폭염·한파 특보가 떠 있으면 체감온도를 특보 기준선까지 끌어올린다/내린다.
 *  - 폭염주의보 33℃ / 폭염경보 35℃
 *  - 한파주의보 -12℃ / 한파경보 -15℃
 * 이미 기준선을 넘긴 값이면 건드리지 않는다.
 */
export function applyWarningFloor(
  value: number,
  kind: 'heat' | 'cold',
  grade: '주의보' | '경보' | null,
): number {
  if (!grade) return value;

  if (kind === 'heat') {
    const floor = grade === '경보' ? 35 : 33;
    return Math.max(value, floor);
  }
  const ceil = grade === '경보' ? -15 : -12;
  return Math.min(value, ceil);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function round1(v: number) {
  return Math.round(v * 10) / 10;
}
