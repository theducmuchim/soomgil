import type { KmaIndexResponse, VilageFcstResponse, WthrWrnResponse } from '@/lib/api/types';
import type { WeatherWarning } from '@/types';

/**
 * 기상청 응답 → 값 추출
 *
 * 지수류는 h0(기준시각) 값을 현재값으로 본다.
 * 발표 직후에는 h0가 비어 있고 h3부터 오는 경우가 있어서, 가장 이른 유효값을 찾는다.
 */
export function parseIndexValue(res: KmaIndexResponse): number | null {
  const item = res.response?.body?.items?.item?.[0];
  if (!item) return null;

  for (let h = 0; h <= 72; h += 3) {
    const raw = item[`h${h}`];
    if (raw === undefined || raw === '' || raw === null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** 지수류의 시간대별 값 전체 (통계 화면용) */
export function parseIndexSeries(res: KmaIndexResponse): { hour: number; value: number }[] {
  const item = res.response?.body?.items?.item?.[0];
  if (!item) return [];

  const out: { hour: number; value: number }[] = [];
  for (let h = 0; h <= 72; h += 3) {
    const n = Number(item[`h${h}`]);
    if (Number.isFinite(n)) out.push({ hour: h, value: n });
  }
  return out;
}

export interface ForecastValues {
  /** 기온 ℃ */
  tempC: number;
  /** 상대습도 % */
  humidity: number;
  /** 풍속 m/s */
  windMs: number;
  /** 풍향 도 */
  windDeg: number;
}

/**
 * 단기예보 → 현재 시각에 가장 가까운 예보 1건.
 *
 * 응답은 category가 뒤섞인 평평한 배열이라 (fcstDate+fcstTime) 기준으로 가장 이른 건만 골라
 * category별로 흩어진 값을 한 객체로 합친다.
 */
export function parseVilageFcst(res: VilageFcstResponse): ForecastValues | null {
  const items = res.response?.body?.items?.item ?? [];
  if (items.length === 0) return null;

  const earliest = items
    .map((i) => `${i.fcstDate}${i.fcstTime}`)
    .sort()[0];

  const picked = items.filter((i) => `${i.fcstDate}${i.fcstTime}` === earliest);
  const get = (category: string): number | null => {
    const hit = picked.find((i) => i.category === category);
    if (!hit) return null;
    const n = Number(hit.fcstValue);
    return Number.isFinite(n) ? n : null;
  };

  const tempC = get('TMP');
  if (tempC === null) return null;

  return {
    tempC,
    humidity: get('REH') ?? 50,
    windMs: get('WSD') ?? 0,
    windDeg: get('VEC') ?? 0,
  };
}

/**
 * 기상특보 목록 → 대전에 해당하는 특보만.
 *
 * title은 '대전, 세종, 충남 폭염경보' 처럼 지역과 종류가 한 문자열에 붙어 온다.
 * 별도 코드 필드가 없어서 제목 문자열로 판정한다.
 */
export function parseWarnings(res: WthrWrnResponse): WeatherWarning[] {
  const items = res.response?.body?.items?.item ?? [];

  const KIND: { keyword: string; type: WeatherWarning['type'] }[] = [
    { keyword: '폭염', type: 'heat' },
    { keyword: '한파', type: 'cold' },
    { keyword: '황사', type: 'dust' },
    { keyword: '미세먼지', type: 'dust' },
    { keyword: '오존', type: 'ozone' },
  ];

  const out: WeatherWarning[] = [];
  for (const item of items) {
    const title = item.title ?? '';
    if (!title.includes('대전')) continue;

    const kind = KIND.find((k) => title.includes(k.keyword));
    if (!kind) continue;

    // '경보'가 '주의보'보다 강하므로 먼저 본다
    const grade: WeatherWarning['grade'] = title.includes('경보') ? '경보' : '주의보';

    out.push({ type: kind.type, grade, title, issuedAt: tmFcToIso(item.tmFc) });
  }
  return out;
}

/** 'YYYYMMDDHHmm' → ISO 8601 (KST) */
function tmFcToIso(tmFc: string): string {
  if (!tmFc || tmFc.length < 12) return new Date().toISOString();
  const [y, mo, d, h, mi] = [
    tmFc.slice(0, 4),
    tmFc.slice(4, 6),
    tmFc.slice(6, 8),
    tmFc.slice(8, 10),
    tmFc.slice(10, 12),
  ];
  return `${y}-${mo}-${d}T${h}:${mi}:00+09:00`;
}
