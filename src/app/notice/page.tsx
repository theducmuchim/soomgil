import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeading } from '@/components/layout/PageHeading';
import { Container } from '@/components/layout/Container';
import { NOTICE_CATEGORY, sortedNotices } from '@/data/notices';
import { formatDate } from '@/components/home/NoticePreview';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = {
  title: '공지사항',
  description: '서비스 업데이트와 데이터 반영 현황을 알려드립니다.',
};

export default function NoticePage() {
  const notices = sortedNotices();

  return (
    <>
      <PageHeading
        eyebrow="알림"
        title="공지사항"
        description="서비스 업데이트와 데이터 반영 현황을 알려드립니다."
      />

      <Container className="py-8 sm:py-10">
        <ul className="divide-y divide-line border-y border-line">
          {notices.map((notice) => {
            const category = NOTICE_CATEGORY[notice.category];
            return (
              <li key={notice.slug}>
                <Link
                  href={`/notice/${notice.slug}`}
                  className="-mx-3 block rounded-lg px-3 py-5 transition-colors hover:bg-surface-sunken"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold',
                        category.tone,
                      )}
                    >
                      {category.label}
                    </span>
                    {notice.pinned && (
                      <span className="rounded bg-ink-900 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white">
                        고정
                      </span>
                    )}
                    <time
                      dateTime={notice.publishedAt}
                      className="tabular text-[0.71875rem] text-ink-400"
                    >
                      {formatDate(notice.publishedAt)}
                    </time>
                  </div>
                  <p className="mt-2 text-[0.96875rem] leading-snug font-semibold text-ink-900">
                    {notice.title}
                  </p>
                  <p className="mt-1.5 text-[0.84375rem] leading-relaxed text-ink-500">
                    {notice.summary}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-[0.75rem] text-ink-400">전체 {notices.length}건</p>
      </Container>
    </>
  );
}
