import type { RiskLevel } from '@/types';
import { RISK_LEVELS } from '@/config/indicators';

/**
 * 점수(0~100) → 연속 색상.
 *
 * 4단계 등급 색만 쓰면 같은 등급 안에서는 전부 같은 색이 된다.
 * 봄·가을처럼 황사나 미세먼지가 시 전역에 깔리는 날은 5개 구가 모두 '높음'이라
 * 지도가 통째로 한 색이 되어 어디가 더 나쁜지 안 보인다.
 *
 * 그래서 등급 색을 각 구간의 중앙(12.5 / 37.5 / 62.5 / 87.5)에 고정하고
 * 그 사이를 보간한다. 등급 경계는 그대로 유지되면서 같은 등급 안에서도
 * 상대적인 차이가 색으로 드러난다.
 */
const ANCHORS: { at: number; color: string }[] = [
  { at: 0, color: RISK_LEVELS.low.color },
  { at: 12.5, color: RISK_LEVELS.low.color },
  { at: 37.5, color: RISK_LEVELS.moderate.color },
  { at: 62.5, color: RISK_LEVELS.high.color },
  { at: 87.5, color: RISK_LEVELS.veryHigh.color },
  { at: 100, color: RISK_LEVELS.veryHigh.color },
];

export function scoreColor(score: number): string {
  const s = clamp(score, 0, 100);

  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const a = ANCHORS[i];
    const b = ANCHORS[i + 1];
    if (s >= a.at && s <= b.at) {
      const span = b.at - a.at;
      const t = span === 0 ? 0 : (s - a.at) / span;
      return mix(a.color, b.color, t);
    }
  }
  return ANCHORS[ANCHORS.length - 1].color;
}

/** 색 위에 올릴 글자색 — 배경이 밝으면 어두운 글자를 쓴다 */
export function readableTextOn(hex: string): string {
  const { r, g, b } = parseHex(hex);
  // ITU-R BT.601 상대 휘도
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#14181d' : '#ffffff';
}

/** 등급 색 (단색이 필요한 자리 — 범례, 배지) */
export function levelColor(level: RiskLevel): string {
  return RISK_LEVELS[level].color;
}

function mix(from: string, to: string, t: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * t);
  return rgbToHex(ch(a.r, b.r), ch(a.g, b.g), ch(a.b, b.b));
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
