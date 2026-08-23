/**
 * 시간 유틸 — 모든 시각 처리는 KST(UTC+9) 기준.
 *
 * Vercel 서버는 UTC로 돌기 때문에 new Date().getMonth() 를 그대로 쓰면
 * 한국 시간으로 3월 1일 오전인데 서버는 아직 2월로 판정하는 사고가 난다.
 * 계절 판정·API base_date 계산은 반드시 이 파일의 함수를 거칠 것.
 */

const KST_OFFSET_MIN = 9 * 60;

/** 주어진 시각(기본: 현재)의 KST 벽시계 값을 꺼낸다 */
export function kstParts(date: Date = new Date()) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  const kst = new Date(utcMs + KST_OFFSET_MIN * 60_000);
  return {
    year: kst.getFullYear(),
    month: kst.getMonth() + 1, // 1~12
    day: kst.getDate(),
    hour: kst.getHours(),
    minute: kst.getMinutes(),
    weekday: kst.getDay(), // 0=일
    date: kst,
  };
}

/** 'YYYYMMDD' — 공공데이터 API의 base_date 형식 */
export function kstYmd(date: Date = new Date()): string {
  const { year, month, day } = kstParts(date);
  return `${year}${pad(month)}${pad(day)}`;
}

/** 'YYYYMMDDHH' — 생활기상지수 API의 time 형식 */
export function kstYmdH(date: Date = new Date()): string {
  const { hour } = kstParts(date);
  return `${kstYmd(date)}${pad(hour)}`;
}

/**
 * 'YYYYMMDDHH'(KST) → Date. 형식이 아니면 null.
 *
 * 기상청 지수 API 는 발표 시각을 이 형태로 주고 h3·h6… 를 그로부터의 시간 오프셋으로
 * 준다. 시계열을 벽시계 시각에 맞추려면 되돌릴 수 있어야 한다.
 */
export function kstStampToDate(stamp: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})$/.exec(stamp.trim());
  if (!m) return null;
  const [, y, mo, d, h] = m;
  // KST(UTC+9) 벽시계 값이므로 9시간 빼면 UTC
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h) - 9));
}

/** '2026년 8월 20일 (목) 오후 3시' */
export function formatKstLong(iso: string): string {
  const { year, month, day, hour, weekday } = kstParts(new Date(iso));
  const w = ['일', '월', '화', '수', '목', '금', '토'][weekday];
  const ampm = hour < 12 ? '오전' : '오후';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${year}년 ${month}월 ${day}일 (${w}) ${ampm} ${h12}시`;
}

/** '8월 22일 오전 9시' — 기준 시각 표시용 (연도는 생략) */
export function formatKstStamp(iso: string): string {
  const { month, day, hour } = kstParts(new Date(iso));
  const ampm = hour < 12 ? '오전' : '오후';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${month}월 ${day}일 ${ampm} ${h12}시`;
}

/** '15:00' */
export function formatKstTime(iso: string): string {
  const { hour, minute } = kstParts(new Date(iso));
  return `${pad(hour)}:${pad(minute)}`;
}

/** '3분 전' */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffSec = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return '방금 전';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  return `${Math.floor(diffSec / 86400)}일 전`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
