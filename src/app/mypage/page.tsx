import type { Metadata } from 'next';
import { getRiskSnapshot } from '@/lib/api';
import { parseSeason } from '@/lib/risk/season';
import { PageHeading } from '@/components/layout/PageHeading';
import { Container } from '@/components/layout/Container';
import { MyPageSettings } from '@/components/account/MyPageSettings';
import { formatKstLong } from '@/lib/utils/time';

export const metadata: Metadata = {
  title: '마이페이지',
  description: '관심 지역과 자주 쓰는 경로를 저장해두면 첫 화면에서 바로 확인할 수 있습니다.',
};

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  const snapshot = await getRiskSnapshot({ seasonOverride: parseSeason(season) });

  return (
    <>
      <PageHeading
        eyebrow="내 설정"
        title="마이페이지"
        description={`관심 지역과 자주 다니는 경로를 저장해두면 매번 다시 입력하지 않아도 됩니다. 기준 ${formatKstLong(snapshot.baseTime)}.`}
        size="narrow"
      />

      <Container size="narrow" className="py-8 sm:py-10">
        <MyPageSettings districts={snapshot.districts} />
      </Container>
    </>
  );
}
