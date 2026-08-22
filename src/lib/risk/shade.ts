import type { AreaRisk, IndicatorId } from '@/types';
import { getPosition } from 'suncalc';
import { canyonAt } from '@/data/buildings';

/**
 * 건물 그림자 보정 — 체감온도 전용.
 *
 * ── 무엇을 푸는가 ───────────────────────────────────────
 * 같은 시각 같은 동네여도, 볕이 그대로 드는 길과 건물 그늘이 이어지는 길은
 * 체감이 다르다. 한여름 낮에 이 차이는 옷차림보다 크다. 기상청 기온은
 * 관측소 한 지점의 값이라 이 차이를 담지 못한다.
 *
 * ── 무엇을 계산하는가 ───────────────────────────────────
 * "이 지점이 그늘인가"를 판정하지 **않는다**. 그러려면 건물 폴리곤 하나하나와
 * 경로 좌표의 관계를 풀어야 하는데, 우리가 가진 건 150m 격자 평균이다.
 * 대신 **이 구간을 걸을 때 그늘을 만날 비율**을 추정한다.
 *
 *   그림자 길이  L = 건물 높이 ÷ tan(태양 고도)
 *   그늘 면적 비 f = 1 − exp( −건폐율 × (1 + L ÷ 건물 한 변) )
 *
 * 뒤 식은 건물이 격자 안에 무작위로 놓여 있다고 볼 때의 값이다. 건물 하나가
 * 덮는 그림자 면적은 대략 (한 변) × (한 변 + 그림자 길이)이고, 그런 건물이
 * 겹칠 수 있으므로 겹침을 지수식으로 눌러 준다. 건폐율이 높거나 해가 낮을수록
 * 1에 가까워진다.
 *
 * ── 왜 체감온도에만 거는가 ──────────────────────────────
 * 그늘은 복사열을 막는다. 미세먼지·오존·꽃가루 농도와는 상관이 없다.
 * 자외선도 그늘에서 크게 줄지만 이 서비스에는 자외선 지표가 없다 — 나중에
 * 지표를 추가하면 여기 SHADE_RESPONSE 에 한 줄 넣으면 된다.
 *
 * ── 여름과 겨울은 방향이 반대다 ─────────────────────────
 * 그늘은 더위를 덜어 주지만 추위는 키운다. 겨울 한파 구간에서 그늘진 길은
 * 오히려 나쁘다. 그래서 heat 은 내리고 cold 는 올린다. 한쪽만 반영하면
 * "겨울에 그늘로 다니세요"라는 잘못된 안내가 된다.
 */

/** 해가 이보다 낮으면 계산하지 않는다 */
const MIN_SUN_ALTITUDE_DEG = 5;

/**
 * 그림자 길이 상한 (건물 높이의 몇 배).
 *
 * 해가 낮을수록 그림자는 무한히 길어지는데, 그 길이만큼 실제로 그늘이 이어지진
 * 않는다. 지형과 다른 건물에 가려 끊기고, 애초에 해가 낮으면 복사열 자체가
 * 약해 그늘의 이득도 작다. 식이 발산하지 않게 끊는다.
 */
const MAX_SHADOW_RATIO = 6;

/** 캐니언 보정과 같은 이유 — 건물 몇 동으로는 그늘이 이어지지 않는다 */
const MIN_BUILDINGS = 3;

/**
 * 그늘이 지표에 미치는 영향.
 *
 * 완전히 그늘인 구간(f = 1)에서 이 지표의 몫에 곱할 값이다. 부분 그늘은
 * 비율만큼 사이값을 쓴다.
 *
 * 한여름 뙤약볕과 그늘의 체감온도 차이는 5~10℃ 로 보고되지만, 우리가 다루는
 * 건 그 시각 그 지역의 위험 점수 중 더위 몫이고 경로 전체 평균이다.
 * 근거보다 크게 잡지 않도록 눌러 두었다.
 */
const SHADE_RESPONSE: Partial<Record<IndicatorId, number>> = {
  /** 그늘이면 더위 위험이 25% 줄어든다 */
  heat: 0.75,
  /** 그늘이면 추위 위험이 12% 늘어난다 */
  cold: 1.12,
};

export interface ShadeSample {
  /** 태양 고도 (도) */
  sunAltitudeDeg: number;
  /** 그늘을 만날 비율 0~1 */
  shadeFraction: number;
  /**
   * 햇볕의 세기 0~1 — 태양 고도의 sin 값.
   *
   * 그늘의 이득은 "그늘이 얼마나 넓은가"만으로 정해지지 않는다. 막을 볕이
   * 있어야 막는 의미가 있다. 해가 낮으면 그림자는 길지만 복사열 자체가 약하다.
   *
   * 이 값을 곱하지 않으면 저녁 6시에 그늘 효과가 가장 크다는 결과가 나온다.
   * 실제로 그 시각엔 이미 볕이 약해 그늘의 이득이 작다.
   */
  sunIntensity: number;
  /** 실제로 위험도에 반영되는 몫 — 그늘 비율 × 햇볕 세기 */
  effectiveShade: number;
  /** 이 지점 건물 평균 높이 (m) */
  meanHeightM: number;
  /** 그림자 길이 (m) */
  shadowLengthM: number;
}

/**
 * 이 좌표·이 시각의 그늘 비율. 계산할 수 없으면 null.
 *
 * null 이 되는 경우
 *   - 건물 데이터가 없는 칸 (산·농지·하천)
 *   - 해가 졌거나 아주 낮을 때 — 그늘을 따질 볕이 없다
 */
export function shadeAt(lat: number, lng: number, at: Date): ShadeSample | null {
  const sun = getPosition(at, lat, lng);
  // suncalc 2.x 는 라디안이 아니라 **도**로 준다
  const altitude = sun.altitude;
  if (altitude < MIN_SUN_ALTITUDE_DEG) return null;

  const cell = canyonAt(lat, lng);
  if (!cell || cell.buildings < MIN_BUILDINGS || cell.builtRatio <= 0) return null;

  const rawLength = cell.meanHeightM / Math.tan((altitude * Math.PI) / 180);
  const shadowLengthM = Math.min(rawLength, cell.meanHeightM * MAX_SHADOW_RATIO);

  const reach = 1 + shadowLengthM / Math.max(cell.meanFootprintM, 1);
  const shadeFraction = Math.min(1 - Math.exp(-cell.builtRatio * reach), 1);

  const sunIntensity = Math.sin((altitude * Math.PI) / 180);

  return {
    sunAltitudeDeg: Math.round(altitude * 10) / 10,
    shadeFraction: Math.round(shadeFraction * 1000) / 1000,
    sunIntensity: Math.round(sunIntensity * 1000) / 1000,
    effectiveShade: Math.round(shadeFraction * sunIntensity * 1000) / 1000,
    meanHeightM: Math.round(cell.meanHeightM),
    shadowLengthM: Math.round(shadowLengthM),
  };
}

/**
 * 행정동별 "체감 지표가 종합 점수에서 차지하는 몫".
 *
 * 도로유형 보정과 같은 방식이다. 종합 점수 전체에 곱하면 그늘이 미세먼지까지
 * 줄이게 되는데, 그건 사실이 아니다.
 *
 * 여름이면 heat 만, 겨울이면 cold 만 기여가 잡히므로 계절 분기는 필요 없다.
 * 두 몫을 방향이 반대인 계수로 각각 계산해 합쳐 하나의 계수로 만든다.
 */
function thermalShareByArea(areaRisks: AreaRisk[]): Map<string, Map<IndicatorId, number>> {
  const shares = new Map<string, Map<IndicatorId, number>>();

  for (const area of areaRisks) {
    const base = area.breakdown.baseScore > 0 ? area.breakdown.baseScore : area.score;
    const perIndicator = new Map<IndicatorId, number>();

    if (base > 0) {
      for (const c of area.breakdown.contributions) {
        if (!(c.id in SHADE_RESPONSE)) continue;
        perIndicator.set(c.id, Math.min(c.points / base, 1));
      }
    }

    shares.set(area.areaId, perIndicator);
  }

  return shares;
}

export interface ShadeAdjustment {
  risk: number;
  /** 실제로 걸린 계수 (1이면 보정 없음) */
  factor: number;
  /** 그늘 비율 0~1 */
  shadeFraction: number;
}

/**
 * 경로 위 한 점에 그림자 보정을 적용하는 함수를 만든다.
 *
 * @param at 이 스냅샷의 기준 시각. 태양 위치가 여기서 정해진다.
 */
export function createShadeAdjuster(
  areaRisks: AreaRisk[],
  at: Date,
): (point: {
  lat: number;
  lng: number;
  risk: number;
  dongId: string | null;
}) => ShadeAdjustment {
  const shares = thermalShareByArea(areaRisks);

  return (point) => {
    const none = { risk: point.risk, factor: 1, shadeFraction: 0 };
    if (point.risk <= 0 || !point.dongId) return none;

    const shade = shadeAt(point.lat, point.lng, at);
    if (!shade || shade.effectiveShade <= 0.01) return none;

    const perIndicator = shares.get(point.dongId);
    if (!perIndicator || perIndicator.size === 0) return none;

    /*
     * 지표마다 몫과 방향이 다르므로 하나씩 더한다.
     *
     *   계수 = 1 + Σ 몫ᵢ × (반응ᵢ − 1) × (그늘비율 × 햇볕세기)
     *
     * heat 은 반응이 1보다 작아 계수를 내리고, cold 는 1보다 커서 올린다.
     * 둘 다 잡히는 환절기에는 서로 상쇄된다 — 그게 맞는 동작이다.
     */
    let delta = 0;
    for (const [id, share] of perIndicator) {
      const response = SHADE_RESPONSE[id];
      if (response === undefined) continue;
      delta += share * (response - 1) * shade.effectiveShade;
    }

    const factor = 1 + delta;
    if (Math.abs(delta) < 0.001) return none;

    return {
      risk: Math.max(Math.min(point.risk * factor, 100), 0),
      factor: Math.round(factor * 1000) / 1000,
      shadeFraction: shade.shadeFraction,
    };
  };
}
