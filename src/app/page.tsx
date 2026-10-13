import { Suspense } from 'react';
import { Reveal } from '@/components/motion/Reveal';
import { RouteStoryline } from '@/components/home/RouteStoryline';
import HeroSection from '@/components/HeroSection';
import { getRiskSnapshot } from '@/lib/api';
import { parseSeason, resolveSeason } from '@/lib/risk/season';
import { ALLOW_SEASON_OVERRIDE } from '@/lib/env';
import { SeasonToggle } from '@/components/season/SeasonToggle';
import { HeroSection as LiveHeroSection } from '@/components/home/HeroSection';
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
      <HeroSection />

      {/*
        계절 토글은 히어로 아래다.
        레이아웃(모든 페이지 공통)에서는 헤더 바로 밑에 오지만, 홈에서는 그
        자리가 사진 한가운데라 띠가 낄 데가 없다. 첫 화면을 사진에 온전히
        내주고, 스크롤해 데이터 구간에 들어선 지점에서 처음 보이게 한다.
      */}
      {ALLOW_SEASON_OVERRIDE && (
        <Suspense fallback={null}>
          <SeasonToggle currentSeason={resolveSeason(new Date())} />
        </Suspense>
      )}

      {/*
        히어로 아래 섹션들만 스크롤 진입으로 등장시킨다.

        히어로를 빼는 이유는 그게 첫 화면이기 때문이다. 페이지를 열자마자
        보이는 것이 떠오르면 로딩이 덜 끝난 것처럼 읽힌다. 등장은 "스크롤해서
        새로 만난 것"에만 의미가 있다.

        계절 토글도 뺀다 — 조작하는 컨트롤이라 눌러야 할 때 자리에 있어야 한다.
      */}
      <Reveal>
        <LiveHeroSection snapshot={snapshot} />
      </Reveal>
      <Reveal>
        <ProblemSolutionSection snapshot={snapshot} />
      </Reveal>
      <Reveal>
        <LiveDashboardSection snapshot={snapshot} />
      </Reveal>

      {/*
        Reveal 로 감싸지 않는다.
        이 구간은 스크롤 진행률에 맞춰 선이 그려지는데, 바깥에서 통째로
        떠오르게 하면 두 움직임이 겹쳐 선이 어디까지 왔는지 읽히지 않는다.
      */}
      <RouteStoryline />

      <Reveal>
        <AdSlot season={snapshot.season} variant="leaderboard" />
      </Reveal>

      <Reveal>
        <SeasonProducts snapshot={snapshot} />
      </Reveal>
      <Reveal>
        <FeatureCards />
      </Reveal>

      <Reveal>
        <AdSlot season={snapshot.season} variant="inline" />
      </Reveal>

      <Reveal>
        <NoticePreview />
      </Reveal>
    </>
  );
}
