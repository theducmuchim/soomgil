import type { Metadata } from 'next';
import { getRiskSnapshot } from '@/lib/api';
import { parseSeason, getSeasonMeta } from '@/lib/risk/season';
import { deriveDongRisks } from '@/lib/risk/dong';
import { PageHeading } from '@/components/layout/PageHeading';
import { Container } from '@/components/layout/Container';
import { RiskMapView } from '@/components/map/RiskMapView';
import { AdSlot } from '@/components/ads/AdSlot';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { formatDelta } from '@/lib/utils/format';

export const metadata: Metadata = {
  title: '위험 지도',
  description:
    '대전 5개 자치구와 78개 행정동 단위로 지금 위험도를 색으로 확인합니다.',
};

export default async function RiskMapPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  const snapshot = await getRiskSnapshot({ seasonOverride: parseSeason(season) });
  const dongRisks = deriveDongRisks(snapshot);
  const seasonMeta = getSeasonMeta(snapshot.season);

  return (
    <>
      <PageHeading
        eyebrow="실시간 현황"
        title="위험 지도"
        description={`${seasonMeta.label}철 핵심 지표 기준으로 자치구·행정동 단위 위험도를 표시합니다. 지역을 누르면 점수 계산 과정을 볼 수 있습니다.`}
        size="wide"
        actions={
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-2.5">
            <div>
              <p className="text-[0.6875rem] text-ink-400">대전 평균</p>
              <p className="tabular text-[1.1875rem] leading-tight font-bold text-ink-900">
                {Math.round(snapshot.cityAverage.score)}
                <span className="ml-1 text-[0.6875rem] font-medium text-ink-400">
                  대기정체 {formatDelta(snapshot.cityAverage.stagnationDeltaPct, 1)}
                </span>
              </p>
            </div>
            <RiskBadge level={snapshot.cityAverage.level} />
          </div>
        }
      />

      <Container size="wide" className="py-7 sm:py-9">
        <RiskMapView snapshot={snapshot} dongRisks={dongRisks} />
        <AdSlot season={snapshot.season} variant="inline" bare className="mt-6" />
      </Container>
    </>
  );
}
