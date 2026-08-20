import Link from 'next/link';
import { FOOTER, SITE } from '@/config/site';
import { LogoMark } from '@/components/ui/Logo';
import { Container } from '@/components/layout/Container';
import { DATA_MODE } from '@/lib/env';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-surface-sunken">
      <Container>
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* 서비스 */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-7 w-7" />
              <span className="text-[15px] font-bold text-ink-900">{SITE.name}</span>
            </div>
            <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-ink-500">
              {SITE.description}
            </p>
            <dl className="mt-5 space-y-1.5 text-[13px] text-ink-500">
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 font-medium text-ink-400">운영</dt>
                <dd>
                  {FOOTER.team.name} · {FOOTER.team.note}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 font-medium text-ink-400">문의</dt>
                <dd>
                  <a
                    href={`mailto:${FOOTER.team.contact}`}
                    className="-my-1 inline-block py-1.5 underline underline-offset-2 hover:text-ink-900"
                  >
                    {FOOTER.team.contact}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {/* 바로가기 */}
          <nav aria-label="푸터 메뉴">
            <h2 className="text-[13px] font-semibold text-ink-900">바로가기</h2>
            <ul className="mt-3.5 space-y-2.5">
              {FOOTER.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="-my-1 inline-block py-1.5 text-[13.5px] text-ink-500 transition-colors hover:text-brand-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 데이터 출처 — 공공데이터 기반이라는 점이 이 서비스의 신뢰 근거다 */}
          <div>
            <h2 className="text-[13px] font-semibold text-ink-900">데이터 출처</h2>
            <ul className="mt-3.5 space-y-2.5">
              {FOOTER.dataSources.map((src) => (
                <li key={src.label}>
                  <a
                    href={src.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="-my-1 inline-block py-1.5 text-[13px] leading-snug text-ink-500 transition-colors hover:text-brand-600"
                  >
                    {src.label}
                  </a>
                </li>
              ))}
            </ul>
            {DATA_MODE === 'mock' && (
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-line/70 px-2 py-1 text-[11.5px] font-medium text-ink-500">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-300" aria-hidden="true" />
                현재 예시 데이터로 동작 중
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-400">
            {FOOTER.disclaimer}
          </p>
          <p className="shrink-0 text-[12.5px] text-ink-400">
            © {new Date().getFullYear()} {FOOTER.team.name}
          </p>
        </div>
      </Container>
    </footer>
  );
}
