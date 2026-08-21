/**
 * TMAP turnType → 화면 표시.
 *
 * TMAP은 안내 지점마다 회전 종류를 숫자로 준다. 문서에 표로 정리돼 있는 값이라
 * 그대로 옮겼다. 목록에 다 넣지는 않았고, 대전 시내 보행 경로에서 실제로 나오는
 * 것들 위주다. 모르는 값이 오면 안내 문구에서 앞부분을 잘라 쓴다.
 */

/** 화살표 모양 — 아이콘 컴포넌트가 이 값으로 그림을 고른다 */
export type TurnShape =
  | 'start'
  | 'goal'
  | 'straight'
  | 'left'
  | 'right'
  | 'uturn'
  | 'crosswalk'
  | 'stairs'
  | 'slope'
  | 'elevator'
  | 'bridge'
  | 'underpass';

interface TurnMeta {
  label: string;
  shape: TurnShape;
}

const TURN_TYPES: Record<number, TurnMeta> = {
  11: { label: '직진', shape: 'straight' },
  12: { label: '좌회전', shape: 'left' },
  13: { label: '우회전', shape: 'right' },
  14: { label: '유턴', shape: 'uturn' },
  16: { label: '8시 방향 좌회전', shape: 'left' },
  17: { label: '10시 방향 좌회전', shape: 'left' },
  18: { label: '11시 방향 좌회전', shape: 'left' },
  19: { label: '1시 방향 우회전', shape: 'right' },
  20: { label: '2시 방향 우회전', shape: 'right' },
  21: { label: '4시 방향 우회전', shape: 'right' },
  22: { label: '회전 교차로', shape: 'right' },

  125: { label: '육교', shape: 'bridge' },
  126: { label: '지하보도', shape: 'underpass' },
  127: { label: '계단 진입', shape: 'stairs' },
  128: { label: '경사로 진입', shape: 'slope' },
  129: { label: '계단·경사로 진입', shape: 'stairs' },
  132: { label: '지하보도 계단', shape: 'underpass' },
  133: { label: '육교 계단', shape: 'bridge' },
  134: { label: '계단 종료', shape: 'stairs' },
  135: { label: '경사로 종료', shape: 'slope' },
  136: { label: '계단·경사로 종료', shape: 'stairs' },
  138: { label: '승강기', shape: 'elevator' },

  184: { label: '실내 진입', shape: 'straight' },
  185: { label: '실내 이동', shape: 'straight' },
  186: { label: '실내 나가기', shape: 'straight' },

  200: { label: '출발', shape: 'start' },
  201: { label: '도착', shape: 'goal' },

  211: { label: '횡단보도', shape: 'crosswalk' },
  212: { label: '좌측 횡단보도', shape: 'crosswalk' },
  213: { label: '우측 횡단보도', shape: 'crosswalk' },
  214: { label: '8시 방향 횡단보도', shape: 'crosswalk' },
  215: { label: '10시 방향 횡단보도', shape: 'crosswalk' },
  216: { label: '11시 방향 횡단보도', shape: 'crosswalk' },
  217: { label: '1시 방향 횡단보도', shape: 'crosswalk' },
  218: { label: '2시 방향 횡단보도', shape: 'crosswalk' },
  219: { label: '4시 방향 횡단보도', shape: 'crosswalk' },
};

/**
 * 이 단계에서 무엇을 하는지 한 마디로.
 *
 * 모르는 turnType 이면 안내 문구의 앞부분을 쓴다. TMAP 문구는
 * '<행동> 후 <도로>를 따라 <거리> 이동' 형태라, '후' 앞을 자르면 행동만 남는다.
 * 우리가 모르는 코드가 새로 생겨도 화면이 비지 않게 하기 위한 대비다.
 */
export function turnMeta(
  turnType: number | null,
  description: string,
): TurnMeta {
  if (turnType !== null && turnType in TURN_TYPES) return TURN_TYPES[turnType];

  const action = description.split(' 후 ')[0].trim();
  return {
    label: action.length > 0 && action.length <= 16 ? action : '이동',
    shape: 'straight',
  };
}
