import type { Metadata } from 'next';
import { getRiskSnapshot } from '@/lib/api';
import { parseSeason, getSeasonMeta } from '@/lib/risk/season';
import { deriveDongRisks } from '@/lib/risk/dong';
import { PageHeading } from '@/components/layout/PageHeading';
import { Container } from '@/components/layout/Container';
import { LayerMapView } from '@/components/map/LayerMapView';

export const metadata: Metadata = {
  title: '레이어 지도',
  description:
    '꽃가루·미세먼지·폭염·오존 레이어를 켜고 끄면서 같은 지역이 지표별로 어떻게 달라지는지 비교합니다.',
};

export default async function LayersPage({
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
        eyebrow="위험요소별 보기"
        title="레이어 지도"
        description={`같은 지역이라도 지표에 따라 위험도가 다릅니다. 지금은 ${seasonMeta.label}철이라 서비스 기간이 아닌 레이어는 꺼져 있습니다.`}
        size="wide"
      />

      <Container size="wide" className="py-7 sm:py-9">
        <LayerMapView snapshot={snapshot} dongRisks={dongRisks} />
      </Container>
    </>
  );
}
