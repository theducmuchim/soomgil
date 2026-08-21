import type { Product } from '@/config/products';
import { INDICATORS } from '@/config/indicators';
import { cn } from '@/lib/utils/cn';

/**
 * 상품 카드.
 *
 * ── 나중에 제휴 링크로 바꾸는 방법 ──────────────────────
 * 아래 buildShoppingUrl() 한 함수만 고치면 된다. 상품 데이터
 * (config/products.ts)도, 이 카드를 쓰는 화면들도 건드릴 필요가 없다.
 *
 * 예를 들어 쿠팡파트너스로 바꾼다면:
 *
 *   function buildShoppingUrl(product: Product): string {
 *     const base = 'https://link.coupang.com/a/XXXXXX';
 *     return `${base}?q=${encodeURIComponent(product.query)}`;
 *   }
 *
 * 제휴 링크를 붙일 때는 표시광고법상 "제휴 링크가 포함되어 있습니다" 같은
 * 대가성 표시를 함께 넣어야 한다. SeasonProducts.tsx 하단 문구를 그때 수정할 것.
 */
function buildShoppingUrl(product: Product): string {
  // 지금은 일반 쇼핑 검색 결과. 제휴 트래킹 파라미터 없음.
  return `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(
    product.query,
  )}`;
}

const CATEGORY_TONE: Record<Product['category'], string> = {
  보호구: 'bg-brand-50 text-brand-700',
  의약품: 'bg-risk-high/10 text-risk-high',
  생활용품: 'bg-surface-sunken text-ink-500',
  가전: 'bg-layer-ozone/10 text-layer-ozone',
};

export function ProductCard({ product }: { product: Product }) {
  const indicator = INDICATORS[product.indicator];

  return (
    <li className="flex h-full flex-col rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold',
            CATEGORY_TONE[product.category],
          )}
        >
          {product.category}
        </span>
        <span className="text-[0.6875rem] font-medium text-ink-400">
          {indicator.shortLabel}
        </span>
      </div>

      <h3 className="mt-2.5 text-[0.90625rem] leading-snug font-bold text-ink-900">
        {product.name}
      </h3>
      <p className="mt-1.5 flex-1 text-[0.78125rem] leading-relaxed text-ink-500">
        {product.reason}
      </p>

      {/*
        가격·주의문구·버튼을 한 덩어리로 묶어 카드 아래쪽에 붙인다.
        의약품 카드만 주의문구가 하나 더 붙는데, 그게 버튼 뒤에 오면
        카드마다 버튼 높이가 어긋나 목록이 들쭉날쭉해 보인다.
      */}
      <div className="mt-3">
        <p className="text-[0.71875rem] text-ink-400">{product.priceHint}</p>

        {product.requiresPharmacy && (
          <p className="mt-1 text-[0.65625rem] leading-snug text-ink-400">
            일반의약품은 약국에서 약사와 상담 후 구매하세요.
          </p>
        )}

        <a
          href={buildShoppingUrl(product)}
          target="_blank"
          rel="noreferrer noopener sponsored"
          className={cn(
            'mt-3 flex h-10 items-center justify-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold transition-colors',
            product.requiresPharmacy
              ? 'border border-line-strong text-ink-700 hover:bg-surface-sunken'
              : 'bg-brand-600 text-white hover:bg-brand-700',
          )}
        >
          {product.requiresPharmacy ? '제품 정보 보기' : '구매하기'}
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <path
              d="M6 3.5 10.5 8 6 12.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>
    </li>
  );
}
