'use client';

import type { Season } from '@/types';
import { Container } from '@/components/layout/Container';
import { usePremium } from '@/lib/subscription/usePremium';
import { cn } from '@/lib/utils/cn';

/**
 * 배너 광고 자리.
 *
 * ── 지금은 플레이스홀더 ────────────────────────────────
 * 실제 광고 네트워크(구글 애드센스 등)는 계정 심사와 사업자 명의가 필요해서
 * 아직 연결하지 않았다. 지금은 실제 배너와 같은 크기·위치에 샘플 문구를 넣어
 * "여기에 광고가 들어간다"는 것만 보여준다.
 *
 * ── 나중에 실제 광고로 바꾸는 방법 ──────────────────────
 * 아래 Placeholder 부분만 광고 스크립트로 교체하면 된다.
 * 예를 들어 애드센스라면:
 *
 *   <ins className="adsbygoogle"
 *        style={{ display: 'block' }}
 *        data-ad-client="ca-pub-XXXXXXXX"
 *        data-ad-slot="XXXXXXXX"
 *        data-ad-format="auto"
 *        data-full-width-responsive="true" />
 *
 * 이 컴포넌트를 쓰는 화면들은 전혀 고칠 필요가 없다.
 *
 * ⚠ 광고를 붙일 때는 "광고" 표시를 반드시 유지할 것.
 *   표시광고법상 광고임을 알 수 있게 해야 하고, 공공서비스 톤에서도
 *   콘텐츠와 광고가 구분되지 않으면 신뢰를 잃는다.
 *
 * ── 프리미엄이면 자리째 사라진다 ────────────────────────
 * 구독의 첫 번째 값어치가 "광고 없음"이라, 빈 회색 상자를 남겨두면 의미가 없다.
 * 자리 자체를 렌더하지 않는다. 구독 여부는 브라우저에만 있으므로
 * 이 컴포넌트는 클라이언트에서 판단한다.
 */

export type AdVariant = 'leaderboard' | 'inline';

/**
 * 계절별 샘플 문구 — 실제 광고가 어떤 모습일지 보여주기 위한 것.
 *
 * 한 페이지에 배너가 둘 이상 들어가므로 자리마다 다른 문구를 쓴다.
 * 같은 배너가 두 번 보이면 광고 지면이 아니라 렌더 오류처럼 읽힌다.
 */
const SAMPLE_COPY: Record<Season, Record<AdVariant, { headline: string; sponsor: string }>> =
  {
    spring: {
      leaderboard: {
        headline: '꽃가루 차단 KF94 마스크, 지금 최대 30% 할인',
        sponsor: '마스크 브랜드',
      },
      inline: {
        headline: '봄철 알레르기 눈 관리, 인공눈물 기획전',
        sponsor: '안과용품 브랜드',
      },
    },
    summer: {
      leaderboard: {
        headline: '폭염 대비 넥쿨러·휴대용 선풍기 기획전',
        sponsor: '쿨링용품 브랜드',
      },
      inline: {
        headline: '자외선 차단 SPF50+ 선케어 모음전',
        sponsor: '선케어 브랜드',
      },
    },
    autumn: {
      leaderboard: {
        headline: '가을 비염 시즌, 코 세척기 1+1 행사',
        sponsor: '위생용품 브랜드',
      },
      inline: {
        headline: '환절기 실내 공기질 관리 가전 특가',
        sponsor: '가전 브랜드',
      },
    },
    winter: {
      leaderboard: {
        headline: '초미세먼지 시즌 공기청정기 필터 할인',
        sponsor: '가전 브랜드',
      },
      inline: {
        headline: '한파 대비 발열내의·핫팩 겨울 준비전',
        sponsor: '방한용품 브랜드',
      },
    },
  };

export function AdSlot({
  season,
  variant = 'leaderboard',
  /** 페이지 안에 끼워 넣을 때는 Container 없이 쓴다 */
  bare = false,
  className,
}: {
  season: Season;
  variant?: AdVariant;
  bare?: boolean;
  className?: string;
}) {
  const [isPremium] = usePremium();

  // 프리미엄 구독자에게는 광고 지면을 아예 만들지 않는다
  if (isPremium) return null;

  const copy = SAMPLE_COPY[season][variant];

  const banner = (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-line bg-surface-raised',
        variant === 'leaderboard' ? 'min-h-[96px] px-5 py-4' : 'min-h-[72px] px-4 py-3.5',
      )}
      // 스크린리더에는 광고임을 먼저 알린다
      role="complementary"
      aria-label="광고 영역"
    >
      {/* 광고 표시 — 실제 광고로 바꿔도 반드시 유지 */}
      <span className="absolute top-2 right-2 rounded bg-ink-900/8 px-1.5 py-0.5 text-[10px] font-semibold text-ink-400">
        광고
      </span>

      <div className="flex items-center gap-4">
        {/* 브랜드 로고가 들어갈 자리 */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-sunken sm:h-14 sm:w-14"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-300" fill="none">
            <rect
              x="3.5"
              y="5.5"
              width="17"
              height="13"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M3.5 15.5l4.5-4 3.5 3 3-2.5 6 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'leading-snug font-semibold text-ink-700',
              variant === 'leaderboard' ? 'text-[14px]' : 'text-[13px]',
            )}
          >
            {copy.headline}
          </p>
          <p className="mt-1 text-[11.5px] text-ink-400">
            여기에 계절 맞춤 {copy.sponsor} 광고가 표시됩니다
          </p>
        </div>

        <span className="hidden shrink-0 rounded-lg border border-line-strong px-3.5 py-2 text-[12.5px] font-semibold text-ink-400 sm:block">
          자세히 보기
        </span>
      </div>
    </div>
  );

  if (bare) return <div className={className}>{banner}</div>;

  return (
    <div className={cn('py-6', className)}>
      <Container>{banner}</Container>
    </div>
  );
}
