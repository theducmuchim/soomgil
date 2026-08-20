import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getRiskSnapshot } from '@/lib/api';
import { parseSeason, getSeasonMeta } from '@/lib/risk/season';
import { deriveDongRisks } from '@/lib/risk/dong';
import { planRoutes, TRAVEL_MODES, type TravelMode } from '@/lib/routing';
import { PLACE_BY_ID } from '@/data/places';
import { INDICATORS } from '@/config/indicators';
import { PageHeading } from '@/components/layout/PageHeading';
import { Container } from '@/components/layout/Container';
import { RoutePlannerForm } from '@/components/route/RoutePlannerForm';
import { RouteView } from '@/components/route/RouteView';
import { WindArrow } from '@/components/map/WindArrow';
import { formatDelta } from '@/lib/utils/format';

export const metadata: Metadata = {
  title: '경로 안내',
  description:
    '출발지와 목적지를 넣으면 지금 시점 기준으로 상대적으로 안전한 경로를 비교해 보여줍니다.',
};

/*
 * 기본 시연 조합.
 *
 * 275개 출발/도착 조합을 전부 계산해 본 결과, 노출 개선폭은 평균 2% 수준이고
 * 하천변 같은 실제 대안 경로가 있는 조합에서만 10% 이상 벌어진다.
 * 첫 화면은 이 기능이 무엇을 하는지 보여줘야 하므로,
 * 12분을 더 써서 노출을 10% 줄이는 조합을 기본값으로 둔다.
 * (개선 여지가 없는 조합에서는 화면이 "차이가 크지 않다"고 솔직하게 말한다)
 */
const DEFAULT_FROM = 'government-complex';
const DEFAULT_TO = 'gyejoksan';

export default async function RoutePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; mode?: string; season?: string }>;
}) {
  const params = await searchParams;

  const origin = PLACE_BY_ID[params.from ?? ''] ?? PLACE_BY_ID[DEFAULT_FROM];
  const destination = PLACE_BY_ID[params.to ?? ''] ?? PLACE_BY_ID[DEFAULT_TO];
  const mode: TravelMode =
    params.mode && params.mode in TRAVEL_MODES ? (params.mode as TravelMode) : 'walk';

  const snapshot = await getRiskSnapshot({ seasonOverride: parseSeason(params.season) });
  const dongRisks = deriveDongRisks(snapshot);
  const result = planRoutes({ origin, destination, snapshot, dongRisks, mode });

  const season = getSeasonMeta(snapshot.season);
  const wind =
    snapshot.districts.find((d) => d.areaId === origin.districtId)?.wind ??
    snapshot.districts[0].wind;

  const safest = result.options.find((o) => o.kind === 'safest');
  const primaryLabel = snapshot.primaryIndicators
    .slice(0, 2)
    .map((id) => INDICATORS[id].shortLabel)
    .join(' · ');

  return (
    <>
      <PageHeading
        eyebrow="실시간 위험도 · 경로 추천"
        title="경로 안내"
        description={`${season.label}철 핵심 지표(${primaryLabel})와 실시간 풍향을 반영해 상대적으로 안전한 경로를 계산합니다.`}
        size="wide"
      />

      <Container size="wide" className="py-7 sm:py-9">
        <div className="flex flex-col gap-5">
          <Suspense fallback={<FormSkeleton />}>
            <RoutePlannerForm
              originId={origin.id}
              destinationId={destination.id}
              mode={mode}
            />
          </Suspense>

          {/* 결과 요약 — 카드를 보기 전에 결론부터 */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-5 py-4">
            {safest && safest.exposureDeltaPct < -0.5 ? (
              <p className="text-[14px] leading-relaxed text-ink-900">
                <strong className="font-bold">{safest.label}</strong>로 가면 최단 경로보다
                노출량이{' '}
                <strong className="font-bold text-risk-low">
                  {formatDelta(safest.exposureDeltaPct, 1)}
                </strong>{' '}
                줄어듭니다.
              </p>
            ) : (
              <p className="text-[14px] leading-relaxed text-ink-900">
                지금은 경로별 노출량 차이가 크지 않습니다. 최단 경로로 가셔도 됩니다.
              </p>
            )}

            <span className="flex items-center gap-2 text-[12.5px] text-ink-500">
              <WindArrow degree={wind.degree} speed={wind.speed} className="h-8 w-8" />
              {wind.label}풍 {wind.speed}m/s
            </span>

            <span className="text-[12.5px] text-ink-500">
              대전 평균 {Math.round(snapshot.cityAverage.score)}점 · 대기정체{' '}
              {formatDelta(snapshot.cityAverage.stagnationDeltaPct, 1)}
            </span>
          </div>

          <RouteView result={result} dongRisks={dongRisks} />

          <p className="rounded-lg bg-surface-sunken px-4 py-3 text-[11.5px] leading-relaxed text-ink-500">
            경로는 실제 도로망이 아니라 대전 전역에 깐 약 550m 격자 위에서 A* 탐색으로
            계산합니다. 도로를 정확히 따라가지는 않지만 어느 지역을 지나가는지는 정확하며,
            이 서비스가 비교하려는 것도 그 부분입니다. 실제 도로 경로가 필요해지면 경로
            생성 부분만 교체하면 노출량 계산은 그대로 동작합니다.
          </p>
        </div>
      </Container>
    </>
  );
}

function FormSkeleton() {
  return <div className="h-[188px] animate-pulse rounded-2xl border border-line bg-surface-sunken" />;
}
