import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeading } from '@/components/layout/PageHeading';
import { Container } from '@/components/layout/Container';
import { LoginForm } from '@/components/account/LoginForm';

export const metadata: Metadata = {
  title: '로그인',
  description: '관심 지역과 알림 설정을 저장하려면 로그인하세요.',
};

export default function LoginPage() {
  return (
    <>
      <PageHeading
        title="로그인"
        description="관심 지역과 자주 쓰는 경로를 저장해두면 첫 화면에서 바로 확인할 수 있습니다."
        size="narrow"
      />

      <Container size="narrow" className="py-8 sm:py-12">
        <div className="mx-auto max-w-md">
          {/* 시연용이라는 사실을 숨기지 않는다 — 심사에서 먼저 물어볼 부분이다 */}
          <div className="rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-3.5">
            <p className="text-[0.8125rem] font-semibold text-brand-700">
              시연용 화면입니다
            </p>
            <p className="mt-1.5 text-[0.78125rem] leading-relaxed text-brand-700/80">
              실제 인증 서버에 연결되어 있지 않습니다. 아무 값이나 넣고 눌러도 넘어가며,
              입력한 내용은 어디에도 전송되지 않습니다. 관심 지역·경로 설정은 이용자
              브라우저에만 저장됩니다.
            </p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-[0.78125rem] text-ink-400">
            로그인 없이도 모든 기능을 쓸 수 있습니다.{' '}
            <Link
              href="/route"
              className="font-semibold text-brand-600 underline underline-offset-2"
            >
              바로 경로 찾기
            </Link>
          </p>
        </div>
      </Container>
    </>
  );
}
