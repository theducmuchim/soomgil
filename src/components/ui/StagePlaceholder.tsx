import { Container } from '@/components/layout/Container';

/**
 * 아직 구현 전인 화면 자리.
 * 라우팅이 살아 있다는 것만 보여주고, 무엇이 들어올지 미리 적어둔다.
 * 각 화면이 완성되면 이 컴포넌트는 해당 페이지에서 지워진다.
 */
export function StagePlaceholder({
  stage,
  items,
}: {
  /** 제작 순서상 몇 단계에서 만들어지는 화면인지 */
  stage: string;
  /** 이 화면에 들어갈 요소 목록 */
  items: string[];
}) {
  return (
    <Container>
      <div className="my-10 rounded-xl border border-dashed border-line-strong bg-surface-raised p-6 sm:my-14 sm:p-8">
        <p className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2 py-1 text-[12px] font-semibold text-brand-700">
          {stage}에서 제작
        </p>
        <p className="mt-4 text-[14px] font-semibold text-ink-900">
          이 화면에는 다음이 들어갑니다
        </p>
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-500">
              <span
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-300"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
