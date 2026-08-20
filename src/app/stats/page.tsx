import type { Metadata } from 'next';
import { getRiskSnapshot } from '@/lib/api';
import { getHourlyTrend, safestHours } from '@/lib/api/trend';
import { parseSeason, getSeasonMeta } from '@/lib/risk/season';
import { PageHeading } from '@/components/layout/PageHeading';
import { Container } from '@/components/layout/Container';
import { DistrictBarChart } from '@/components/chart/DistrictBarChart';
import { HourlyTrendChart } from '@/components/chart/HourlyTrendChart';
import { RiskBadge } from '@/components/risk/RiskBadge';
import { INDICATORS, RISK_LEVELS } from '@/config/indicators';
import { kstParts, formatKstLong } from '@/lib/utils/time';
import { formatDelta } from '@/lib/utils/format';
import { scoreColor } from '@/lib/risk/color';

export const metadata: Metadata = {
  title: '통계',
  description: '자치구별 위험도 비교와 시간대별 추이를 확인합니다.',
};

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  const snapshot = await getRiskSnapshot({ seasonOverride: parseSeason(season) });
  const seasonMeta = getSeasonMeta(snapshot.season);

  const trend = getHourlyTrend(snapshot);
  const nowHour = kstParts(new Date(snapshot.baseTime)).hour;
  const safest = safestHours(trend, nowHour, 3);
  const bestHour = safest[0];

  const worstHour = [...trend].sort((a, b) => b.score - a.score)[0];
  const ranked = [...snapshot.districts].sort((a, b) => b.score - a.score);

  return (
    <>
      <PageHeading
        eyebrow="운영 현황"
        title="통계"
        description={`${seasonMeta.label}철 핵심 지표 기준입니다. 어디가 나쁜지와 언제 나가는 게 나은지를 함께 봅니다.`}
        actions={
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-2.5">
            <div>
              <p className="text-[11px] text-ink-400">대전 평균</p>
              <p className="tabular text-[19px] leading-tight font-bold text-ink-900">
                {Math.round(snapshot.cityAverage.score)}
              </p>
            </div>
            <RiskBadge level={snapshot.cityAverage.level} />
          </div>
        }
      />

      <Container className="py-8 sm:py-10">
        {/* 결론 먼저 */}
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="가장 위험한 자치구"
            value={ranked[0].areaName}
            detail={`${Math.round(ranked[0].score)}점 · ${INDICATORS[ranked[0].dominantIndicator].shortLabel}`}
            color={scoreColor(ranked[0].score)}
          />
          <SummaryCard
            label="오늘 가장 안전한 시각"
            value={`${bestHour.hour}시`}
            detail={`${Math.round(bestHour.score)}점 · ${RISK_LEVELS[bestHour.level].label}`}
            color={RISK_LEVELS.low.color}
          />
          <SummaryCard
            label="오늘 정점"
            value={`${worstHour.hour}시`}
            detail={`${Math.round(worstHour.score)}점 · ${RISK_LEVELS[worstHour.level].label}`}
            color={scoreColor(worstHour.score)}
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* 자치구 비교 */}
          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-bold text-ink-900">자치구별 위험도</h2>
              <p className="text-[11.5px] text-ink-400">
                대기정체 보정 후 · 100점 만점
              </p>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
              모든 자치구에 같은 대기정체 보정({formatDelta(snapshot.cityAverage.stagnationDeltaPct, 1)}{' '}
              내외)이 적용됩니다. 구별 차이는 지표값 자체에서 나옵니다.
            </p>
            <div className="mt-4">
              <DistrictBarChart districts={snapshot.districts} />
            </div>
          </section>

          {/* 시간대별 추이 */}
          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-bold text-ink-900">오늘 시간대별 추이</h2>
              <p className="text-[11.5px] text-ink-400">대전 평균</p>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">
              {seasonMeta.label}철은 {trendNote(snapshot.season)}
            </p>
            <div className="mt-4">
              <HourlyTrendChart trend={trend} safestHour={bestHour.hour} />
            </div>
          </section>
        </div>

        {/* 안전한 시간대 추천 */}
        <section className="mt-5 rounded-2xl border border-brand-200 bg-brand-50/60 p-5 sm:p-6">
          <h2 className="text-[15px] font-bold text-brand-700">
            지금 이후 나가기 좋은 시간대
          </h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {safest.map((point, i) => (
              <li
                key={point.hour}
                className="flex items-center gap-3 rounded-xl border border-brand-200 bg-surface px-4 py-3"
              >
                <span className="tabular text-[13px] font-bold text-brand-300">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="tabular text-[16px] font-bold text-ink-900">
                    {point.hour}시
                  </p>
                  <p className="text-[11.5px] text-ink-400">
                    위험도 {Math.round(point.score)} ·{' '}
                    {RISK_LEVELS[point.level].label}
                  </p>
                </div>
                <span
                  className="h-8 w-1.5 rounded-full"
                  style={{ backgroundColor: scoreColor(point.score) }}
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11.5px] leading-relaxed text-brand-700/75">
            기준 {formatKstLong(snapshot.baseTime)} · 시간대별 값은 기상청 지수 예보와
            에어코리아 예보통보를 합쳐 계산합니다.
            {snapshot.source === 'mock' && ' 현재는 예시 데이터입니다.'}
          </p>
        </section>
      </Container>
    </>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3.5">
      <p className="text-[11.5px] font-medium text-ink-400">{label}</p>
      <p className="mt-1.5 flex items-center gap-2">
        <span
          className="h-3.5 w-1 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <span className="text-[19px] leading-none font-bold text-ink-900">{value}</span>
      </p>
      <p className="tabular mt-1.5 text-[12px] text-ink-500">{detail}</p>
    </div>
  );
}

/** 계절마다 하루 중 위험이 몰리는 시간대가 다르다 */
function trendNote(season: string): string {
  switch (season) {
    case 'spring':
      return '꽃가루가 오전 6~11시에 가장 많이 날립니다.';
    case 'summer':
      return '체감온도와 오존 모두 오후 2~4시에 정점을 찍습니다.';
    case 'autumn':
      return '잡초 꽃가루가 아침에, 미세먼지가 출퇴근 시간에 오릅니다.';
    default:
      return '난방과 교통 배출이 겹치는 아침·저녁에 두 번 정점을 찍습니다.';
  }
}
