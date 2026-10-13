'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 실제 거리 사진 위에 길이 그려지고 설명이 따라 붙는 구간.
 *
 * ── 왜 화면을 붙잡아 두는가(sticky) ───────────────────────
 * 처음에는 평범한 섹션으로 만들었다. 스크롤 진행률로 선을 그렸는데, 실제로
 * 써 보니 **설명이 뜨는 순간 이미 그 자리가 화면 밖으로 밀려나 있었다**.
 * 선이 다 그려지려면 섹션이 화면을 지나가야 하는데, 지나가는 동안 읽을 것이
 * 위로 사라지니 읽을 시간이 없다.
 *
 * 그래서 그림을 화면에 고정해 둔다. 바깥 섹션은 화면 두 배 높이고, 안쪽
 * 그림은 sticky 로 붙어 있다. 스크롤하면 **그림은 그대로 있고 선만 자란다**.
 * 세 설명이 차례로 올라올 때까지 그림이 눈앞에 머문다.
 *
 * ── 왜 진짜 사진인가 ──────────────────────────────────────
 * 앞서 만든 건 초록 그라데이션 위의 추상적인 곡선이었다. 예쁘긴 한데
 * "이 서비스가 길을 안내한다"는 말이 안 됐다 — 곡선이 아무 데도 아니어서다.
 * 대전천 산책로 위에 선을 그으면 그게 곧 이 서비스가 하는 일이다.
 */

interface Stop {
  /** 이 설명이 나타나는 진행률 0~1 */
  at: number;
  title: string;
  body: string;
  /** 경로 위 지점 (사진 좌표계 1440×960) */
  px: number;
  py: number;
  /** 설명 상자의 위치 (같은 좌표계). 선을 가리지 않는 자리로 고른다 */
  lx: number;
  ly: number;
}

const STOPS: Stop[] = [
  {
    at: 0.14,
    title: '출발지와 도착지만',
    body: '회원가입도, 앱 설치도 없습니다.',
    px: 716,
    py: 868,
    // 왼쪽 아래 수면 위 — 사진에서 가장 어두워 크림색 글자가 또렷하다
    lx: 120,
    ly: 800,
  },
  {
    at: 0.44,
    title: '구간마다 다시 잽니다',
    body: '550m 격자로 꽃가루·미세먼지·폭염·오존을 각각 계산하고, 바람이 실어오는 몫까지 더합니다.',
    px: 740,
    py: 688,
    // 같은 수면이되 위쪽. 물에 비친 조명 반사가 덜한 왼쪽 끝으로 붙였다
    lx: 60,
    ly: 590,
  },
  {
    at: 0.74,
    title: '고를 수 있는 길을 나란히',
    body: '공기·그늘·골목·시간 — 오늘 무엇이 중요한지는 당신이 정합니다.',
    px: 843,
    py: 552,
    // 오른쪽 위 건물·수목 구간. 경로가 끝나는 다리 쪽 바로 옆이다
    lx: 1000,
    ly: 330,
  },
];

/**
 * 산책로를 따라가는 곡선.
 *
 * ── 두 번 고친 자리 ───────────────────────────────────────
 * 처음에는 보행로를 올라가다 보행교 아래에서 **왼쪽**으로 꺾어 하천 건너편
 * 산책로로 빠지게 그렸다. 사진만 보고 판단한 결과였는데 실제로 이어지는 길은
 * 반대다 — 보행로는 오른쪽 위로 계속 올라가 다리 밑 진입부에서 끝난다.
 * 왼쪽 둔치는 하천 건너편이라 여기서 걸어서 이어지지 않는다.
 *
 * 방향을 고친 뒤에도 중간이 어긋났다. 눈으로 픽셀을 읽는 방식 자체가
 * 문제였다 — 받은 이미지마다 크기와 테두리가 달라서 원본 좌표로 되돌릴 때
 * 배율을 추정해야 했고, 그 추정이 2%만 틀려도 선 전체가 20~30px 밀린다.
 *
 * 지금 값은 scripts/path-picker.html 로 사진 위를 직접 클릭해 받은 12개
 * 좌표에서 만들었다. 추정 단계가 없다.
 *
 * ── 왜 centripetal 인가 ───────────────────────────────────
 * 12개를 그대로 이었더니 선이 끊겨 보였다. 점 8·9(간격 16px), 10·11(18px)
 * 처럼 촘촘한 구간에서 제어점이 진행 방향 **뒤로** 물러나 작은 고리가 생긴
 * 탓이다. 균등 매개변수 Catmull-Rom 의 알려진 약점이다.
 *
 * 26px 미만으로 붙은 점을 솎아 10개로 줄이고(원래 점에서 최대 1.1px 이탈),
 * 간격의 제곱근으로 매개변수를 잡는 centripetal 방식(alpha=0.5)으로 다시
 * 이었다. 연속한 방향 변화의 최댓값이 0.64도까지 내려갔다 — 사실상 직선처럼
 * 이어진다는 뜻이다.
 *
 * 좌표는 사진 원본(1440×960) 기준이다. 사진을 바꾸면 여기만 다시 그리면 된다.
 */
const PATH_D =
  'M 697 942 C 697 942, 714 882, 719 853 C 724 827, 724 804, 727 778 ' +
  'C 731 750, 738 715, 740 692 C 742 677, 739 666, 742 655 ' +
  'C 744 646, 747 638, 753 630 C 761 619, 776 608, 789 597 ' +
  'C 803 584, 819 569, 834 558 C 848 548, 862 540, 876 534 ' +
  'C 889 529, 915 525, 915 525';

/*
 * 화면에 붙어 있는 동안 스크롤할 여유 — 설명 셋을 읽을 시간.
 *
 * 모바일에서 짧게 잡는다. 데스크톱과 같은 190vh 를 주면 손가락으로 세 화면을
 * 쓸어 올려야 그림 하나를 지나간다. 화면이 작을수록 한 번의 스와이프가
 * 넘기는 비율이 커서 체감이 훨씬 길다.
 */
const RUNWAY_CLASS = 'h-[calc(100svh+105vh)] sm:h-[calc(100svh+190vh)]';

/** 선이 다 그려지는 시점. 뒤쪽에 여유를 둬야 마지막 설명을 읽을 틈이 생긴다 */
const DRAW_COMPLETE_AT = 0.86;

export function RouteStoryline() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      const raf = requestAnimationFrame(() => setProgress(1));
      return () => cancelAnimationFrame(raf);
    }

    let raf = 0;
    let queued = false;

    const apply = () => {
      queued = false;
      const rect = el.getBoundingClientRect();

      /*
       * 붙어 있는 동안의 진행률.
       * 섹션 높이에서 화면 하나를 뺀 만큼이 실제로 스크롤할 수 있는 거리다.
       */
      const runway = rect.height - window.innerHeight;
      if (runway <= 0) {
        setProgress(1);
        return;
      }
      setProgress(Math.min(Math.max(-rect.top / runway, 0), 1));
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const drawn = Math.min(progress / DRAW_COMPLETE_AT, 1);

  return (
    <section ref={ref} className={cn('relative bg-night', RUNWAY_CLASS)}>
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
        {/*
          ── 데스크톱: 상자를 정확히 3:2 로 ──────────────────────
          예전에는 `aspect-[3/2] max-h-svh w-full` 이었다. 넓은 화면에서
          max-h-svh 가 물려 높이가 잘리면 상자가 3:2 를 벗어나고, 그 순간
          사진(object-cover: 채우고 자름)과 선(SVG 기본 meet: 맞추고 여백)이
          서로 다른 배율로 그려져 최대 96px 어긋난다.
          높이를 자르는 대신 폭을 150svh 로 묶어 3:2 를 지킨다.

          ── 모바일: 세로로 넓게 ────────────────────────────────
          같은 3:2 를 쓰면 390px 폭에서 높이가 260px 밖에 안 된다. 화면의
          3분의 1도 못 채우는 사진 위에 7px 선을 그어봐야 보이지 않는다.
          52svh 로 키우고 좌우를 잘라낸다.

          잘라도 되는 이유는 두 가지다.
            · SVG 에 preserveAspectRatio="slice" 를 걸어 뒀다. 사진의
              object-cover 와 **같은 규칙**이라 잘려도 선이 함께 잘린다.
            · 사진 위에 절대배치하던 설명 상자는 모바일에서 이미 숨기고
              아래 목록으로 내린다. 퍼센트 좌표가 어긋날 일이 없다.

          기기별로 재 보면 보이는 가로 범위가 293~1147(iPhone 14) 이고
          경로는 697~915 라, 어느 기기에서도 경로가 잘리지 않는다.
        */}
        <div className="relative mx-auto h-[52svh] w-full overflow-hidden bg-forest-900 sm:h-auto sm:aspect-[3/2] sm:max-w-[150svh]">
          {/*
            사진이 아직 없거나 못 불러왔을 때를 위한 바탕.
            next/image 가 실패하면 그 자리가 그냥 빈 칸이 되는데, 이 구간은
            화면을 두 배 높이로 붙잡고 있어서 빈 칸이 그만큼 오래 보인다.
            초록 그라데이션을 깔아 두면 사진이 없어도 화면이 성립한다.
          */}
          <div aria-hidden="true" className="forest-glow pointer-events-none absolute inset-[-20%]" />

          <Image
            src="/images/route-street.jpg"
            alt="해질 무렵 대전천 산책로와 보행교"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 150vh"
          />

          {/* 글자가 놓이는 자리를 눌러 준다 */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-night/85 via-night/45 to-night/75"
          />

          <svg
            viewBox="0 0 1440 960"
            /* 사진의 object-cover 와 같은 규칙. 상자 비율이 흔들려도 함께 움직인다 */
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full"
            fill="none"
            aria-hidden="true"
          >
            {/* 아직 지나지 않은 구간 — 길이 어디로 이어지는지 미리 보인다 */}
            <path
              d={PATH_D}
              pathLength={1}
              stroke="rgb(247 244 236 / 0.22)"
              strokeWidth={5}
              strokeLinecap="round"
            />

            {/*
              그려지는 선.
              사진 위라 라임만으로는 밝은 부분에서 묻힌다. 아래에 어두운 선을
              한 겹 깔아 어디에서나 떠 보이게 한다.
            */}
            <path
              d={PATH_D}
              pathLength={1}
              stroke="rgb(11 22 14 / 0.55)"
              strokeWidth={13}
              strokeLinecap="round"
              strokeDasharray={1}
              strokeDashoffset={1 - drawn}
            />
            <path
              d={PATH_D}
              pathLength={1}
              stroke="var(--color-lime)"
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={1}
              strokeDashoffset={1 - drawn}
            />

            {STOPS.map((stop) => {
              const on = progress >= stop.at;
              return (
                <g
                  key={stop.title}
                  style={{
                    opacity: on ? 1 : 0,
                    transition: 'opacity 380ms cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  {/* 설명 상자와 경로 위 지점을 잇는 점선 */}
                  <line
                    x1={stop.lx < stop.px ? stop.lx + 96 : stop.lx}
                    y1={stop.ly + 54}
                    x2={stop.px}
                    y2={stop.py}
                    stroke="rgb(247 244 236 / 0.45)"
                    strokeWidth={2}
                    strokeDasharray="2 8"
                    strokeLinecap="round"
                  />
                  <circle cx={stop.px} cy={stop.py} r={7} fill="var(--color-lime)" />
                  <circle
                    cx={stop.px}
                    cy={stop.py}
                    r={13}
                    fill="none"
                    stroke="var(--color-lime)"
                    strokeOpacity={0.4}
                    strokeWidth={2}
                  />
                </g>
              );
            })}
          </svg>

          {/*
            설명은 SVG 밖 HTML 이다.
            <text> 안에서는 줄바꿈도 한글 자간도 제어가 안 된다. 상자가 사진과
            같은 비율이라 퍼센트 좌표가 SVG 좌표와 정확히 맞는다.

            좁은 화면에서는 사진 위에 글 상자 셋을 얹을 자리가 없다.
            아래 목록으로 대신한다.
          */}
          {STOPS.map((stop) => {
            const on = progress >= stop.at;
            return (
              <div
                key={stop.title}
                className={cn(
                  'absolute hidden w-[17rem] transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] md:block lg:w-[20rem]',
                  on ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                )}
                style={{
                  left: `${(stop.lx / 1440) * 100}%`,
                  top: `${(stop.ly / 960) * 100}%`,
                }}
              >
                <p className="font-display text-[1.25rem] leading-tight font-normal text-cream lg:text-[1.5rem]">
                  {stop.title}
                </p>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-cream/70">
                  {stop.body}
                </p>
              </div>
            );
          })}

          {/* 머리말 — 사진 왼쪽 위, 선이 지나지 않는 자리 */}
          <div className="absolute top-[6%] left-[5%] max-w-[26rem]">
            <p className="flex items-center gap-3 text-[0.6875rem] font-semibold tracking-[0.18em] text-cream/50">
              <span aria-hidden="true" className="h-px w-7 bg-cream/35" />
              길을 고르는 방식
            </p>
            <h2 className="mt-4 font-display text-[1.5rem] leading-[1.18] font-normal tracking-tight text-cream sm:text-[2rem] lg:text-[2.5rem]">
              같은 목적지라도
              <br />
              가는 길은 하나가 아닙니다
            </h2>
          </div>
        </div>

        {/* 좁은 화면용 — 사진 위에 얹지 못한 설명을 아래에 편다 */}
        <ol className="mx-auto mt-6 grid w-full max-w-2xl gap-4 px-5 md:hidden">
          {STOPS.map((stop, i) => (
            <li
              key={stop.title}
              className={cn(
                'flex gap-3 transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
                progress >= stop.at ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
              )}
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lime"
              />
              <div>
                <p className="font-display text-[1.0625rem] leading-tight font-normal text-cream">
                  {i + 1}. {stop.title}
                </p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-cream/65">
                  {stop.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
