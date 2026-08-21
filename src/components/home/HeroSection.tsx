import type { RiskSnapshot } from '@/types';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { RiskScore } from '@/components/risk/RiskBadge';
import { INDICATORS } from '@/config/indicators';
import { getSeasonMeta } from '@/lib/risk/season';
import { FreshnessStamp } from '@/components/common/FreshnessStamp';
import { formatDelta } from '@/lib/utils/format';

/**
 * 히어로.
 *
 * 슬로건만 걸어두지 않고 지금 시점의 실제 계산 결과를 함께 보여준다.
 * 첫 화면에서 "이 서비스가 진짜 돌아가고 있다"가 보여야 하기 때문이다.
 */
export function HeroSection({ snapshot }: { snapshot: RiskSnapshot }) {
  const season = getSeasonMeta(snapshot.season);
  const primary = snapshot.primaryIndicators[0];

  const sorted = [...snapshot.districts].sort((a, b) => b.score - a.score);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];

  return (
    <section className="border-b border-line bg-surface-sunken">
      <Container>
        <div className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14 lg:py-20">
          {/* 왼쪽 — 슬로건 */}
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[0.78125rem] font-semibold text-brand-700">
              지금은 {season.label}
              <span className="text-brand-300" aria-hidden="true">
                ·
              </span>
              핵심 지표 {primary ? INDICATORS[primary].shortLabel : '미세먼지'}
            </p>

            <h1 className="mt-5 text-[2.125rem] leading-[1.22] font-bold tracking-tight text-ink-900 sm:text-[2.75rem]">
              숨쉬기 좋은 길로
              <br />
              갑니다
            </h1>

            <p className="mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-ink-500 sm:text-base">
              대전의 꽃가루·미세먼지·폭염·오존을 공공데이터로 실시간 분석하고, 풍향까지
              반영해 지금 이 순간 상대적으로 안전한 이동 경로를 안내합니다.
            </p>

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
              <Button href="/route" size="lg">
                지금 경로 찾기
              </Button>
              <Button href="/risk-map" variant="secondary" size="lg">
                위험 지도 보기
              </Button>
            </div>

            <p className="mt-5 text-[0.78125rem] text-ink-400">
              {season.headline} 회원가입 없이 바로 확인할 수 있습니다.
            </p>
          </div>

          {/* 오른쪽 — 지금 계산된 실제 값 */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h2 className="text-[0.84375rem] font-semibold text-ink-900">
                지금 대전 종합 위험도
              </h2>
              {/*
                "실시간"이라는 말 대신 시각을 보여준다.
                아래 숫자들이 언제 것인지가 바로 옆에 붙어 있어야 믿을 수 있다.
              */}
              <FreshnessStamp
                baseTime={snapshot.baseTime}
                preview={snapshot.source === 'mock'}
                className="rounded-full border border-line bg-surface-sunken px-2.5 py-1 text-ink-700"
              />
            </div>

            <RiskScore
              score={snapshot.cityAverage.score}
              level={snapshot.cityAverage.level}
              className="mt-4"
            />

            {/* 대기정체 보정 — 이 서비스의 핵심 계산을 첫 화면에서 바로 노출한다 */}
            <div className="mt-5 rounded-lg bg-surface-sunken px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[0.78125rem] font-medium text-ink-500">
                  분지 대기정체 보정
                </span>
                <span className="tabular text-[0.9375rem] font-bold text-risk-high">
                  {formatDelta(snapshot.cityAverage.stagnationDeltaPct, 1)}
                </span>
              </div>
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink-400">
                보정 전 {snapshot.cityAverage.baseScore}점 → 보정 후{' '}
                {snapshot.cityAverage.score}점 · 대기정체지수{' '}
                {Math.round(snapshot.stagnation.value)}
              </p>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line px-3.5 py-3">
                <dt className="text-[0.71875rem] font-medium text-ink-400">가장 높은 곳</dt>
                <dd className="mt-1 text-[0.875rem] font-semibold text-ink-900">
                  {worst.areaName}{' '}
                  <span className="tabular text-ink-400">{Math.round(worst.score)}</span>
                </dd>
              </div>
              <div className="rounded-lg border border-line px-3.5 py-3">
                <dt className="text-[0.71875rem] font-medium text-ink-400">가장 낮은 곳</dt>
                <dd className="mt-1 text-[0.875rem] font-semibold text-ink-900">
                  {best.areaName}{' '}
                  <span className="tabular text-ink-400">{Math.round(best.score)}</span>
                </dd>
              </div>
            </dl>

            {snapshot.warnings.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {snapshot.warnings.map((w) => (
                  <li
                    key={w.title}
                    className="flex items-center gap-2 rounded-md bg-risk-very-high/8 px-3 py-2 text-[0.78125rem] font-medium text-risk-very-high"
                  >
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                      <path
                        d="M8 2.5 14.5 13.5H1.5L8 2.5Z M8 6.5v3 M8 11.4v.1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {w.title}
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 border-t border-line pt-3 text-[0.71875rem] text-ink-400">
              출처 기상청 · 한국환경공단 에어코리아 공공데이터
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
