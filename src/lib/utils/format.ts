/** 표시용 포맷터 */

/** 1250 → '1.3km', 640 → '640m' */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/** 1980 → '33분', 4500 → '1시간 15분', 40 → '1분 미만' */
export function formatDuration(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min < 1) return '1분 미만';
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

/**
 * -32 → '-32%', 8 → '+8%'
 *
 * 계산 결과라는 게 드러나야 하는 자리(대기정체 보정값 등)에는 decimals=1을 쓴다.
 * 정수로 반올림하면 "대충 잡은 숫자"처럼 읽힌다.
 */
export function formatDelta(pct: number, decimals = 0): string {
  const v = Number(pct.toFixed(decimals));
  const text = decimals > 0 ? v.toFixed(decimals) : String(Math.round(v));
  return v > 0 ? `+${text}%` : `${text}%`;
}

/** 지표 단위에 맞춰 값 표기 (오존은 소수 3자리) */
export function formatValue(value: number, unit: string): string {
  if (unit === 'ppm') return value.toFixed(3);
  if (unit === '℃') return `${value.toFixed(1)}℃`;
  if (unit === '지수') return value.toFixed(1);
  return `${Math.round(value)}`;
}

/** 0~100 점수를 정수 문자열로 */
export function formatScore(score: number): string {
  return String(Math.round(score));
}
