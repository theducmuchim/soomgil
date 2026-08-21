import type { RiskSnapshot } from '@/types';
import { Container } from '@/components/layout/Container';
import { ProductCard } from '@/components/commerce/ProductCard';
import { productsFor } from '@/config/products';
import { getSeasonMeta } from '@/lib/risk/season';
import { RISK_LEVELS } from '@/config/indicators';
import { cn } from '@/lib/utils/cn';

/**
 * 계절 맞춤 상품 추천 섹션.
 *
 * 지금 위험도가 높을수록 문구를 강하게 쓴다. 위험도가 낮은 날 "지금 필요합니다"라고
 * 하면 광고로만 읽히고, 정작 정말 필요한 날의 안내가 묻힌다.
 */
export function SeasonProducts({
  snapshot,
  /** 페이지 안에 끼워 넣을 때는 Container 없이 쓴다 */
  bare = false,
  className,
}: {
  snapshot: RiskSnapshot;
  bare?: boolean;
  className?: string;
}) {
  const season = getSeasonMeta(snapshot.season);
  const products = productsFor(snapshot.season);

  const level = snapshot.cityAverage.level;
  const urgent = level === 'high' || level === 'veryHigh';

  const body = (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.78125rem] font-semibold tracking-wide text-brand-600">
            {season.label}철 대비 용품
          </p>
          <h2 className="mt-2 text-[1.375rem] leading-tight font-bold tracking-tight text-ink-900 sm:text-[1.625rem]">
            {urgent
              ? '오늘 같은 날 챙기면 좋은 것들'
              : '이 계절에 미리 챙겨두면 좋은 것들'}
          </h2>
          <p className="mt-2.5 text-[0.84375rem] leading-relaxed text-ink-500">
            지금 대전 종합 위험도는{' '}
            <span
              className="font-semibold"
              style={{ color: RISK_LEVELS[level].color }}
            >
              {Math.round(snapshot.cityAverage.score)}점 · {RISK_LEVELS[level].label}
            </span>
            입니다. {season.headline}
          </p>
        </div>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ul>

      <p className="mt-4 text-[0.6875rem] leading-relaxed text-ink-400">
        상품은 이번 계절의 핵심 위험 지표에 맞춰 자동으로 바뀝니다. 가격은 참고용이며
        실제 판매가와 다를 수 있습니다. 숨쉬는길은 특정 브랜드를 보증하지 않습니다.
      </p>
    </>
  );

  if (bare) {
    return (
      <section
        className={cn('rounded-2xl border border-line bg-surface p-5 sm:p-6', className)}
      >
        {body}
      </section>
    );
  }

  return (
    <section className={cn('border-b border-line bg-surface-sunken py-14 sm:py-18', className)}>
      <Container>{body}</Container>
    </section>
  );
}
