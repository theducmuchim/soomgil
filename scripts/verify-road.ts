/**
 * 도로유형 보정 검증 (일회성 스크립트).
 *
 * 확인하려는 것: 같은 행정동을 지나는 두 경로라도, 하나가 차 없는 보행로이고
 * 다른 하나가 큰 도로면 노출량이 다르게 나오는가.
 *
 *   npx tsx verify-road.ts
 *
 * ⚠ import 를 전부 동적으로 두는 이유
 * lib/env.ts 는 모듈을 읽는 시점에 process.env 를 상수로 굳힌다. 정적 import 는
 * 최상단으로 끌어올려지므로, .env.local 을 넣기 전에 그 상수가 정해져 버린다.
 */
import { readFileSync } from 'node:fs';
import type { RoadKind } from '@/types';

for (const m of readFileSync('.env.local', 'utf8').matchAll(/^([A-Z0-9_]+)=(.*)$/gm)) {
  process.env[m[1]] = m[2].trim();
}

const PAIRS: [string, string][] = [
  ['government-complex', 'gyejoksan'],
  ['cnu', 'dunsan'],
  ['daejeon-station', 'eunhaeng'],
  ['expo-park', 'hanbat-arboretum'],
  ['yuseong-oncheon', 'cnu'],
  ['cnuh', 'bomunsan'],
];

const OPTIONS = ['0', '10', '30'] as const;
const WALK_MS = 1.25;

function pct(a: number, b: number): string {
  if (b === 0) return '0.0%';
  const v = ((a - b) / b) * 100;
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

async function main() {
  const { getRiskSnapshot } = await import('@/lib/api');
  const { deriveDongRisks } = await import('@/lib/risk/dong');
  const { buildNodeRiskMap, createRiskSampler } = await import('@/lib/risk/route-score');
  const { createRoadAdjuster, roadKindOf, ROAD_KINDS, enclosedFacility } = await import(
    '@/lib/risk/road-exposure'
  );
  const { fetchPedestrianRoute } = await import('@/lib/routing/tmap');
  const { annotatePath, exposureOfPath, dongNameMap } = await import(
    '@/lib/routing/geo-match'
  );
  const { PLACES } = await import('@/data/places');

  const place = (id: string) => {
    const p = PLACES.find((x) => x.id === id);
    if (!p) throw new Error(`장소 없음: ${id}`);
    return p;
  };

  const snapshot = await getRiskSnapshot({});
  const dongRisks = deriveDongRisks(snapshot);
  const names = dongNameMap();

  console.log(
    `데이터 ${snapshot.source} · 계절 ${snapshot.season} · 기준 ${snapshot.baseTime}`,
  );
  console.log(
    '보정 전 지표 기여:',
    dongRisks[0].breakdown.contributions.map((c) => `${c.id} ${c.points}점`).join(' · '),
    `/ 보정 전 총점 ${dongRisks[0].breakdown.baseScore}`,
  );

  const wind = snapshot.districts[0].wind;
  const riskAt = createRiskSampler(buildNodeRiskMap(dongRisks, wind));
  const adjust = createRoadAdjuster(dongRisks);

  interface DongCell {
    before: number;
    after: number;
    meters: number;
    mix: Map<RoadKind, number>;
  }

  interface Variant {
    option: string;
    distanceM: number;
    before: number;
    after: number;
    mix: Map<RoadKind, number>;
    enclosedM: number;
    byDong: Map<string, DongCell>;
  }

  for (const [fromId, toId] of PAIRS) {
    const origin = place(fromId);
    const destination = place(toId);
    console.log(`\n\n════ ${origin.name} → ${destination.name} ════`);

    const variants: Variant[] = [];

    for (const option of OPTIONS) {
      let route;
      try {
        route = await fetchPedestrianRoute({
          origin: { lat: origin.coord[0], lng: origin.coord[1] },
          destination: { lat: destination.coord[0], lng: destination.coord[1] },
          originName: origin.name,
          destinationName: destination.name,
          searchOption: option,
        });
      } catch (e) {
        console.log(`  opt=${option} 실패: ${(e as Error).message}`);
        continue;
      }

      const raw = annotatePath(route.path, riskAt);
      const adjusted = raw.map((p) => ({ ...p, risk: adjust(p).risk }));

      const before = exposureOfPath(raw, WALK_MS);
      const after = exposureOfPath(adjusted, WALK_MS);

      const mix = new Map<RoadKind, number>();
      const byDong = new Map<string, DongCell>();
      let enclosedM = 0;

      for (let i = 0; i < raw.length - 1; i++) {
        const a = raw[i];
        const b = raw[i + 1];
        const d = Math.hypot(
          (b.lat - a.lat) * 111_320,
          (b.lng - a.lng) * 111_320 * Math.cos((36.35 * Math.PI) / 180),
        );
        const kind = roadKindOf(a.roadType);
        mix.set(kind, (mix.get(kind) ?? 0) + d);
        if (enclosedFacility(a.facilityType)) enclosedM += d;

        const key = a.dongId ?? 'unknown';
        const cur: DongCell = byDong.get(key) ?? {
          before: 0,
          after: 0,
          meters: 0,
          mix: new Map<RoadKind, number>(),
        };
        cur.before += a.risk * d;
        cur.after += adjusted[i].risk * d;
        cur.meters += d;
        cur.mix.set(kind, (cur.mix.get(kind) ?? 0) + d);
        byDong.set(key, cur);
      }

      variants.push({
        option,
        distanceM: route.totalDistanceM,
        before: before.score,
        after: after.score,
        mix,
        enclosedM,
        byDong,
      });

      const mixText = [...mix.entries()]
        .sort((x, y) => y[1] - x[1])
        .map(([k, m]) => `${ROAD_KINDS[k].label} ${Math.round(m)}m`)
        .join(' · ');
      console.log(
        `  opt=${option.padEnd(2)} ${String(Math.round(route.totalDistanceM)).padStart(5)}m  ` +
          `노출 ${before.score.toFixed(2)} → ${after.score.toFixed(2)} (${pct(after.score, before.score)})` +
          (enclosedM > 0 ? `  밀폐 ${Math.round(enclosedM)}m` : ''),
      );
      console.log(`         ${mixText}`);
    }

    if (variants.length < 2) continue;

    const spread = (get: (v: Variant) => number) => {
      const vals = variants.map(get);
      return Math.max(...vals) - Math.min(...vals);
    };
    console.log(
      `  ── 경로 간 노출 폭: 보정 전 ${spread((v) => v.before).toFixed(3)} → ` +
        `보정 후 ${spread((v) => v.after).toFixed(3)}`,
    );

    // 같은 행정동을 모든 경로가 200m 이상 지나가는 경우만 본다
    const common = [...variants[0].byDong.keys()].filter(
      (d) => d !== 'unknown' && variants.every((v) => (v.byDong.get(d)?.meters ?? 0) > 200),
    );

    for (const dongId of common) {
      const cells = variants.map((v) => {
        const c = v.byDong.get(dongId)!;
        const top = [...c.mix.entries()].sort((x, y) => y[1] - x[1])[0];
        return {
          option: v.option,
          before: c.before / c.meters,
          after: c.after / c.meters,
          meters: c.meters,
          topKind: top ? ROAD_KINDS[top[0]].label : '-',
          carFreeM: c.mix.get('carFree') ?? 0,
          roadsideM: (c.mix.get('mixed') ?? 0) + (c.mix.get('carOnly') ?? 0),
        };
      });

      const sBefore =
        Math.max(...cells.map((c) => c.before)) - Math.min(...cells.map((c) => c.before));
      const sAfter =
        Math.max(...cells.map((c) => c.after)) - Math.min(...cells.map((c) => c.after));
      if (sAfter < 0.05) continue;

      console.log(`  ── 같은 동 [${names.get(dongId) ?? dongId}] 안에서의 비교`);
      for (const c of cells) {
        console.log(
          `       opt=${c.option.padEnd(2)} ${String(Math.round(c.meters)).padStart(4)}m  ` +
            `${c.before.toFixed(2)} → ${c.after.toFixed(2)} (${pct(c.after, c.before)})  ` +
            `주 유형 ${c.topKind} · 차없음 ${Math.round(c.carFreeM)}m · 차도측 ${Math.round(c.roadsideM)}m`,
        );
      }
      console.log(
        `       ⇒ 같은 동 안 경로 간 차이: 보정 전 ${sBefore.toFixed(3)} → 보정 후 ${sAfter.toFixed(3)}`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
