import type {
  KmaIndexResponse,
  VilageFcstItem,
  VilageFcstResponse,
  WthrWrnResponse,
} from '@/lib/api/types';
import type { DistrictId } from '@/types';
import type { Scenario } from '@/mocks/scenarios';
import { DISTRICTS, DISTRICT_BY_ID } from '@/data/districts';
import {
  INDEX_HOURS,
  hhmm,
  hourlySeries,
  hourlySeriesDiscrete,
  jitter,
  round1,
  ymd,
  ymdH,
} from './helpers';

const OK = { resultCode: '00', resultMsg: 'NORMAL_SERVICE' };

export type PollenKind = 'pine' | 'oak' | 'weed';

/** 꽃가루 종류별 지수 코드 — TODO(live): 기술문서로 대조 */
const POLLEN_CODE: Record<PollenKind, string> = {
  pine: 'A01',
  oak: 'A02',
  weed: 'A03',
};

/** 기상청 꽃가루농도위험지수 응답 */
export function buildPollenResponse(
  scenario: Scenario,
  areaNo: string,
  kind: PollenKind,
): KmaIndexResponse {
  const district = DISTRICTS.find((d) => d.areaNo === areaNo);
  const values = district ? scenario.districts[district.id] : undefined;

  const raw =
    kind === 'pine'
      ? values?.pinePollen
      : kind === 'oak'
        ? values?.oakPollen
        : values?.weedPollen;

  // 서비스 기간 밖이면 실제 API도 항목을 안 준다 → totalCount 0
  if (raw === undefined) {
    return {
      response: {
        header: OK,
        body: { dataType: 'JSON', items: { item: [] }, pageNo: 1, numOfRows: 10, totalCount: 0 },
      },
    };
  }

  return {
    response: {
      header: OK,
      body: {
        dataType: 'JSON',
        items: {
          item: [
            {
              code: POLLEN_CODE[kind],
              areaNo,
              date: ymdH(scenario.baseTime),
              ...hourlySeriesDiscrete(scenario, raw, INDEX_HOURS),
            },
          ],
        },
        pageNo: 1,
        numOfRows: 10,
        totalCount: 1,
      },
    },
  };
}

/** 기상청 대기정체지수 응답 (연중 제공) */
export function buildStagnationResponse(
  scenario: Scenario,
  areaNo: string,
): KmaIndexResponse {
  // 정체지수는 시 전역 공통값에 구별로 아주 약간의 차이만 준다
  const value = round1(scenario.stagnation * jitter(`stagnation:${areaNo}`, 0.04));

  return {
    response: {
      header: OK,
      body: {
        dataType: 'JSON',
        items: {
          item: [
            {
              code: 'A07',
              areaNo,
              date: ymdH(scenario.baseTime),
              ...hourlySeries(scenario, value, INDEX_HOURS),
            },
          ],
        },
        pageNo: 1,
        numOfRows: 10,
        totalCount: 1,
      },
    },
  };
}

/**
 * 기상청 단기예보 응답.
 *
 * 실제 API는 여러 category(TMP·REH·WSD·VEC·POP·SKY…)가 한 배열에 섞여 오고,
 * 같은 category가 fcstTime별로 여러 건 반복된다. 그 구조를 그대로 흉내 낸다.
 */
export function buildVilageFcstResponse(
  scenario: Scenario,
  districtId: DistrictId,
): VilageFcstResponse {
  const { grid } = DISTRICT_BY_ID[districtId];
  const v = scenario.districts[districtId];
  const baseDate = ymd(scenario.baseTime);
  const baseTime = hhmm(scenario.baseTime).slice(0, 2) + '00';

  const item: VilageFcstItem[] = [];
  // 기준시각부터 6시간치만 만든다 (현재값 판정에는 첫 건만 쓴다)
  for (let h = 0; h <= 6; h++) {
    const hour = (Number(baseTime.slice(0, 2)) + h) % 24;
    const fcstTime = String(hour).padStart(2, '0') + '00';
    const drift = 1 + h * 0.01;

    const push = (category: string, value: string) =>
      item.push({
        baseDate,
        baseTime,
        category,
        fcstDate: baseDate,
        fcstTime,
        fcstValue: value,
        nx: grid.nx,
        ny: grid.ny,
      });

    // TMP는 정수(℃), REH는 정수(%), WSD는 소수 1자리(m/s), VEC는 정수(도)
    push('TMP', String(Math.round(v.tempC * drift)));
    push('REH', String(Math.round(v.humidity)));
    push('WSD', String(round1(v.windMs)));
    push('VEC', String(Math.round(v.windDeg)));
    push('POP', '0');
    push('SKY', '1');
    push('PTY', '0');
  }

  return {
    response: {
      header: OK,
      body: {
        dataType: 'JSON',
        items: { item },
        pageNo: 1,
        numOfRows: item.length,
        totalCount: item.length,
      },
    },
  };
}

/** 기상청 기상특보 목록 응답 */
export function buildWarningResponse(scenario: Scenario): WthrWrnResponse {
  const item = scenario.warnings.map((w, i) => ({
    stnId: '133', // 대전지방기상청
    tmFc: w.tmFc,
    tmSeq: i + 1,
    title: w.title,
  }));

  return {
    response: {
      header: OK,
      body: {
        dataType: 'JSON',
        items: { item },
        pageNo: 1,
        numOfRows: item.length,
        totalCount: item.length,
      },
    },
  };
}
