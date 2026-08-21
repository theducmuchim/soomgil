'use client';

import { formatKstStamp, formatRelative } from '@/lib/utils/time';
import { useNow } from '@/lib/utils/useNow';
import { cn } from '@/lib/utils/cn';

/**
 * 기준 시각 표시 — "8월 22일 오전 9시 기준 · 12분 전 갱신".
 *
 * ── 왜 눈에 띄게 두는가 ─────────────────────────────────
 * "실시간"이라고 써 붙이는 것으로는 실시간임을 증명하지 못한다. 화면에 뜬
 * 숫자가 오늘 것인지 지난주 것인지 사용자는 알 수 없다. 시각을 같이 보여주면
 * 그 자체가 증거가 된다 — 특히 이 서비스처럼 "지금 나가도 되는가"를 판단하는
 * 화면에서는, 값보다 값의 나이가 더 중요할 때가 있다.
 *
 * ── 예시 데이터일 때 ────────────────────────────────────
 * 계절 보기로 다른 계절을 보는 중이면 기준 시각이 몇 달 전이다. 거기에
 * "3개월 전 갱신"을 붙이면 데이터가 낡은 것처럼 읽힌다. 낡은 게 아니라 예시라서
 * 그런 것이므로, 신선도 대신 예시임을 밝힌다.
 */
export function FreshnessStamp({
  baseTime,
  /** 예시 데이터(오늘이 아닌 계절)인지 */
  preview = false,
  size = 'md',
  className,
}: {
  baseTime: string;
  preview?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const now = useNow();

  const ageMs = now === null ? null : now - new Date(baseTime).getTime();

  /*
   * 상대 시각은 브라우저에서만 그린다(서버에는 "지금"이 없다).
   * 하루가 넘게 벌어진 값에는 붙이지 않는다 — 예시 데이터이거나 공공데이터
   * 발표가 멈춘 경우인데, 어느 쪽이든 "몇 시간 전"보다 다른 안내가 필요하다.
   */
  const fresh =
    now !== null && ageMs !== null && ageMs >= 0 && ageMs < 24 * 60 * 60 * 1000;

  const dot = preview ? 'bg-risk-moderate' : fresh ? 'bg-risk-low' : 'bg-ink-300';

  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5 tabular',
        size === 'sm' ? 'text-[0.6875rem]' : 'text-[0.75rem]',
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot)} aria-hidden="true" />
      <span>
        <strong className="font-semibold">{formatKstStamp(baseTime)}</strong> 기준
        {preview ? (
          <span className="text-ink-400"> · 예시 데이터</span>
        ) : (
          fresh && (
            <span className="text-ink-400">
              {' '}
              · {formatRelative(baseTime, new Date(now))} 갱신
            </span>
          )
        )}
      </span>
    </p>
  );
}
