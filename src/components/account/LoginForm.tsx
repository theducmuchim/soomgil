'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * 시연용 로그인 폼.
 *
 * 인증 서버가 없으므로 입력값을 검증하지도, 전송하지도 않는다.
 * 대신 이 사실을 화면에 명시하고(page.tsx 참조) 마이페이지로 넘겨준다.
 * 실제 인증을 붙일 때는 이 컴포넌트의 submit 핸들러만 교체하면 된다.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // 로그인 상태는 브라우저에만 둔다. 서버로 나가는 값은 없다.
    try {
      window.localStorage.setItem('soomgil:signedIn', email || 'guest');
    } catch {
      // 사생활 보호 모드 등으로 저장이 막혀도 화면은 계속 동작해야 한다
    }
    router.push('/mypage');
  };

  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <label className="block">
        <span className="text-[12.5px] font-semibold text-ink-700">이메일</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="soomgil@example.com"
          autoComplete="email"
          className="mt-1.5 h-11 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[14px] text-ink-900 placeholder:text-ink-300 hover:border-brand-300"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-[12.5px] font-semibold text-ink-700">비밀번호</span>
        <input
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          className="mt-1.5 h-11 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[14px] text-ink-900 placeholder:text-ink-300 hover:border-brand-300"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 h-11 w-full rounded-lg bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? '이동 중…' : '로그인'}
      </button>

      <p className="mt-3 text-center text-[11.5px] text-ink-400">
        입력값은 서버로 전송되지 않습니다.
      </p>
    </form>
  );
}
