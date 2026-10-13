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
 *   DATA_GO_KR_SERVICE_KEY=<발급받은 Decoding 키>
 * 한 줄을 채우는 것뿐이다. 코드는 건드리지 않는다 (lib/env.ts 참고).
 * ────────────────────────────────────────────────────
 */

/**
 * 실 호출이 예시 데이터로 대체됐을 때 그 사실을 모아 두는 곳.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────
 * 아래 폴백은 발표 중 공공데이터 서버가 죽어도 화면이 비지 않게 해 준다.
 * 그런데 지금까지는 그 사실이 콘솔에만 남았다. 화면은 여전히 '실시간'이라고
 * 적힌 채 시나리오 숫자를 보여줬다 — 데이터 출처를 밝히겠다는 이 서비스의
 * 약속을 정면으로 어기는 동작이다.
 *
 * 어느 소스가 대체됐는지 요청 단위로 모아 스냅샷에 실어 보낸다.
 */
export interface FallbackSink {
  record(name: string): void;
}

export function createFallbackSink(): FallbackSink & { names: string[] } {
  const names: string[] = [];
  return {
    names,
    record(name) {
      if (!names.includes(name)) names.push(name);
    },
  };
}

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
  /**
   * 이 호출만 예시 데이터를 쓰도록 강제한다.
   *
   * 오늘이 아닌 계절을 보는 중일 때 쓴다. 실데이터로는 다른 계절 값을
   * 받아올 수 없으므로 전역 모드와 무관하게 시나리오를 쓴다.
   */
  forceMock?: boolean;
  /**
   * 결과가 0건이면 실패로 본다.
   *
   * 특보처럼 "없음"이 정상인 소스에는 쓰지 않는다. 실시간 측정값처럼
   * 항상 무언가 와야 하는 소스에서, 0건이 곧 제공처 장애일 때만 켠다.
   */
  requireItems?: boolean;
  /** 서버 캐시 유지 시간(초) — lib/env.ts 의 CACHE_TTL 사용 */
  revalidate: number;
  /** mock 모드에서 쓸 가짜 응답 */
  mock: () => T;
  /** 실 호출이 실패해 예시 데이터로 대체되면 여기에 기록한다 */
  sink?: FallbackSink;
}

/**
 * live 호출이 실패했을 때 mock으로 떨어질지 여부.
 *
 * 심사 발표 중에 공공데이터 서버가 죽거나 트래픽 한도를 넘겨도
 * 화면이 통째로 빈 채로 남지 않게 한다. 대신 콘솔에 반드시 경고를 남긴다.
 */
const FALLBACK_TO_MOCK_ON_ERROR = true;

/**
 * 시도 한 번의 제한 시간.
 *
 * data.go.kr 은 가끔 응답 없이 매달린다. 제한이 없으면 소스 하나 때문에
 * 페이지 전체가 함수 실행 한도까지 멈춰 있다.
 */
const ATTEMPT_TIMEOUT_MS = 8000;

/** 잠시 뒤 다시 부르면 풀릴 수 있는 실패 — 한 번만 재시도한다 */
class TransientApiError extends Error {}

export async function callPublicApi<T>(options: CallOptions<T>): Promise<T> {
  if (options.forceMock || DATA_MODE === 'mock') return options.mock();

  try {
    return await fetchLive<T>(options);
  } catch (error) {
    if (!FALLBACK_TO_MOCK_ON_ERROR) throw error;
    console.warn(
      `[soomgil] ${options.name} 실 API 호출 실패 — 예시 데이터로 대체합니다.`,
      error,
    );
    // 화면이 '실시간'이라고 말하지 않도록 대체 사실을 남긴다
    options.sink?.record(options.name);
    return options.mock();
  }
}

async function fetchLive<T>(options: CallOptions<T>): Promise<T> {
  try {
    return await fetchOnce<T>(options, false);
  } catch (error) {
    // SERVICETIMEOUT_ERROR · 시간 초과 · 5xx 는 대부분 일시적이라 한 번 더 부른다
    if (!(error instanceof TransientApiError)) throw error;
    return fetchOnce<T>(options, true);
  }
}

async function fetchOnce<T>(
  { name, endpoint, params, revalidate, requireItems, auth = 'dataGoKr' }: CallOptions<T>,
  retry: boolean,
): Promise<T> {
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

  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate },
      // Next 의 fetch 캐시 키에는 헤더가 들어간다. 첫 시도의 오류 응답이
      // HTTP 200 으로 캐시돼 있어도, 재시도는 다른 키라 그걸 다시 읽지 않는다.
      headers: retry
        ? { Accept: 'application/json', 'X-Soomgil-Retry': '1' }
        : { Accept: 'application/json' },
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
  } catch (error) {
    const e = error as Error;
    const reason = e.name === 'TimeoutError' ? `${ATTEMPT_TIMEOUT_MS / 1000}초 시간 초과` : e.message;
    throw new TransientApiError(`${name}: ${reason}`);
  }

  if (res.status >= 500) throw new TransientApiError(`${name}: HTTP ${res.status}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);

  const text = await res.text();

  // 인증키 오류·트래픽 초과 시 공공데이터포털은 JSON이 아니라 XML 에러를 돌려준다.
  // 그대로 JSON.parse 하면 알아보기 힘든 파싱 에러가 나므로 여기서 잡아준다.
  if (text.trimStart().startsWith('<')) {
    const reason = text.match(/<returnAuthMsg>(.*?)<\/returnAuthMsg>/)?.[1] ?? 'XML 오류 응답';
    if (reason === 'SERVICETIMEOUT_ERROR') throw new TransientApiError(`${name}: ${reason}`);
    throw new Error(`${name}: ${reason}`);
  }

  const json = JSON.parse(text) as T;
  const noData = assertResultCode(name, json);
  if (requireItems && (noData || itemCount(json) === 0)) {
    throw new Error(`${name}: 정상 코드지만 결과 0건 (제공처 자료 누락)`);
  }
  return json;
}

/**
 * 공공데이터 API는 HTTP 200이어도 본문 resultCode로 실패를 알린다.
 *
 * 다만 오류가 아닌 코드가 둘 있다.
 *
 * 99 — 기상청 지수류는 서비스 기간이 아닐 때 "해당지수자료 제공기간이 아닙니다"를
 *      돌려준다. 예를 들어 8월에 소나무 꽃가루를 부르면 99가 온다.
 * 03 — NO_DATA. 기상특보는 발효 중인 특보가 없으면 body 없이 03을 준다.
 *      이걸 오류로 보면 특보 없는 날마다 예시 시나리오의 특보(여름이면 폭염경보)가
 *      실제처럼 화면에 뜬다.
 *
 * 둘 다 값 없음으로 흘려보낸다 — 그래야 예시 데이터로 잘못 대체되지 않는다.
 *
 * @returns 결과가 없다는 응답(03)이면 true
 */
const OUT_OF_SEASON = '99';
const NO_DATA = '03';

function assertResultCode(name: string, json: unknown): boolean {
  const header = (json as { response?: { header?: { resultCode?: string; resultMsg?: string } } })
    ?.response?.header;
  if (!header?.resultCode || header.resultCode === '00') return false;
  if (header.resultCode === OUT_OF_SEASON) return false;
  if (header.resultCode === NO_DATA) return true;

  throw new Error(`${name}: [${header.resultCode}] ${header.resultMsg ?? '알 수 없는 오류'}`);
}

/** 에어코리아는 items 가 배열, 기상청은 items.item 이 배열이다 */
function itemCount(json: unknown): number {
  const items = (json as { response?: { body?: { items?: unknown } } })?.response?.body?.items;
  if (Array.isArray(items)) return items.length;
  const inner = (items as { item?: unknown } | undefined)?.item;
  return Array.isArray(inner) ? inner.length : 0;
}
