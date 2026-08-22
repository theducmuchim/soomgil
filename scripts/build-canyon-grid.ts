/**
 * 국토교통부 GIS건물통합정보(대전분) → 캐니언 격자.
 *
 *   npx tsx scripts/build-canyon-grid.ts <SHP파일경로>
 *   예: npx tsx scripts/build-canyon-grid.ts ~/Downloads/AL_30_D010_20260801.shp
 *
 * 결과를 src/data/geo/canyon-grid.json 에 덮어쓴다. 다른 코드는 손대지 않아도 된다.
 *
 * ── 이 스크립트가 하는 일 ───────────────────────────────
 *  1. SHP 를 읽는다 (전국 파일이면 대전 경계 밖은 버린다)
 *  2. .prj 에 적힌 좌표계를 읽어 WGS84 로 바꾼다 (배포본마다 다르다)
 *  3. 건물마다 높이를 정한다 — 높이 값이 있으면 그 값, 없으면 지상층수 × 층고
 *  4. 150m 격자에 바닥면적 가중 평균 높이를 넣는다
 *
 * ── 왜 격자로 줄이는가 ──────────────────────────────────
 * 대전만 20만 동이 넘는다. 폴리곤을 그대로 저장소에 넣으면 수십 MB 가 되고
 * 경로 한 건에 수천 번 조회해야 한다. 우리가 쓰는 건 "이 근처 건물이 대체로
 * 얼마나 높은가" 하나뿐이라 격자 평균이면 충분하다.
 */
import { createWriteStream, existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import * as shapefile from 'shapefile';
import proj4 from 'proj4';

/* ── 대전 경계 (경로 계산에 쓰는 범위와 같게) ───────────── */
const MIN_LAT = 36.18;
const MAX_LAT = 36.5;
const MIN_LNG = 127.28;
const MAX_LNG = 127.56;

const CELL_M = 150;
const LAT_TO_M = 111_320;
const LNG_TO_M = 111_320 * Math.cos((36.35 * Math.PI) / 180);

/**
 * 층고.
 *
 * 높이 컬럼은 건축물대장에 값이 없으면 0으로 온다. 실제로 상당수가 그렇다.
 * 그때는 지상층수로 환산하는데, 주거·업무 건물의 층고가 대략 이 정도다.
 * 실제 높이보다 조금 낮게 잡히는 쪽이라 캐니언 보정이 과해지지 않는다.
 */
const FLOOR_HEIGHT_M = 3.3;

/** 이보다 높으면 데이터 오류로 본다 (국내 최고층 건물이 555m) */
const MAX_PLAUSIBLE_H = 600;

/**
 * 좌표계.
 *
 * ⚠ 배포본마다 다르다. 같은 국토부 건물통합정보인데도 예전 파일은
 * EPSG:5174(Bessel), 최근 파일은 EPSG:5186(Korea 2000/GRS80)으로 온다.
 * 둘은 원점과 타원체가 달라 수백 m 어긋나므로, 짐작하지 말고 **.prj 파일에
 * 적힌 EPSG 코드를 읽어서** 고른다.
 */
const PROJECTIONS: Record<string, string> = {
  // Korea 2000 / Central Belt 2010 — 요즘 배포본
  '5186':
    '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 ' +
    '+ellps=GRS80 +units=m +no_defs',
  // Korean 1985 / Modified Central Belt — 예전 배포본
  '5174':
    '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 ' +
    '+ellps=bessel +units=m +no_defs ' +
    '+towgs84=-145.907,505.034,685.756,-1.162,2.347,1.592,6.342',
  // Korea 2000 / Central Belt (원점 북위 38, false northing 500000)
  '5181':
    '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 ' +
    '+ellps=GRS80 +units=m +no_defs',
};

/** .prj 에서 EPSG 코드를 읽어 proj4 정의를 고른다 */
function resolveProjection(shpPath: string): { epsg: string; def: string } {
  const prjPath = shpPath.replace(/\.shp$/i, '.prj');
  if (!existsSync(prjPath)) {
    throw new Error(`.prj 파일이 없어 좌표계를 알 수 없습니다: ${prjPath}`);
  }

  const wkt = readFileSync(prjPath, 'utf8');
  const epsg = wkt.match(/AUTHORITY\s*\[\s*"EPSG"\s*,\s*"?(\d+)"?\s*\]\s*\]?\s*$/)?.[1];

  if (epsg && PROJECTIONS[epsg]) return { epsg, def: PROJECTIONS[epsg] };

  // 모르는 코드면 WKT 를 그대로 넘겨 본다 (proj4 가 읽어낼 때가 많다)
  if (wkt.includes('PROJCS')) {
    console.warn(
      `⚠ 처음 보는 좌표계입니다 (EPSG:${epsg ?? '?'}). .prj 의 WKT 를 그대로 씁니다.`,
    );
    return { epsg: epsg ?? 'WKT', def: wkt };
  }

  throw new Error(`좌표계를 해석하지 못했습니다: ${prjPath}`);
}

/**
 * 속성 컬럼.
 *
 * ⚠ 이 데이터의 컬럼명은 A0~A28 이다. HEIGHT·GRND_FLR 같은 이름이 아니다.
 * 어느 A 가 무엇인지는 실제 값으로 확인했다 —
 *   A17(건폐율) = A12 ÷ A15 · A18(용적률) = A14 ÷ A15 가 정확히 맞아떨어져
 *   A12=건축면적, A14=연면적, A15=대지면적 이 확정됐고,
 *   2층 단독주택의 A16 이 8(m), A26 이 2(층)로 나와 높이·지상층수가 확정됐다.
 *
 * 배포본에 따라 이름이 붙어 나올 수도 있어 둘 다 본다.
 */
const COLUMN = {
  height: ['A16', 'HEIGHT'],
  groundFloors: ['A26', 'GRND_FLR'],
} as const;

type Props = Record<string, unknown>;

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/** 여러 후보 컬럼명 중 값이 있는 것을 읽는다 */
function pick(props: Props, names: readonly string[]): number | null {
  for (const name of names) {
    const v = num(props[name]);
    if (v !== null) return v;
  }
  return null;
}

/** 건물 하나의 높이 (m). 알 수 없으면 null */
function heightOf(props: Props): { h: number; fromFloors: boolean } | null {
  const direct = pick(props, COLUMN.height);
  if (direct !== null && direct > 0) return { h: direct, fromFloors: false };

  const floors = pick(props, COLUMN.groundFloors);
  if (floors !== null && floors > 0) {
    return { h: floors * FLOOR_HEIGHT_M, fromFloors: true };
  }

  return null;
}

/** 폴리곤 링의 중심점과 면적 (m²) */
function ringStats(ring: number[][]): { x: number; y: number; area: number } {
  let sx = 0;
  let sy = 0;
  let twice = 0;
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[(i + 1) % ring.length];
    sx += ax;
    sy += ay;
    twice += ax * by - bx * ay;
  }
  return { x: sx / ring.length, y: sy / ring.length, area: Math.abs(twice / 2) };
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('사용법: npx tsx scripts/build-canyon-grid.ts <SHP파일경로>');
    process.exit(1);
  }

  const dLat = CELL_M / LAT_TO_M;
  const dLng = CELL_M / LNG_TO_M;
  const rows = Math.ceil((MAX_LAT - MIN_LAT) / dLat);
  const cols = Math.ceil((MAX_LNG - MIN_LNG) / dLng);

  const { epsg, def } = resolveProjection(input);
  proj4.defs('SOURCE', def);
  console.log(`좌표계 EPSG:${epsg}`);

  const acc = new Map<number, { wh: number; w: number; n: number; area: number }>();

  let read = 0;
  let outside = 0;
  let noHeight = 0;
  let used = 0;
  let fromFloors = 0;

  // .dbf 를 명시적으로 짝지어 준다. 한글 속성이 EUC-KR 이라 인코딩도 함께.
  const source = await shapefile.open(input, input.replace(/\.shp$/i, '.dbf'), {
    encoding: 'euc-kr',
  });

  for (;;) {
    const result = await source.read();
    if (result.done) break;

    const feature = result.value;
    read++;
    if (read % 200_000 === 0) console.log(`  … ${read.toLocaleString('ko-KR')}건 읽음`);

    const geom = feature.geometry;
    if (!geom) continue;

    const props = (feature.properties ?? {}) as Props;
    const height = heightOf(props);
    if (height === null || height.h > MAX_PLAUSIBLE_H) {
      noHeight++;
      continue;
    }
    if (height.fromFloors) fromFloors++;

    // Polygon / MultiPolygon 의 바깥 링만 쓴다 (안뜰은 벽이 아니다)
    const rings: number[][][] =
      geom.type === 'Polygon'
        ? [geom.coordinates[0] as number[][]]
        : geom.type === 'MultiPolygon'
          ? (geom.coordinates as number[][][][]).map((poly) => poly[0])
          : [];

    for (const ring of rings) {
      if (!ring || ring.length < 3) continue;

      const { x, y, area } = ringStats(ring);
      const [lng, lat] = proj4('SOURCE', 'WGS84', [x, y]);

      if (lat < MIN_LAT || lat >= MAX_LAT || lng < MIN_LNG || lng >= MAX_LNG) {
        outside++;
        continue;
      }

      const r = Math.floor((lat - MIN_LAT) / dLat);
      const c = Math.floor((lng - MIN_LNG) / dLng);
      const key = r * cols + c;

      const cur = acc.get(key) ?? { wh: 0, w: 0, n: 0, area: 0 };
      // 바닥면적으로 가중 — 캐니언 벽을 만드는 건 큰 건물이다
      const weight = Math.max(area, 20);
      cur.wh += height.h * weight;
      cur.w += weight;
      cur.n++;
      // 그림자 계산에 쓰는 건폐 면적 — 격자 넓이 대비 비율이 곧 건물 밀도다
      cur.area += area;
      acc.set(key, cur);
      used++;
    }
  }

  /*
   * 칸마다 [index, 평균높이(m), 건물수, 바닥면적합(m²)] 네 개씩.
   *
   * 바닥면적합은 그림자 계산용이다. 격자 넓이로 나누면 건폐율이 되고,
   * 건폐율과 평균 높이와 태양 고도가 있으면 그늘 면적을 추정할 수 있다
   * (lib/risk/shade.ts).
   */
  const cells: number[] = [];
  for (const [key, v] of [...acc.entries()].sort((a, b) => a[0] - b[0])) {
    cells.push(key, Math.round(v.wh / v.w), v.n, Math.round(v.area));
  }

  const out = {
    minLat: MIN_LAT,
    minLng: MIN_LNG,
    dLat: Number(dLat.toFixed(8)),
    dLng: Number(dLng.toFixed(8)),
    rows,
    cols,
    cellM: CELL_M,
    cells,
  };

  const target = 'src/data/geo/canyon-grid.json';
  await new Promise<void>((resolve, reject) => {
    const stream = createWriteStream(target);
    stream.on('error', reject);
    stream.on('finish', resolve);
    stream.end(JSON.stringify(out));
  });

  const filled = cells.length / 4;
  console.log(`\n입력      ${basename(input)}`);
  console.log(`읽은 건물 ${read.toLocaleString('ko-KR')}`);
  console.log(`대전 밖   ${outside.toLocaleString('ko-KR')}`);
  console.log(`높이 없음 ${noHeight.toLocaleString('ko-KR')}`);
  console.log(`사용      ${used.toLocaleString('ko-KR')} (층수로 환산 ${fromFloors.toLocaleString('ko-KR')})`);
  console.log(
    `격자      ${rows}×${cols} · 값 있는 셀 ${filled.toLocaleString('ko-KR')} (${((filled / (rows * cols)) * 100).toFixed(1)}%)`,
  );
  console.log(`저장      ${target}`);
  console.log('');
  console.log(
    '다음: src/data/buildings.ts 의 CANYON_SOURCE 를 molit-building 으로 바꾸세요.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
