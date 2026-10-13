import type { ReactNode } from 'react';
import { Container } from '@/components/layout/Container';

/** 하위 페이지 공통 머리말 */
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
  size = 'default',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  size?: 'default' | 'wide' | 'narrow';
}) {
  return (
    <div className="border-b border-cream-line bg-cream">
      <Container size={size}>
        <div className="flex flex-col gap-5 py-9 sm:flex-row sm:items-end sm:justify-between sm:py-11">
          <div>
            {eyebrow && (
              <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-ink-400">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-2 font-display text-[1.875rem] leading-[1.15] font-normal tracking-tight text-night sm:text-[2.375rem]">
              {title}
            </h1>
            {description && (
              <p className="mt-2.5 max-w-2xl text-[0.875rem] leading-relaxed text-ink-500">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      </Container>
    </div>
  );
}
