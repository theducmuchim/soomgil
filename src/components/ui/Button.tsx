import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'bg-surface text-ink-900 border border-line-strong hover:bg-surface-sunken active:bg-line/60',
  ghost: 'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200',
  quiet: 'text-ink-500 hover:text-ink-900 hover:bg-surface-sunken',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-lg',
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

  if (rest.href !== undefined) {
    const { href, ...linkRest } = rest as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...linkRest}>
        {children}
      </Link>
    );
  }

  const { href: _omit, ...buttonRest } = rest as ButtonAsButton;
  void _omit;
  return (
    <button className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
