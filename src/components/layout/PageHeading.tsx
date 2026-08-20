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
    <div className="border-b border-line bg-surface-sunken">
      <Container size={size}>
        <div className="flex flex-col gap-5 py-9 sm:flex-row sm:items-end sm:justify-between sm:py-11">
          <div>
            {eyebrow && (
              <p className="text-[12.5px] font-semibold tracking-wide text-brand-600">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink-900 sm:text-[28px]">
              {title}
            </h1>
            {description && (
              <p className="mt-2.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-500">
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
