import { DATA_MODE, KMA_APIHUB_KEY, SERVICE_KEY } from '@/lib/env';

/**
 * 공공데이터 API 호출 계층.
 *
 * ── 이 파일이 존재하는 이유 ─────────────────────────────
 * 화면 코드는 데이터가 mock인지 실제 API인지 전혀 몰라야 한다.
 * mock/live 분기는 오직 여기 한 곳에만 있고, 나머지 코드는
 * "정규화된 도메인 객체"만 다룬다.
 *
 * live 전환 시 할 일은 .env.local 에
 *   NEXT_PUBLIC_DATA_MODE=live
 *   DATA_GO_KR_SERVICE_KEY=<발급받은 Decoding 키>
 * 두 줄을 채우는 것뿐이다. 코드는 건드리지 않는다.
 * ────────────────────────────────────────────────────
 */

/**
 * 인증 방식.
 *
 * dataGoKr : 공공데이터포털 — serviceKey 파라미터
 * apiHub   : 기상청 API허브 — authKey 파라미터, 호스트도 다르다
 */
export type AuthKind = 'dataGoKr' | 'apiHub';

export interface CallOptions<T> {
  /** 오류 메시지에 찍을 이름 */
  name: string;
  endpoint: string;
  params: Record<string, string | number>;
  /** 기본값 dataGoKr */
  auth?: AuthKind;
  /** 서버 캐시 유지 시간(초) — lib/env.ts 의 CACHE_TTL 사용 */
  revalidate: number;
  /** mock 모드에서 쓸 가짜 응답 */
  mock: () => T;
}

/**
 * live 호출이 실패했을 때 mock으로 떨어질지 여부.
 *
 * 심사 발표 중에 공공데이터 서버가 죽거나 트래픽 한도를 넘겨도
 * 화면이 통째로 빈 채로 남지 않게 한다. 대신 콘솔에 반드시 경고를 남긴다.
 */
const FALLBACK_TO_MOCK_ON_ERROR = true;

export async function callPublicApi<T>(options: CallOptions<T>): Promise<T> {
  if (DATA_MODE === 'mock') return options.mock();

  try {
    return await fetchLive<T>(options);
  } catch (error) {
    if (!FALLBACK_TO_MOCK_ON_ERROR) throw error;
    console.warn(
      `[soomgil] ${options.name} 실 API 호출 실패 — 예시 데이터로 대체합니다.`,
      error,
    );
    return options.mock();
  }
}

async function fetchLive<T>({
  name,
  endpoint,
  params,
  revalidate,
  auth = 'dataGoKr',
}: CallOptions<T>): Promise<T> {
  const url = new URL(endpoint);

  // 인증 파라미터 이름이 제공처마다 다르다.
  // 키는 Decoding 값을 넣고 URLSearchParams가 한 번만 인코딩하게 둔다.
  if (auth === 'apiHub') {
    if (!KMA_APIHUB_KEY) throw new Error(`${name}: KMA_APIHUB_KEY 미설정`);
    url.searchParams.set('authKey', KMA_APIHUB_KEY);
  } else {
    if (!SERVICE_KEY) throw new Error(`${name}: DATA_GO_KR_SERVICE_KEY 미설정`);
    url.searchParams.set('serviceKey', SERVICE_KEY);
  }
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    next: { revalidate },
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`${name}: HTTP ${res.status}`);
  }

  const text = await res.text();

  // 인증키 오류·트래픽 초과 시 공공데이터포털은 JSON이 아니라 XML 에러를 돌려준다.
  // 그대로 JSON.parse 하면 알아보기 힘든 파싱 에러가 나므로 여기서 잡아준다.
  if (text.trimStart().startsWith('<')) {
    const reason = text.match(/<returnAuthMsg>(.*?)<\/returnAuthMsg>/)?.[1] ?? 'XML 오류 응답';
    throw new Error(`${name}: ${reason}`);
  }

  const json = JSON.parse(text) as T;
  assertResultCode(name, json);
  return json;
}

/**
 * 공공데이터 API는 HTTP 200이어도 본문 resultCode로 실패를 알린다.
 *
 * 다만 코드 99는 오류가 아니다. 기상청 지수류는 서비스 기간이 아닐 때
 * "해당지수자료 제공기간이 아닙니다"를 99로 돌려준다. 예를 들어 8월에
 * 소나무 꽃가루를 부르면 99가 온다. 이건 정상적인 응답이므로 예외로 만들지 않고
 * 값 없음으로 흘려보낸다 — 그래야 예시 데이터로 잘못 대체되지 않는다.
 */
const OUT_OF_SEASON = '99';

function assertResultCode(name: string, json: unknown) {
  const header = (json as { response?: { header?: { resultCode?: string; resultMsg?: string } } })
    ?.response?.header;
  if (!header?.resultCode || header.resultCode === '00') return;
  if (header.resultCode === OUT_OF_SEASON) return;

  throw new Error(`${name}: [${header.resultCode}] ${header.resultMsg ?? '알 수 없는 오류'}`);
}
