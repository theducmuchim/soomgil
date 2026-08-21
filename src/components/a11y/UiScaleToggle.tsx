'use client';

import { useEffect } from 'react';
import { useStored } from '@/lib/utils/local-store';
import { UI_SCALES, UI_SCALE_KEY, isUiScale, type UiScale } from '@/lib/a11y/uiScale';
import { cn } from '@/lib/utils/cn';

/**
 * 화면 크기 조절 토글 — 기본 / 크게 / 아주 크게.
 *
 * 헤더에 둔다. 설정 화면 안쪽에 숨기면 필요한 사람이 찾지 못한다.
 * 무료 기능이므로 요금제 확인을 하지 않는다 (lib/a11y/uiScale.ts 참고).
 *
 * '가' 글자를 세 크기로 보여주는 건 국내 공공기관 사이트에서 널리 쓰이는
 * 표기라 별도 설명 없이도 무엇을 하는 버튼인지 알아볼 수 있다.
 */
export function UiScaleToggle({ className }: { className?: string }) {
  const [stored, setStored] = useStored<UiScale>(UI_SCALE_KEY, 'normal');
  const scale = isUiScale(stored) ? stored : 'normal';

  /*
   * DOM 속성을 React 밖의 <html> 에 반영한다.
   *
   * 첫 렌더는 layout 의 인라인 스크립트가 이미 처리했다. 여기서는 사용자가
   * 버튼을 눌러 값이 바뀐 뒤를 맡는다. 상태를 세팅하는 게 아니라 외부 DOM을
   * 동기화하는 일이라 effect 가 맞는 자리다.
   */
  useEffect(() => {
    const root = document.documentElement;
    if (scale === 'normal') delete root.dataset.uiScale;
    else root.dataset.uiScale = scale;
  }, [scale]);

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role="group"
      aria-label="화면 글자 크기"
    >
      {UI_SCALES.map((option) => {
        const active = option.id === scale;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setStored(option.id)}
            aria-pressed={active}
            title={option.name}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md font-bold transition-colors',
              active
                ? 'bg-brand-600 text-white'
                : 'text-ink-500 hover:bg-surface-sunken hover:text-ink-900',
            )}
          >
            {/*
              '가' 자체의 크기로 단계를 표현한다. 배율이 걸린 뒤에도 세 버튼의
              상대 크기가 유지되도록 rem 으로 준다.
            */}
            <span style={{ fontSize: option.sample }} aria-hidden="true">
              {option.label}
            </span>
            <span className="sr-only">{option.name}</span>
          </button>
        );
      })}
    </div>
  );
}
