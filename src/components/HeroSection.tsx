import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Parallax } from '@/components/motion/Parallax'
import { RevealLines } from '@/components/motion/RevealLines'

/**
 * 랜딩 히어로.
 *
 * ── 사진이 끊기지 않는다 ──────────────────────────────────
 * 히어로와 그 아래 소개글이 **한 섹션**이고 사진 하나를 같이 쓴다.
 * 첫 화면에서 잘라 놓고 다음 섹션을 흰 판으로 시작하면, 스크롤한 순간
 * 사진이 사라져 "표지 한 장 + 본문" 두 덩어리로 읽힌다. 사진을 아래까지
 * 끌고 내려와 소개글을 그 위에 얹으면 첫 화면부터 크림 지면까지가
 * 한 호흡으로 이어진다.
 *
 * 스크림은 아래로 갈수록 짙어지고, 맨 아래에서 크림으로 녹아 다음 섹션과
 * 이음매 없이 만난다.
 */
export default function HeroSection() {
  return (
    <section
      data-dark-section=""
      /*
        overflow-hidden 이 반드시 있어야 한다.

        패럴랙스가 사진을 아래로 밀어 내리는데, 자르지 않으면 밀려난 만큼이
        섹션 **밖으로 삐져나와** 크림 지면 위에 사진 띠가 하나 더 그려진다.
        패럴랙스를 붙이기 전에는 사진이 inset-0 에 딱 맞아 넘칠 일이 없었다.
      */
      className="relative isolate overflow-hidden bg-night"
    >
      {/* 사진 — 히어로와 소개글 구간 전체를 덮는다 */}
      <div className="absolute inset-0">
        {/*
          사진만 느리게 흘린다. 스크림과 크림 용해는 제자리에 둔다 —
          같이 움직이면 어두운 부분이 글자를 따라다녀 스크림의 뜻이 사라진다.

          위아래를 8%씩 키워 두는 이유는, 사진이 위로 밀리면서 아래쪽에
          빈 자리가 생기는 걸 막기 위해서다.
        */}
        <Parallax className="absolute inset-x-0 -top-[8%] h-[116%]" speed={0.12}>
          <Image
            src="/images/hero-daejeon.webp"
            alt="해질 무렵 대전 엑스포과학공원과 한빛탑, 뒤로 도심과 산 능선"
            fill
            className="object-cover object-center"
            priority
            quality={90}
            sizes="100vw"
          />
        </Parallax>
        <div aria-hidden="true" className="hero-scrim absolute inset-0" />
        {/*
          맨 아래 크림 용해.

          사진이 직선으로 잘리면 그 선이 화면에서 가장 강한 요소가 된다.
          아래로 가며 크림으로 넘겨 경계 자체를 없앤다.

          ⚠ 밝아지는 구간이 소개글과 겹치면 크림색 글자가 크림 바탕에 묻힌다.
          그래서 중간을 night 로 한 번 눌러 두고(글자가 놓이는 구간), 크림은
          아래 빈 여백 구간에서만 올라오게 한다. 아래 spacer 가 그 자리다.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[26rem] bg-gradient-to-b from-transparent via-night/55 via-45% to-cream"
        />
      </div>

      <div className="relative">
        <Container size="wide">
          {/* ── 첫 화면 ───────────────────────────────────── */}
          <div className="flex min-h-svh flex-col justify-end pt-28 pb-16 sm:pb-24">
            <div className="max-w-3xl">
              {/*
                눈썹은 알약 배지가 아니라 글자다.

                점 하나 찍힌 pill 은 어느 서비스에 붙여도 말이 되는 장식이라,
                붙는 순간 화면이 템플릿처럼 읽힌다. 여기서는 얇은 선 하나와
                자간 넓힌 소문자 라벨로 대신한다 — 선은 아래 제목의 왼쪽
                기준선과 맞아 떨어져서 장식이 아니라 구조가 된다.
              */}
              <p className="flex items-center gap-3 text-[0.75rem] font-semibold tracking-[0.18em] text-cream/55">
                <span aria-hidden="true" className="h-px w-8 bg-cream/35" />
                대전광역시
              </p>

              {/*
                두 줄이 차례로 올라온다. 한 덩어리로 뜨면 큰 글자가 통째로
                움직여 무겁게 보이는데, 줄이 나뉘면 문장을 읽는 순서와
                움직임의 순서가 맞아떨어진다.
              */}
              <RevealLines
                as="h1"
                lines={['숨쉬기 좋은 길로', '갑니다']}
                className="mt-6 font-display text-[2.75rem] leading-[1.06] font-normal tracking-tight text-cream sm:text-[4rem] lg:text-[5rem]"
              />

              <p className="mt-7 max-w-xl text-[1rem] leading-relaxed text-cream/70 sm:text-[1.0625rem]">
                꽃가루·미세먼지·폭염·오존을 공공데이터로 실시간 계산하고, 분지 지형의
                대기정체와 풍향까지 반영해 지금 이 순간 상대적으로 안전한 길을 안내합니다.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                  href="/route"
                  className="inline-flex h-12 items-center rounded-full bg-cream px-7 text-[0.9375rem] font-semibold text-night transition-colors hover:bg-white"
                >
                  경로 찾기
                </Link>
                {/*
                  두 번째 동작은 버튼이 아니라 밑줄 링크다.
                  나란한 알약 버튼 두 개는 어느 쪽이 주인지 말해 주지 않는다.
                */}
                <Link
                  href="/risk-map"
                  className="-my-2.5 inline-block py-2.5 text-[0.9375rem] font-medium text-cream/75 underline decoration-cream/30 underline-offset-[6px] transition-colors hover:text-cream hover:decoration-cream/70"
                >
                  위험 지도 먼저 보기
                </Link>
              </div>
            </div>
          </div>

          {/* ── 사진 위에서 이어지는 소개글 ────────────────── */}
          <div className="grid gap-x-16 gap-y-10 border-t border-cream/15 py-16 sm:py-20 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <RevealLines
              lines={['대전은 사방이 산으로', '둘러싸인 분지입니다']}
              className="font-display text-[1.75rem] leading-[1.2] font-normal tracking-tight text-cream sm:text-[2.25rem]"
            />

            <div className="max-w-2xl">
              <p className="text-[1.0625rem] leading-[1.75] text-cream/75 sm:text-[1.125rem]">
                바람이 약한 날에는 같은 배출량이라도 오염물질이 도시 안에 오래 남습니다.
                같은 도시 안에서도 어느 길로 걷는지에 따라 마시는 공기가 달라지는 이유입니다.
              </p>
              <p className="mt-5 text-[0.9375rem] leading-[1.75] text-cream/55">
                숨쉬는길은 공개된 관측값만으로 그 차이를 계산해, 오늘 당신이 고를 수 있는
                길들을 나란히 보여줍니다. 자체 관측 장비는 쓰지 않습니다.
              </p>

              {/*
                출처를 여기서 밝힌다.
                "공공데이터 기반"이라고 말로 쓰는 것보다 기관 이름을 그대로
                늘어놓는 편이 근거로 읽힌다.
              */}
              <dl className="mt-10 grid gap-x-8 gap-y-5 border-t border-cream/15 pt-7 sm:grid-cols-2">
                {[
                  ['기상청', '꽃가루농도위험지수 · 생활기상지수 · 단기예보 · 기상특보'],
                  ['한국환경공단', '에어코리아 실시간 대기오염정보'],
                ].map(([source, detail]) => (
                  <div key={source}>
                    <dt className="text-[0.9375rem] font-semibold text-cream/85">{source}</dt>
                    <dd className="mt-1.5 text-[0.8125rem] leading-relaxed text-cream/45">
                      {detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* 크림이 올라올 빈 구간 — 글자가 밝은 그라데이션에 걸리지 않게 */}
          <div aria-hidden="true" className="h-28 sm:h-40" />
        </Container>
      </div>
    </section>
  )
}
