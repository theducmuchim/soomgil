import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { SITE } from '@/config/site';

/** 밝은 면 위(기본) / 어두운 면 위 */
type Tone = 'dark' | 'light';

/**
 * 로고 마크 — 짙은 사각형 안에 세리프 '숨' 한 자.
 *
 * ── 왜 픽토그램을 걷어냈나 ────────────────────────────────
 * 예전 마크는 굽은 경로선 위로 공기 흐름이 지나가는 SVG였다. 뜻은 맞았지만
 * 32px에서는 선 세 개가 뭉쳐 그냥 얼룩으로 보였고, 무엇보다 서비스 이름을
 * 이미 옆에 쓰고 있는데 그림으로 한 번 더 설명하는 셈이었다.
 *
 * 브랜드를 글자꼴로 말하기로 하면서 마크도 글자로 내렸다. 제주돌담체의
 * 굵고 뭉툭한 획은 작은 크기에서 오히려 또렷하다.
 *
 * ── 크기 ──────────────────────────────────────────────────
 * font-size 하나가 전부를 정한다. 상자는 h-[1em] w-[1em] 이고 모서리는
 * rounded-[28%], 글자는 text-[0.56em] 라서 text-[2rem] 을 text-[1.75rem] 로
 * 바꾸면 셋이 같이 따라온다. 크기를 바꿀 때 두 군데를 맞춰 고칠 일이 없다.
 *
 * rem 을 쓰는 이유는 '크게 보기'(html[data-ui-scale]) 때문이다. px 로 두면
 * 글자 크기를 키워도 로고만 그대로 남아 헤더가 어긋난다.
 */
export function LogoMark({
  className,
  tone = 'dark',
}: {
  className?: string;
  tone?: Tone;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-[1em] w-[1em] shrink-0 items-center justify-center rounded-[28%] text-[2rem]',
        tone === 'dark' ? 'bg-night text-cream' : 'bg-cream text-night',
        className,
      )}
    >
      {/*
        font-normal 을 명시하는 건 제주돌담체가 굵기 한 벌짜리이기 때문이다.
        헤더처럼 부모에 font-semibold 가 걸린 자리에 들어가면 브라우저가
        가짜 볼드를 그려 획이 뭉갠다.
      */}
      <span className="font-display text-[0.56em] leading-none font-normal">숨</span>
    </span>
  );
}

/** 마크 + 세리프 워드마크. 어두운 배경(히어로·포레스트 구간)에서는 tone="light". */
export function Logo({
  className,
  href = '/',
  showTagline = false,
  tone = 'dark',
}: {
  className?: string;
  href?: string;
  showTagline?: boolean;
  tone?: Tone;
}) {
  const light = tone === 'light';

  return (
    <Link href={href} className={cn('flex shrink-0 items-center gap-2', className)}>
      <LogoMark className="text-[1.875rem]" tone={tone} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display text-[1.375rem] leading-none font-normal tracking-tight',
            light ? 'text-cream' : 'text-night',
          )}
        >
          {SITE.name}
        </span>
        {showTagline && (
          <span
            className={cn(
              'mt-1.5 text-[0.6875rem] font-medium',
              light ? 'text-cream/60' : 'text-ink-400',
            )}
          >
            {SITE.tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
