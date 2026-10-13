import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'lime' | 'onDark';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'bg-surface text-ink-900 border border-line-strong hover:bg-surface-sunken active:bg-line/60',
  ghost: 'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200',
  quiet: 'text-ink-500 hover:text-ink-900 hover:bg-surface-sunken',

  /*
   * 라임 — 크림 지면 위의 주 CTA.
   *
   * primary(검정)를 두고 이걸 따로 두는 이유는 배경이 갈렸기 때문이다.
   * 흰 카드 안에서는 검정 버튼이 가장 강하지만, 크림 지면이 넓게 깔린
   * 섹션에서는 검정이 지면과 같은 무채색 축이라 눌러도 튀지 않는다.
   * 라임은 지면과 색상축이 달라 한 번에 눈에 들어온다.
   *
   * 글자를 순검정이 아니라 --color-lime-ink(#161a08)로 두는 건 라임의
   * 초록기 위에서 순검정이 살짝 떠 보이기 때문이다. 먹에 초록을 조금 섞었다.
   *
   * ⚠ 한 화면에 하나만 쓴다. 라임은 위험 4단계 색이 아닌 유일한 유채색이라
   * 여러 개를 뿌리면 지도·배지의 위험 신호와 시선을 다툰다.
   */
  lime: 'bg-lime text-lime-ink hover:bg-lime-hover active:bg-lime-hover',

  /*
   * 어두운 면 위의 보조 버튼 — 히어로, 포레스트 그라데이션 구간.
   *
   * 흰색으로 채우지 않고 크림을 10%만 깐다. 어두운 사진 위에서 불투명한
   * 흰 버튼 두 개가 나란히 있으면 둘 다 주인공이 되어버린다. 이건 옆에 선
   * 주 CTA에 자리를 내주는 쪽이다.
   *
   * 테두리(30%)가 채움(10%)보다 진한 게 핵심이다. 배경 사진의 밝기가
   * 구간마다 달라서, 채움만으로는 밝은 부분에서 버튼 경계가 사라진다.
   */
  onDark:
    'border border-cream/30 bg-cream/10 text-cream hover:bg-cream/20 active:bg-cream/25',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-[0.8125rem] gap-1.5 rounded-full',
  md: 'h-10 px-5 text-sm gap-2 rounded-full',
  lg: 'h-12 px-6 text-[1rem] gap-2 rounded-full',
};

const BASE =
  'inline-flex items-center justify-center font-semibold whitespace-nowrap ' +
  'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  /** 부모 폭을 꽉 채움 — 모바일 CTA에 사용 */
  block?: boolean;
}

type ButtonAsLink = CommonProps & { href: string } & Omit<
    ComponentProps<typeof Link>,
    'href' | 'className' | 'children'
  >;
type ButtonAsButton = CommonProps & { href?: undefined } & Omit<
    ComponentProps<'button'>,
    'className' | 'children'
  >;

export function Button(props: ButtonAsLink | ButtonAsButton) {
  const { variant = 'primary', size = 'md', className, children, block, ...rest } = props;
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className);

  /*
   * data-button 은 스타일 훅이다.
   * 링크로 렌더된 버튼(<a>)은 globals.css 의 "크게 보기 최소 터치 영역" 규칙이
   * 잡아내지 못한다. 일반 본문 링크까지 키우면 문단이 망가지므로, 버튼처럼
   * 생긴 링크만 표시해 둔다.
   */
  if (rest.href !== undefined) {
    const { href, ...linkRest } = rest as ButtonAsLink;
    return (
      <Link href={href} className={classes} data-button="" {...linkRest}>
        {children}
      </Link>
    );
  }

  const { href: _omit, ...buttonRest } = rest as ButtonAsButton;
  void _omit;
  return (
    <button className={classes} data-button="" {...buttonRest}>
      {children}
    </button>
  );
}
