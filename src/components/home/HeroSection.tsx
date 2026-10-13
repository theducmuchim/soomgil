import type { RiskSnapshot } from "@/types";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { RiskScore } from "@/components/risk/RiskBadge";
import { INDICATORS } from "@/config/indicators";
import { getSeasonMeta } from "@/lib/risk/season";
import { FreshnessStamp } from "@/components/common/FreshnessStamp";
import { CountUp } from "@/components/motion/CountUp";

/**
 * 실시간 현황 섹션.
 *
 * 원래는 슬로건을 얹은 히어로였다. 사진 랜딩 히어로가 위로 올라오면서
 * 슬로건은 그쪽이 맡고, 여기는 지금 시점의 실제 계산 결과만 남겼다.
 * 한 페이지에 h1 이 둘일 이유도 없고, 같은 문장이 두 번 나올 이유도 없다.
 *
 * 남은 것들은 전부 살아 있는 값이다 — 종합 위험도, 분지 대기정체 보정,
 * 가장 높은/낮은 지역, 특보. 첫 화면에서 "이 서비스가 진짜 돌아가고 있다"가
 * 보여야 한다는 원래 목적은 이 패널이 그대로 이어받는다.
 */
export function HeroSection({ snapshot }: { snapshot: RiskSnapshot }) {
  const season = getSeasonMeta(snapshot.season);
  const primary = snapshot.primaryIndicators[0];

  const sorted = [...snapshot.districts].sort((a, b) => b.score - a.score);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];

  return (
    <section className="border-b border-cream-line bg-cream">
      <Container>
        <div className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-14 lg:py-20">
          {/* 왼쪽 — 지금 계절과 핵심 지표, 그리고 바로 쓰는 두 버튼 */}
          <div>
            {/*
              알약 배지를 걷어냈다.

              점 하나 찍힌 pill 에 "지금은 여름 · 핵심 지표 폭염"을 넣어 뒀었는데,
              그 형태는 어느 서비스에 붙여도 말이 되는 장식이라 화면이 템플릿처럼
              읽힌다. 여기 담긴 건 실제로 계산된 값(계절과 이번 계절의 최우선
              지표)이므로, 장식을 벗기고 값으로 보이게 정의 목록으로 쓴다.
            */}
            <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <div>
                <dt className="text-[0.75rem] font-semibold tracking-[0.08em] text-ink-400">
                  지금 계절
                </dt>
                <dd className="mt-1 font-display text-[1.375rem] leading-none font-normal text-night">
                  {season.label}
                </dd>
              </div>
              <div>
                <dt className="text-[0.75rem] font-semibold tracking-[0.08em] text-ink-400">
                  핵심 지표
                </dt>
                <dd className="mt-1 font-display text-[1.375rem] leading-none font-normal text-night">
                  {primary ? INDICATORS[primary].shortLabel : "미세먼지"}
                </dd>
              </div>
            </dl>

            {/*
              히어로가 이미 서비스 설명을 한 문단 했다. 같은 말을 여기서 한 번 더
              하면 스크롤하는 사람에게는 그냥 반복으로 읽힌다. 이 자리는 지금
              화면에서 무엇을 할 수 있는지만 말한다.
            */}
            <p className="mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-ink-500">
              {season.headline} 회원가입 없이 아래 값들을 그대로 확인할 수
              있습니다.
            </p>

            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
              <Button href="/route" size="lg">
                지금 경로 찾기
              </Button>
              <Button href="/risk-map" variant="secondary" size="lg">
                위험 지도 보기
              </Button>
            </div>
          </div>

          {/* 오른쪽 — 지금 계산된 실제 값 */}
          <div className="rounded-2xl border border-cream-line bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h2 className="text-[0.875rem] font-semibold text-night">
                지금 대전 종합 위험도
              </h2>
              {/*
                "실시간"이라는 말 대신 시각을 보여준다.
                아래 숫자들이 언제 것인지가 바로 옆에 붙어 있어야 믿을 수 있다.
              */}
              <FreshnessStamp
                baseTime={snapshot.baseTime}
                preview={snapshot.source === "mock"}
                degraded={snapshot.degradedSources}
                className="rounded-full border border-cream-line bg-cream-deep px-2.5 py-1 text-ink-700"
              />
            </div>

            <RiskScore
              score={snapshot.cityAverage.score}
              level={snapshot.cityAverage.level}
              className="mt-4"
            />

            {/* 대기정체 보정 — 이 서비스의 핵심 계산을 첫 화면에서 바로 노출한다 */}
            <div className="mt-5 rounded-xl bg-cream-deep px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[0.8125rem] font-medium text-ink-500">
                  분지 대기정체 보정
                </span>
                <span className="tabular font-display text-[1.25rem] leading-none font-normal text-risk-high">
                  <CountUp
                    to={snapshot.cityAverage.stagnationDeltaPct}
                    decimals={1}
                    prefix={snapshot.cityAverage.stagnationDeltaPct > 0 ? '+' : ''}
                    suffix="%"
                  />
                </span>
              </div>
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ink-400">
                보정 전 {snapshot.cityAverage.baseScore}점 → 보정 후{" "}
                {snapshot.cityAverage.score}점 · 대기정체지수{" "}
                {Math.round(snapshot.stagnation.value)}
              </p>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-cream-line px-3.5 py-3">
                <dt className="text-[0.75rem] font-medium text-ink-400">
                  가장 높은 곳
                </dt>
                <dd className="mt-1 text-[0.875rem] font-semibold text-night">
                  {worst.areaName}{" "}
                  <span className="tabular text-ink-400">
                    {Math.round(worst.score)}
                  </span>
                </dd>
              </div>
              <div className="rounded-xl border border-cream-line px-3.5 py-3">
                <dt className="text-[0.75rem] font-medium text-ink-400">
                  가장 낮은 곳
                </dt>
                <dd className="mt-1 text-[0.875rem] font-semibold text-night">
                  {best.areaName}{" "}
                  <span className="tabular text-ink-400">
                    {Math.round(best.score)}
                  </span>
                </dd>
              </div>
            </dl>

            {snapshot.warnings.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {snapshot.warnings.map((w) => (
                  <li
                    key={w.title}
                    className="flex items-center gap-2 rounded-full bg-risk-very-high/8 px-3 py-2 text-[0.8125rem] font-medium text-risk-very-high"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    >
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

            <p className="mt-4 border-t border-cream-line pt-3 text-[0.75rem] text-ink-400">
              출처 기상청 · 한국환경공단 에어코리아 공공데이터
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
