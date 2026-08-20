import type {
  AirkoreaForecastItem,
  AirkoreaRealtimeItem,
  AirkoreaResponse,
} from '@/lib/api/types';
import type { DistrictId } from '@/types';
import type { Scenario } from '@/mocks/scenarios';
import { STATIONS } from '@/data/stations';
import { airkoreaTime, jitter } from './helpers';

const OK = { resultCode: '00', resultMsg: 'NORMAL_SERVICE' };

/** 환경부 4단계 등급 ('1' 좋음 ~ '4' 매우나쁨) */
function grade(value: number, cuts: [number, number, number]): string {
  if (value < cuts[0]) return '1';
  if (value < cuts[1]) return '2';
  if (value < cuts[2]) return '3';
  return '4';
}

function gradeLabel(g: string): string {
  return { '1': '좋음', '2': '보통', '3': '나쁨', '4': '매우나쁨' }[g] ?? '보통';
}

/**
 * 에어코리아 시도별 실시간 측정정보 (sidoName=대전).
 *
 * 자치구 1곳당 측정소 2곳을 만들고 값에 결정적 흔들림을 준다.
 * 실제 데이터도 같은 구 안에서 측정소별로 10% 안팎 차이가 나기 때문이다.
 */
export function buildRealtimeResponse(
  scenario: Scenario,
): AirkoreaResponse<AirkoreaRealtimeItem> {
  const dataTime = airkoreaTime(scenario.baseTime);
  const items: AirkoreaRealtimeItem[] = [];

  for (const [districtId, stationNames] of Object.entries(STATIONS)) {
    const v = scenario.districts[districtId as DistrictId];

    for (const stationName of stationNames) {
      const pm10 = Math.round(v.pm10 * jitter(`pm10:${stationName}`, 0.08));
      const pm25 = Math.round(v.pm25 * jitter(`pm25:${stationName}`, 0.08));
      const o3 = round3(v.ozone * jitter(`o3:${stationName}`, 0.06));
      const khai = Math.round(Math.max(pm10 * 1.1, pm25 * 2.2, o3 * 900));

      items.push({
        stationName,
        sidoName: '대전',
        dataTime,
        mangName: '도시대기',
        pm10Value: String(pm10),
        pm25Value: String(pm25),
        o3Value: o3.toFixed(3),
        so2Value: (0.003 * jitter(`so2:${stationName}`, 0.2)).toFixed(3),
        coValue: (0.4 * jitter(`co:${stationName}`, 0.2)).toFixed(1),
        no2Value: (0.021 * jitter(`no2:${stationName}`, 0.2)).toFixed(3),
        khaiValue: String(khai),
        pm10Grade: grade(pm10, [31, 81, 151]),
        pm25Grade: grade(pm25, [16, 36, 76]),
        o3Grade: grade(o3, [0.031, 0.091, 0.151]),
        khaiGrade: grade(khai, [51, 101, 251]),
      });
    }
  }

  return {
    response: {
      header: OK,
      body: { totalCount: items.length, items, pageNo: 1, numOfRows: 100 },
    },
  };
}

/**
 * 에어코리아 대기질 예보통보.
 * informGrade 는 '서울 : 보통,대전 : 나쁨,…' 처럼 한 문자열에 전국이 들어온다.
 */
export function buildForecastResponse(
  scenario: Scenario,
): AirkoreaResponse<AirkoreaForecastItem> {
  const day = airkoreaTime(scenario.baseTime).slice(0, 10);
  const avg = (pick: (d: (typeof scenario.districts)['dong']) => number) =>
    Object.values(scenario.districts).reduce((s, d) => s + pick(d), 0) / 5;

  const make = (
    informCode: string,
    value: number,
    cuts: [number, number, number],
    cause: string,
  ): AirkoreaForecastItem => {
    const g = gradeLabel(grade(value, cuts));
    return {
      informCode,
      informData: day,
      informOverall: `대전권은 ${g} 수준으로 예상됩니다.`,
      informCause: cause,
      informGrade: `서울 : ${g},인천 : ${g},대전 : ${g},대구 : ${g},광주 : ${g},부산 : ${g}`,
      dataTime: `${day} 05:00`,
    };
  };

  const items = [
    make('PM10', avg((d) => d.pm10), [31, 81, 151], '대기정체로 국내 발생 미세먼지가 축적되겠습니다.'),
    make('PM25', avg((d) => d.pm25), [16, 36, 76], '대기정체로 국내 발생 초미세먼지가 축적되겠습니다.'),
    make('O3', avg((d) => d.ozone), [0.031, 0.091, 0.151], '강한 일사로 광화학 반응이 활발하겠습니다.'),
  ];

  return {
    response: {
      header: OK,
      body: { totalCount: items.length, items, pageNo: 1, numOfRows: 10 },
    },
  };
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
