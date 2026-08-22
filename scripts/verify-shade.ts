/**
 * 그림자 보정 검증.
 *
 *   npx tsx scripts/verify-shade.ts
 *
 * 확인하려는 것
 *   1. 태양 고도가 시각·계절에 따라 제대로 움직이는가
 *   2. 같은 경로가 시각에 따라 다른 그늘 비율을 갖는가
 *   3. 그늘이 여름에는 위험을 낮추고 겨울에는 높이는가
 */
import { readFileSync } from 'node:fs';

for (const m of readFileSync('.env.local', 'utf8').matchAll(/^([A-Z0-9_]+)=(.*)$/gm)) {
  process.env[m[1]] = m[2].trim();
}

const WALK_MS = 1.25;

async function main() {
  const { shadeAt, createShadeAdjuster } = await import('@/lib/risk/shade');
  const { getRiskSnapshot } = await import('@/lib/api');
  const { deriveDongRisks } = await import('@/lib/risk/dong');
  const { buildNodeRiskMap, createRiskSampler } = await import('@/lib/risk/route-score');
  const { fetchPedestrianRoute } = await import('@/lib/routing/tmap');
  const { annotatePath, exposureOfPath } = await import('@/lib/routing/geo-match');
  const { PLACES } = await import('@/data/places');

  /* ── 1. 시각별 태양 고도와 그늘 비율 ── */
  console.log('════ 둔산 상권(고층 밀집)에서 시각별 그늘 ════');
  console.log('   건물 평균 55m · 건폐율 34% · 건물 한 변 33m\n');

  for (const [label, iso] of [
    ['여름 08:00', '2026-08-22T23:00:00Z'],
    ['여름 10:00', '2026-08-22T01:00:00Z'],
    ['여름 12:00', '2026-08-22T03:00:00Z'],
    ['여름 15:00', '2026-08-22T06:00:00Z'],
    ['여름 18:00', '2026-08-22T09:00:00Z'],
    ['겨울 12:00', '2026-01-15T03:00:00Z'],
    ['겨울 15:00', '2026-01-15T06:00:00Z'],
  ] as const) {
    const s = shadeAt(36.3515, 127.3785, new Date(iso));
    console.log(
      `  ${label}  ` +
        (s
          ? `고도 ${String(s.sunAltitudeDeg).padStart(4)}° · 그림자 ${String(s.shadowLengthM).padStart(3)}m · ` +
            `그늘 ${String((s.shadeFraction * 100).toFixed(0)).padStart(3)}% × 볕세기 ${s.sunIntensity.toFixed(2)} = ${(s.effectiveShade * 100).toFixed(0)}%`
          : '해가 낮아 계산 안 함'),
    );
  }

  /* ── 2. 지역별 (같은 시각) ── */
  console.log('\n════ 여름 정오, 지역별 그늘 ════');
  const noon = new Date('2026-08-22T03:00:00Z');
  for (const [n, lat, lng] of [
    ['둔산 상권', 36.3515, 127.3785],
    ['으능정이', 36.3283, 127.4275],
    ['대전시청', 36.3504, 127.3845],
    ['한밭수목원', 36.3676, 127.388],
    ['계족산', 36.3833, 127.438],
  ] as const) {
    const s = shadeAt(lat, lng, noon);
    console.log(
      `  ${n.padEnd(10)} ` +
        (s
          ? `건물 ${String(s.meanHeightM).padStart(3)}m · 그림자 ${String(s.shadowLengthM).padStart(3)}m · 그늘 ${(s.shadeFraction * 100).toFixed(0)}%`
          : '건물 데이터 없음'),
    );
  }

  /* ── 3. 실제 경로에서 시각을 바꿔 가며 ── */
  const snapshot = await getRiskSnapshot({});
  const dongRisks = deriveDongRisks(snapshot);
  const riskAt = createRiskSampler(
    buildNodeRiskMap(dongRisks, snapshot.districts[0].wind),
  );

  const from = PLACES.find((p) => p.id === 'government-complex')!;
  const to = PLACES.find((p) => p.id === 'dunsan')!;

  const route = await fetchPedestrianRoute({
    origin: { lat: from.coord[0], lng: from.coord[1] },
    destination: { lat: to.coord[0], lng: to.coord[1] },
    originName: from.name,
    destinationName: to.name,
    searchOption: '0',
  });
  const points = annotatePath(route.path, riskAt);
  const base = exposureOfPath(points, WALK_MS);

  const thermal = dongRisks[0].breakdown.contributions.filter(
    (c) => c.id === 'heat' || c.id === 'cold',
  );
  console.log(
    `\n════ ${from.name} → ${to.name} (${Math.round(route.totalDistanceM)}m) ════`,
  );
  console.log(
    `   계절 ${snapshot.season} · 체감 지표 기여 ${
      thermal.map((c) => `${c.id} ${c.points}점`).join(' · ') || '없음'
    } / 보정 전 ${dongRisks[0].breakdown.baseScore}점`,
  );
  console.log(`   그림자 보정 전 노출 ${base.score.toFixed(2)}\n`);

  for (const [label, iso] of [
    ['08:00', '2026-08-22T23:00:00Z'],
    ['10:00', '2026-08-22T01:00:00Z'],
    ['12:00', '2026-08-22T03:00:00Z'],
    ['15:00', '2026-08-22T06:00:00Z'],
    ['18:00', '2026-08-22T09:00:00Z'],
    ['21:00 (야간)', '2026-08-22T12:00:00Z'],
  ] as const) {
    const adjust = createShadeAdjuster(dongRisks, new Date(iso));

    let shadedM = 0;
    let totalM = 0;
    let shadeSum = 0;
    const adjusted = points.map((p) => {
      const r = adjust(p);
      return { ...p, risk: r.risk, shade: r.shadeFraction };
    });
    for (let i = 0; i < adjusted.length - 1; i++) {
      const a = adjusted[i];
      const b = adjusted[i + 1];
      const d = Math.hypot(
        (b.lat - a.lat) * 111_320,
        (b.lng - a.lng) * 111_320 * Math.cos((36.35 * Math.PI) / 180),
      );
      totalM += d;
      shadeSum += a.shade * d;
      if (a.shade > 0.15) shadedM += d;
    }

    const after = exposureOfPath(adjusted, WALK_MS);
    const delta = ((after.score - base.score) / base.score) * 100;

    console.log(
      `  ${label.padEnd(12)} 평균 그늘 ${((shadeSum / totalM) * 100).toFixed(0).padStart(3)}% · ` +
        `그늘 구간 ${String(Math.round(shadedM)).padStart(4)}m · ` +
        `노출 ${after.score.toFixed(2)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%)`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
