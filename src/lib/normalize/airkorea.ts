import type { AirkoreaRealtimeItem, AirkoreaResponse } from '@/lib/api/types';
import type { DistrictId } from '@/types';
import { DISTRICT_BY_STATION } from '@/data/stations';

export interface AirValues {
  pm10: number | null;
  pm25: number | null;
  ozone: number | null;
  /** 이 값을 만든 측정소 수 */
  stationCount: number;
  /** 측정 시각 */
  dataTime: string;
}

/**
 * 에어코리아 시도별 실시간 → 자치구별 평균.
 *
 * 같은 구에 측정소가 여러 개면 평균을 낸다.
 * 점검·통신 장애로 값이 '-' 나 빈 문자열로 오는 경우가 흔해서 그런 건 빼고 평균한다.
 */
export function parseRealtimeByDistrict(
  res: AirkoreaResponse<AirkoreaRealtimeItem>,
): Partial<Record<DistrictId, AirValues>> {
  const items = res.response?.body?.items ?? [];
  const buckets: Partial<Record<DistrictId, { pm10: number[]; pm25: number[]; o3: number[]; time: string }>> =
    {};

  for (const item of items) {
    const districtId = DISTRICT_BY_STATION[item.stationName];
    if (!districtId) continue; // 대전 밖이거나 매핑에 없는 측정소

    const bucket = (buckets[districtId] ??= { pm10: [], pm25: [], o3: [], time: item.dataTime });
    pushIfValid(bucket.pm10, item.pm10Value);
    pushIfValid(bucket.pm25, item.pm25Value);
    pushIfValid(bucket.o3, item.o3Value);
  }

  const out: Partial<Record<DistrictId, AirValues>> = {};
  for (const [id, b] of Object.entries(buckets)) {
    out[id as DistrictId] = {
      pm10: mean(b.pm10),
      pm25: mean(b.pm25),
      ozone: mean(b.o3),
      stationCount: Math.max(b.pm10.length, b.pm25.length, b.o3.length),
      dataTime: b.time,
    };
  }
  return out;
}

/** '-' · '' · 'null' 같은 결측 표기를 걸러낸다 */
function pushIfValid(arr: number[], raw: string | undefined) {
  if (raw === undefined || raw === '' || raw === '-') return;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) arr.push(n);
}

function mean(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
