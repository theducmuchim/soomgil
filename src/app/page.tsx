import { getRiskSnapshot } from '@/lib/api';
import { parseSeason } from '@/lib/risk/season';
import { HeroSection } from '@/components/home/HeroSection';
import { ProblemSolutionSection } from '@/components/home/ProblemSolutionSection';
import { LiveDashboardSection } from '@/components/home/LiveDashboardSection';
import { FeatureCards } from '@/components/home/FeatureCards';
import { NoticePreview } from '@/components/home/NoticePreview';
import { SeasonProducts } from '@/components/commerce/SeasonProducts';
import { AdSlot } from '@/components/ads/AdSlot';

/**
 * 홈.
 *
 * 서버 컴포넌트에서 스냅샷을 한 번만 만들어 각 섹션에 내려준다.
 * 섹션마다 따로 부르면 같은 공공데이터를 중복 호출하게 된다.
 *
 * ?season=winter 로 계절을 강제할 수 있다 (mock 모드 한정, 시연용).
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  const snapshot = await getRiskSnapshot({ seasonOverride: parseSeason(season) });

  return (
    <>
      <HeroSection snapshot={snapshot} />
      <ProblemSolutionSection snapshot={snapshot} />
      <LiveDashboardSection snapshot={snapshot} />

      <AdSlot season={snapshot.season} variant="leaderboard" />

      <SeasonProducts snapshot={snapshot} />
      <FeatureCards />

      <AdSlot season={snapshot.season} variant="inline" />

      <NoticePreview />
    </>
  );
}
