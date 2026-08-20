import { cn } from '@/lib/utils/cn';

/**
 * 풍향 화살표.
 *
 * 기상 데이터의 풍향은 "바람이 불어오는 방향"이다(북풍 = 북쪽에서 옴 = 0도).
 * 화살표는 공기가 흘러가는 방향, 즉 반대쪽을 가리켜야 직관에 맞는다.
 * 그래서 회전각에 180도를 더한다.
 */
export function WindArrow({
  degree,
  speed,
  className,
}: {
  degree: number;
  /** 주면 풍속에 따라 화살표 굵기가 달라진다 */
  speed?: number;
  className?: string;
}) {
  const rotation = (degree + 180) % 360;
  const weight = speed === undefined ? 1.8 : clamp(1.2 + speed * 0.3, 1.2, 3);

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-brand-50 text-brand-600',
        className,
      )}
      role="img"
      aria-label={`풍향 ${Math.round(degree)}도`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-1/2 w-1/2"
        style={{ transform: `rotate(${rotation}deg)` }}
        aria-hidden="true"
      >
        <path
          d="M12 20V5M12 4l-5 5M12 4l5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth={weight}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}
