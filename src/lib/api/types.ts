/**
 * 공공데이터 API 원본 응답 형태.
 *
 * 이 파일의 타입은 "API가 주는 그대로"를 표현한다.
 * 숫자도 대부분 문자열로 온다 — 실제 응답이 그렇기 때문에 일부러 string으로 둔다.
 * 도메인 타입(@/types)으로의 변환은 lib/normalize/*.ts 가 담당한다.
 *
 * TODO(live): 인증키 발급 후 받는 각 서비스 기술문서로 필드명을 한 번 대조할 것.
 *             특히 기상청 지수류의 시간 필드(h0/h3/…)와 오퍼레이션명은 서비스마다 다르다.
 */

/* ── 기상청 공통 ───────────────────────────────────────── */

export interface KmaHeader {
  resultCode: string; // '00' 이면 정상
  resultMsg: string; // 'NORMAL_SERVICE'
}

/**
 * 기상청 생활기상지수 계열(꽃가루농도위험지수 · 대기정체지수) 응답 아이템.
 * h0 · h3 · h6 … h72 형태로 3시간 간격 예보값이 들어온다.
 */
export interface KmaIndexItem {
  code: string; // 지수 코드 (예: 'A02')
  areaNo: string; // 행정구역코드 10자리
  date: string; // 발표시각 YYYYMMDDHH
  [hourKey: string]: string | undefined; // h0, h3, h6 …
}

export interface KmaIndexResponse {
  response: {
    header: KmaHeader;
    body: {
      dataType: string;
      items: { item: KmaIndexItem[] };
      pageNo: number;
      numOfRows: number;
      totalCount: number;
    };
  };
}

/* ── 기상청 단기예보 ───────────────────────────────────── */

/** category: TMP(기온) REH(습도) WSD(풍속) VEC(풍향) POP(강수확률) SKY PTY … */
export interface VilageFcstItem {
  baseDate: string; // 'YYYYMMDD'
  baseTime: string; // 'HHmm'
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
  nx: number;
  ny: number;
}

export interface VilageFcstResponse {
  response: {
    header: KmaHeader;
    body: {
      dataType: string;
      items: { item: VilageFcstItem[] };
      pageNo: number;
      numOfRows: number;
      totalCount: number;
    };
  };
}

/* ── 기상청 기상특보 ───────────────────────────────────── */

export interface WthrWrnItem {
  stnId: string; // 발표 관서 (대전청 '133')
  tmFc: string; // 발표시각 YYYYMMDDHHmm
  tmSeq: number;
  title: string; // '대전, 세종 폭염경보'
}

export interface WthrWrnResponse {
  response: {
    header: KmaHeader;
    body: {
      dataType: string;
      items: { item: WthrWrnItem[] };
      pageNo: number;
      numOfRows: number;
      totalCount: number;
    };
  };
}

/* ── 에어코리아 ────────────────────────────────────────── */

/**
 * 에어코리아는 JSON(returnType=json) 응답에서 items 가 배열로 바로 온다.
 * 기상청처럼 items.item 으로 한 겹 더 감싸지 않는다.
 */
export interface AirkoreaResponse<TItem> {
  response: {
    header: KmaHeader;
    body: {
      totalCount: number;
      items: TItem[];
      pageNo: number;
      numOfRows: number;
    };
  };
}

/** 시도별 실시간 측정정보 (getCtprvnRltmMesureDnsty) */
export interface AirkoreaRealtimeItem {
  stationName: string;
  sidoName: string;
  dataTime: string; // '2026-08-06 15:00'
  mangName: string; // '도시대기'
  pm10Value: string;
  pm25Value: string;
  o3Value: string;
  so2Value: string;
  coValue: string;
  no2Value: string;
  khaiValue: string; // 통합대기환경지수
  pm10Grade: string; // '1'~'4'
  pm25Grade: string;
  o3Grade: string;
  khaiGrade: string;
}

/** 대기질 예보통보 (getMinuDustFrcstDspth) */
export interface AirkoreaForecastItem {
  informCode: string; // 'PM10' | 'PM25' | 'O3'
  informData: string; // '2026-08-06'
  informOverall: string;
  informCause: string;
  informGrade: string; // '서울 : 보통,대전 : 나쁨,…'
  dataTime: string;
}
