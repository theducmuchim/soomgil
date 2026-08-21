import type { RiskSnapshot } from '@/types';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { DistrictRiskBar } from '@/components/risk/DistrictRiskBar';
import { IndicatorCard } from '@/components/risk/IndicatorCard';
import { getSeasonMeta, getSeasonWeights } from '@/lib/risk/season';
import { kstParts, formatKstLong } from '@/lib/utils/time';
import { RISK_LEVELS } from '@/config/indicators';

/**
 * 실시간 현황 대시보드.
 *
 * 왼쪽: 자치구 5곳 위험도 순위 — "지금 어디가 나쁜가"
 * 오른쪽: 이번 계절 핵심 지표 현재값 — "무엇 때문에 나쁜가"
 * 두 질문에 한 화면에서 답하는 게 이 섹션의 목적이다.
 */
export function LiveDashboardSection({ snapshot }: { snapshot: RiskSnapshot }) {
  const season = getSeasonMeta(snapshot.season);
  const { month } = kstParts(new Date(snapshot.baseTime));
  const weights = getSeasonWeights(snapshot.season, month);

  const ranked = [...snapshot.districts].sort((a, b) => b.score - a.score);
  const maxScore = ranked[0]?.score ?? 100;

  // 대표 지표값은 가장 위험한 구 기준으로 보여준다.
  // 시 평균을 쓰면 "어디도 그렇게까지 나쁘진 않다"처럼 읽혀 경고 기능을 잃는다.
  const worst = ranked[0];
  const primaryReadings = snapshot.primaryIndicators
    .map((id) => worst.readings.find((r) => r.id === id))
    .filter((r) => r !== undefined);

  const stagnationReading = worst.readings.find((r) => r.id === 'stagnation');

  return (
    <section className="border-b border-line bg-surface-sunken py-14 sm:py-20">
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[12.5px] font-semibold tracking-wide text-brand-600">
              실시간 현황
            </p>
            <h2 className="mt-2 text-[26px] leading-tight font-bold tracking-tight text-ink-900 sm:text-[32px]">
              지금 대전, 어디가 위험한가
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-500">
              {season.headline} 자치구별 종합 위험도와 이번 계절 핵심 지표를 함께
              확인하세요.
            </p>
          </div>
          <Button href="/risk-map" variant="secondary" size="md" className="shrink-0">
            지도로 보기
          </Button>
        </div>

        <div className="mt-9 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-6">
          {/* 자치구 순위 */}
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[14px] font-bold text-ink-900">자치구별 위험도</h3>
              <span className="text-[11.5px] text-ink-400">위험한 순</span>
            </div>

            <ol className="mt-3 divide-y divide-line">
              {ranked.map((area) => (
                <li key={area.areaId}>
                  <DistrictRiskBar area={area} maxScore={maxScore} href="/risk-map" />
                </li>
              ))}
            </ol>

            {/* 범례 — 색만으로 등급을 구분하지 않도록 라벨을 함께 둔다 */}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-4">
              {(['low', 'moderate', 'high', 'veryHigh'] as const).map((level) => (
                <span
                  key={level}
                  className="inline-flex items-center gap-1.5 text-[11px] text-ink-400"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: RISK_LEVELS[level].color }}
                    aria-hidden="true"
                  />
                  {RISK_LEVELS[level].label}
                </span>
              ))}
            </div>
          </div>

          {/* 핵심 지표 */}
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="text-[14px] font-bold text-ink-900">
                {season.label}철 핵심 지표
              </h3>
              <span className="text-[11.5px] text-ink-400">
                가장 위험한 {worst.areaName} 기준
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {primaryReadings.map((reading) => (
                <IndicatorCard
                  key={reading.id}
                  reading={reading}
                  weight={weights[reading.id]}
                />
              ))}
            </div>

            {/* 대기정체는 다른 지표와 성격이 달라(보정계수) 따로 뺀다 */}
            {stagnationReading && (
              <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-[12.5px] font-semibold text-brand-700">
                    대기정체지수 {Math.round(stagnationReading.value)}
                  </p>
                  <p className="text-[12px] font-medium text-brand-700">
                    종합 위험도 ×{worst.breakdown.stagnationFactor}
                  </p>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-brand-700/80">
                  분지 지형 때문에 공기가 빠져나가지 못하는 정도입니다. 다른 지표들의
                  가중합({worst.breakdown.baseScore}점)에 곱해져 최종{' '}
                  {worst.breakdown.score}점이 됩니다.
                </p>
              </div>
            )}

            <p className="mt-4 border-t border-line pt-3 text-[11.5px] text-ink-400">
              기준 {formatKstLong(snapshot.baseTime)} ·{' '}
              {snapshot.source !== 'mock'
                ? '기상청·에어코리아 실시간'
                : snapshot.preview
                  ? '예시 데이터 (오늘이 아닌 계절이라 관측값이 없습니다)'
                  : '예시 데이터 (실 인증키 연동 시 자동 전환)'}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
