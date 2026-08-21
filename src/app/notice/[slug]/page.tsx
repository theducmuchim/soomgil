import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeading } from '@/components/layout/PageHeading';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { NOTICE_CATEGORY, NOTICES, findNotice, sortedNotices } from '@/data/notices';
import { formatDate } from '@/components/home/NoticePreview';
import { cn } from '@/lib/utils/cn';

/** 공지 5건은 고정 데이터라 빌드 시점에 전부 정적으로 만들어 둔다 */
export function generateStaticParams() {
  return NOTICES.map((notice) => ({ slug: notice.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const notice = findNotice(slug);
  if (!notice) return { title: '공지 상세' };
  return { title: notice.title, description: notice.summary };
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const notice = findNotice(slug);
  if (!notice) notFound();

  const ordered = sortedNotices();
  const index = ordered.findIndex((n) => n.slug === slug);
  const prev = ordered[index - 1];
  const next = ordered[index + 1];
  const category = NOTICE_CATEGORY[notice.category];

  return (
    <>
      <PageHeading eyebrow="공지사항" title={notice.title} size="narrow" />

      <Container size="narrow" className="py-8 sm:py-10">
        <div className="flex flex-wrap items-center gap-2 border-b border-line pb-5">
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold',
              category.tone,
            )}
          >
            {category.label}
          </span>
          <time
            dateTime={notice.publishedAt}
            className="tabular text-[0.75rem] text-ink-400"
          >
            {formatDate(notice.publishedAt)}
          </time>
        </div>

        <article className="py-7">
          {notice.body.map((paragraph, i) => (
            <p
              key={i}
              className="mt-4 text-[0.9375rem] leading-[1.85] text-ink-700 first:mt-0"
            >
              {paragraph}
            </p>
          ))}
        </article>

        <nav className="flex flex-col gap-2 border-t border-line pt-5">
          {prev && (
            <Link
              href={`/notice/${prev.slug}`}
              className="group flex items-baseline gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-sunken"
            >
              <span className="shrink-0 text-[0.75rem] font-semibold text-ink-400">
                이전 글
              </span>
              <span className="truncate text-[0.84375rem] text-ink-700 group-hover:text-brand-600">
                {prev.title}
              </span>
            </Link>
          )}
          {next && (
            <Link
              href={`/notice/${next.slug}`}
              className="group flex items-baseline gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-sunken"
            >
              <span className="shrink-0 text-[0.75rem] font-semibold text-ink-400">
                다음 글
              </span>
              <span className="truncate text-[0.84375rem] text-ink-700 group-hover:text-brand-600">
                {next.title}
              </span>
            </Link>
          )}
        </nav>

        <div className="mt-6">
          <Button href="/notice" variant="secondary" size="md">
            목록으로
          </Button>
        </div>
      </Container>
    </>
  );
}
