import Link from "next/link";
import { FOOTER, SITE } from "@/config/site";
import { LogoMark } from "@/components/ui/Logo";
import { Container } from "@/components/layout/Container";
import { DATA_MODE } from "@/lib/env";

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-cream-line bg-cream">
      {/*
        반투명 도트 패턴.

        푸터는 정보 밀도가 낮아 넓은 빈 면이 남는다. 그 면을 색으로 채우면
        무거워지고, 비워 두면 페이지가 끝났다는 느낌 없이 그냥 잘린다.
        도트는 종이 질감처럼 면을 붙잡아 주면서 글자를 방해하지 않는다.

        마스크로 왼쪽 위에서만 진하게 시작해 오른쪽 아래로 사라지게 한다
        (.dot-field, globals.css). 로고가 놓인 왼쪽 위가 가장 진하고, 링크가
        빽빽한 오른쪽으로 갈수록 옅어져 읽는 데 걸리지 않는다.
      */}
      <div
        aria-hidden="true"
        className="dot-field pointer-events-none absolute inset-0"
      />

      <div className="relative">
        <Container>
          <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {/* 서비스 */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <LogoMark className="text-[1.75rem]" />
                <span className="font-display text-[1.375rem] leading-none font-normal tracking-tight text-night">
                  {SITE.name}
                </span>
              </div>
              <p className="mt-3 max-w-sm text-[0.875rem] leading-relaxed text-ink-500">
                {SITE.description}
              </p>
              <dl className="mt-5 space-y-1.5 text-[0.8125rem] text-ink-500">
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 font-medium text-ink-400">
                    운영
                  </dt>
                  <dd>
                    {FOOTER.team.name} · {FOOTER.team.note}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 font-medium text-ink-400">
                    문의
                  </dt>
                  <dd>
                    <a
                      href={`mailto:${FOOTER.team.contact}`}
                      className="-my-2 inline-block py-2.5 underline underline-offset-2 hover:text-night"
                    >
                      {FOOTER.team.contact}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            {/* 바로가기 */}
            <nav aria-label="푸터 메뉴">
              <h2 className="text-[0.8125rem] font-semibold text-night">
                바로가기
              </h2>
              <ul className="mt-3.5 space-y-2.5">
                {FOOTER.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="-my-2 inline-block py-2.5 text-[0.875rem] text-ink-500 transition-colors hover:text-night"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* 데이터 출처 — 공공데이터 기반이라는 점이 이 서비스의 신뢰 근거다 */}
            <div>
              <h2 className="text-[0.8125rem] font-semibold text-night">
                데이터 출처
              </h2>
              <ul className="mt-3.5 space-y-2.5">
                {FOOTER.dataSources.map((src) => (
                  <li key={src.label}>
                    <a
                      href={src.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="-my-2 inline-block py-2.5 text-[0.8125rem] text-ink-500 transition-colors hover:text-night"
                    >
                      {src.label}
                    </a>
                  </li>
                ))}
              </ul>
              {DATA_MODE === "mock" && (
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-cream-line bg-cream-deep px-2 py-1 text-[0.75rem] font-medium text-ink-500">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-ink-300"
                    aria-hidden="true"
                  />
                  현재 예시 데이터로 동작 중
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-cream-line py-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-[0.8125rem] leading-relaxed text-ink-400">
              {FOOTER.disclaimer}
            </p>
            <p className="shrink-0 text-[0.8125rem] text-ink-400">
              © {new Date().getFullYear()} {FOOTER.team.name}
            </p>
          </div>
        </Container>
      </div>
    </footer>
  );
}
