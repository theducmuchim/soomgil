import type { IndicatorId } from '@/types';

/**
 * 레이어 지도에서 켜고 끌 수 있는 위험요소.
 *
 * 지표 10종을 그대로 나열하면 선택지가 너무 많아 읽기 어렵다.
 * 사용자가 실제로 구분해서 생각하는 단위(꽃가루 / 미세먼지 / 폭염 / 오존)로 묶고,
 * 한 묶음 안에 여러 지표가 있으면 그중 가장 나쁜 값을 대표로 쓴다.
 * (꽃가루 = 소나무·참나무·잡초 중 최대, 미세먼지 = PM10·PM2.5 중 최대)
 */
export interface LayerMeta {
  id: LayerId;
  label: string;
  /** 레이어 고유 색 — 범례와 토글 칩에 쓴다 */
  color: string;
  indicators: IndicatorId[];
  description: string;
}

export type LayerId = 'pollen' | 'dust' | 'heat' | 'ozone';

export const LAYERS: LayerMeta[] = [
  {
    id: 'pollen',
    label: '꽃가루',
    color: 'var(--color-layer-pollen)',
    indicators: ['pinePollen', 'oakPollen', 'weedPollen'],
    description:
      '소나무·참나무(3~6월)와 잡초류(8~10월) 중 가장 높은 값. 발생원이 외곽 산림과 하천변이라 도심에서 멀수록 높습니다.',
  },
  {
    id: 'dust',
    label: '미세먼지',
    color: 'var(--color-layer-dust)',
    indicators: ['pm10', 'pm25', 'yellowDust'],
    description:
      '미세먼지·초미세먼지·황사 중 가장 높은 값. 교통량이 많은 도심이 높고, 하천변은 확산이 좋아 낮습니다.',
  },
  {
    id: 'heat',
    label: '폭염·한파',
    color: 'var(--color-layer-heat)',
    indicators: ['heat', 'cold'],
    description:
      '단기예보의 기온·습도·풍속으로 산출한 체감온도. 여름에는 도심 열섬으로 높고, 겨울에는 같은 이유로 도심이 덜 춥습니다.',
  },
  {
    id: 'ozone',
    label: '오존',
    color: 'var(--color-layer-ozone)',
    indicators: ['ozone'],
    description:
      '햇빛이 강한 여름 낮에 광화학 반응으로 생성됩니다. 하루 중 오후 2~4시에 정점을 찍습니다.',
  },
];

export const LAYER_BY_ID = Object.fromEntries(LAYERS.map((l) => [l.id, l])) as Record<
  LayerId,
  LayerMeta
>;
