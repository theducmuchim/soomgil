import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { NOTICE_CATEGORY, sortedNotices } from '@/data/notices';
import { kstParts } from '@/lib/utils/time';
import { cn } from '@/lib/utils/cn';

/** 최신 공지 3건 */
export function NoticePreview() {
  const notices = sortedNotices().slice(0, 3);

  return (
    <section className="py-14 sm:py-20">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-ink-400">
              알림
            </p>
            <h2 className="mt-2.5 font-display text-[1.625rem] leading-[1.22] font-normal tracking-tight text-night sm:text-[2.125rem]">
              최신 공지
            </h2>
          </div>
          <Link
            href="/notice"
            className="-my-2 shrink-0 py-2 text-[0.875rem] font-semibold text-night hover:text-ink-500"
          >
            전체 보기
          </Link>
        </div>

        <ul className="mt-7 divide-y divide-cream-line border-y border-cream-line">
          {notices.map((notice) => {
            const category = NOTICE_CATEGORY[notice.category];
            return (
              <li key={notice.slug}>
                <Link
                  href={`/notice/${notice.slug}`}
                  className="-mx-3 block rounded-xl px-3 py-5 transition-colors hover:bg-cream-deep"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[0.75rem] font-semibold',
                        category.tone,
                      )}
                    >
                      {category.label}
                    </span>
                    {notice.pinned && (
                      <span className="rounded bg-night px-1.5 py-0.5 text-[0.75rem] font-semibold text-white">
                        고정
                      </span>
                    )}
                    <time
                      dateTime={notice.publishedAt}
                      className="tabular text-[0.75rem] text-ink-400"
                    >
                      {formatDate(notice.publishedAt)}
                    </time>
                  </div>

                  <p className="mt-2 text-[1rem] leading-snug font-semibold text-night">
                    {notice.title}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-[0.875rem] leading-relaxed text-ink-500">
                    {notice.summary}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/** '2026. 06. 01.' */
export function formatDate(iso: string): string {
  const { year, month, day } = kstParts(new Date(iso));
  return `${year}. ${String(month).padStart(2, '0')}. ${String(day).padStart(2, '0')}.`;
}
