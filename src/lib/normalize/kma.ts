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

/**
 * 꽃가루농도위험지수 응답에서 오늘 값을 꺼낸다.
 *
 * ⚠ 다른 지수류와 응답 형식이 다르다.
 * 대기확산지수 같은 지수는 h0·h3·h6… 로 3시간 간격 예보를 주지만,
 * 꽃가루는 today · tomorrow · dayaftertomorrow · twodaysaftertomorrow 로
 * **하루 단위** 값을 준다. 같은 파서를 쓰면 아무 값도 못 찾는다.
 *
 * 값은 0~3 (낮음/보통/높음/매우높음).
 */
export function parsePollenValue(res: KmaIndexResponse): number | null {
  const item = res.response?.body?.items?.item?.[0];
  if (!item) return null;

  for (const key of ['today', 'tomorrow', 'dayaftertomorrow'] as const) {
    const raw = item[key];
    if (raw === undefined || raw === '' || raw === null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * 대기확산지수 → 대기정체지수로 뒤집는다.
 *
 * ⚠ 기상청이 주는 건 대기"확산"지수(getAirDiffusionIdx)다.
 * 값이 클수록 대기가 잘 확산돼 오염물질이 덜 쌓인다 = 안전하다.
 *
 * 이 서비스의 stagnation 지표는 반대 방향이다 — 클수록 정체가 심해 위험하다.
 * 그대로 쓰면 보정이 거꾸로 걸려서, 공기가 잘 빠지는 날 위험도가 올라간다.
 * 그래서 여기서 한 번만 뒤집고, 이후 코드는 전부 "정체" 방향으로만 다룬다.
 */
export function diffusionToStagnation(diffusion: number | null): number | null {
  if (diffusion === null) return null;
  return clamp(100 - diffusion, 0, 100);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
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
 * 기상특보 목록 → **지금 발효 중인** 특보만.
 *
 * ⚠ 응답은 "현재 상태"가 아니라 "발표/해제 이벤트 목록"이다.
 *
 *   [특보] 제08-26호 : 2026.08.19.10:00 / 폭염주의보 발표
 *   [특보] 제08-29호 : 2026.08.21.10:00 / 폭염주의보 해제
 *
 * 제목에 "폭염"이 들어 있다고 발효 중이라고 보면, 해제된 특보까지 발효 중으로
 * 잡아 체감온도에 없는 보정을 걸게 된다. 그래서 시간 순으로 이벤트를 재생해
 * 마지막 상태만 남긴다.
 *
 * stnId=133 은 대전지방기상청이라 대전·세종·충남 관할 특보만 돌아온다.
 * 제목에 지역명이 없는 것도 그 때문이다.
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

  /** 특보 종류+등급별 마지막 상태 */
  const state = new Map<string, { warning: WeatherWarning; active: boolean }>();

  // 오래된 것부터 재생해야 마지막 이벤트가 최종 상태가 된다
  const ordered = [...items].sort(
    (a, b) => Number(a.tmFc ?? 0) - Number(b.tmFc ?? 0),
  );

  for (const item of ordered) {
    const title = String(item.title ?? '');
    // '… / 폭염주의보 해제 (*)' 처럼 마지막 슬래시 뒤에 내용이 온다
    const body = title.includes('/') ? title.slice(title.lastIndexOf('/') + 1) : title;

    // 한 건에 여러 특보가 묶여 오기도 한다
    for (const part of body.split(/[,、]/)) {
      const kind = KIND.find((k) => part.includes(k.keyword));
      if (!kind) continue;

      // '경보'가 '주의보'보다 강하므로 먼저 본다
      const grade: WeatherWarning['grade'] = part.includes('경보') ? '경보' : '주의보';
      const released = part.includes('해제');

      const key = `${kind.type}:${grade}`;
      state.set(key, {
        active: !released,
        warning: {
          type: kind.type,
          grade,
          title: `대전 ${part.replace(/\(\*\)/g, '').trim()}`,
          issuedAt: tmFcToIso(String(item.tmFc ?? '')),
        },
      });
    }
  }

  return [...state.values()].filter((s) => s.active).map((s) => s.warning);
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
