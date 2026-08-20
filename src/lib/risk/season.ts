import type { IndicatorId, Season } from '@/types';
import { SEASONS } from '@/config/seasons';
import { INDICATORS } from '@/config/indicators';
import { kstParts } from '@/lib/utils/time';

/**
 * 지금이 어느 계절인지 판정한다.
 *
 * 서버(UTC)와 사용자(KST)의 날짜가 갈리는 사고를 막으려고 반드시 KST 기준으로 본다.
 * override는 시연용 — mock 모드에서 ?season=winter 로 계절을 강제할 때만 쓴다.
 */
export function resolveSeason(date: Date = new Date(), override?: Season | null): Season {
  if (override && override in SEASONS) return override;

  const { month } = kstParts(date);
  const found = (Object.keys(SEASONS) as Season[]).find((s) =>
    SEASONS[s].months.includes(month),
  );
  // months 배열이 1~12를 빠짐없이 덮으므로 여기 도달하지 않는다
  return found ?? 'spring';
}

/** 문자열이 유효한 계절인지 (쿼리스트링 검증용) */
export function parseSeason(value: string | null | undefined): Season | null {
  return value && value in SEASONS ? (value as Season) : null;
}

/** 해당 월에 이 지표가 실제로 제공되는지 (serviceMonths 기준) */
export function isIndicatorAvailable(id: IndicatorId, month: number): boolean {
  const months = INDICATORS[id].serviceMonths;
  return months === null || months.includes(month);
}

/**
 * 이번 계절에 화면에 노출할 지표 목록.
 *
 * 계절 가중치에 들어 있는 핵심 지표 + carryOver 지표를 합치되,
 * 서비스 기간이 지난 지표는 빼고 돌려준다.
 * 예: 6월(여름)이면 폭염·오존·초미세먼지 + 소나무·참나무 꽃가루,
 *     7월이면 꽃가루 서비스 기간(3~6월)이 끝나서 폭염·오존·초미세먼지만 남는다.
 */
export function getActiveIndicators(season: Season, month: number): IndicatorId[] {
  const meta = SEASONS[season];
  const primary = (Object.keys(meta.weights) as IndicatorId[]).filter((id) =>
    isIndicatorAvailable(id, month),
  );
  const carried = meta.carryOver.filter(
    (id) => isIndicatorAvailable(id, month) && !primary.includes(id),
  );
  return [...primary, ...carried];
}

/**
 * 점수 계산에 쓸 가중치.
 *
 * 서비스 기간이 끝난 지표를 빼고 나면 가중치 합이 1보다 작아지므로,
 * 남은 지표들로 다시 정규화해서 합이 항상 1이 되게 만든다.
 * 이렇게 안 하면 예를 들어 12월에 꽃가루가 빠지면서 점수가 통째로 낮게 나온다.
 *
 * carryOver 지표는 "덤"이라 가중치 0으로 둔다 — 화면에는 보이되 점수는 흔들지 않는다.
 */
export function getSeasonWeights(
  season: Season,
  month: number,
): Partial<Record<IndicatorId, number>> {
  const raw = SEASONS[season].weights;
  const usable = (Object.keys(raw) as IndicatorId[]).filter((id) =>
    isIndicatorAvailable(id, month),
  );

  const total = usable.reduce((sum, id) => sum + (raw[id] ?? 0), 0);
  if (total === 0) return {};

  const out: Partial<Record<IndicatorId, number>> = {};
  for (const id of usable) out[id] = (raw[id] ?? 0) / total;
  return out;
}

/**
 * 이번 달에 데이터를 받을 수 있는 지표 전체.
 *
 * getActiveIndicators()는 "이번 계절의 핵심 지표"만 돌려준다. 그것만 스냅샷에 담으면
 * 레이어 지도에서 봄에 오존을 못 보는 문제가 생긴다. 오존·미세먼지·체감온도는
 * 연중 제공되는 데이터인데 계절 핵심이 아니라는 이유로 빠지기 때문이다.
 *
 * 중요한 점은 이 지표들이 **추가 API 호출 없이** 얻어진다는 것이다.
 *  - 미세먼지·초미세먼지·오존·황사 : 에어코리아 실시간 1회 호출에 전부 들어 있다
 *  - 체감온도(폭염·한파)          : 단기예보 응답의 기온·습도·풍속으로 산출한다
 *  - 꽃가루                       : serviceMonths로 이미 걸러지므로 기간 밖이면 안 부른다
 *
 * 그래서 스냅샷에는 받을 수 있는 지표를 전부 담고, 점수 계산에만 계절 가중치를 쓴다.
 */
export function getAvailableIndicators(month: number): IndicatorId[] {
  return (Object.keys(INDICATORS) as IndicatorId[]).filter(
    (id) => id !== 'stagnation' && isIndicatorAvailable(id, month),
  );
}

/** 계절 메타 재수출 — 화면에서 SEASONS를 직접 import하지 않아도 되게 */
export function getSeasonMeta(season: Season) {
  return SEASONS[season];
}
