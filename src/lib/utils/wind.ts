/** 풍향(도) -> 16방위 한글 표기. 0도 = 북(북풍, 북쪽에서 불어옴) */
const COMPASS_16 = [
  '북', '북북동', '북동', '동북동',
  '동', '동남동', '남동', '남남동',
  '남', '남남서', '남서', '서남서',
  '서', '서북서', '북서', '북북서',
];

export function windLabel(degree: number): string {
  const normalized = ((degree % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return COMPASS_16[index];
}

/**
 * 두 지점 사이의 방위각(도).
 * 6단계 경로 위험도 계산에서 "이 구간이 오염원의 풍하측인가"를 판정할 때 쓴다.
 */
export function bearing(from: [number, number], to: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat1 = toRad(from[0]);
  const lon1 = toRad(from[1]);
  const lat2 = toRad(to[0]);
  const lon2 = toRad(to[1]);

  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
