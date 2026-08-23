import localFont from 'next/font/local';

/**
 * Pretendard — 로컬 탑재.
 *
 * ── 왜 CDN 을 걷어냈나 ──────────────────────────────────
 * 예전에는 jsdelivr 의 variable dynamic-subset CSS 를 <link> 로 불렀다.
 * 편하지만 첫 화면이 남의 서버에 묶인다. CDN 이 느리면 글자가 늦게 뜨고,
 * 막히면 시스템 폰트로 떨어진다. 공공서비스 성격의 화면에서 첫인상을
 * 통제하지 못하는 건 손해가 크다.
 *
 * next/font/local 은 빌드 시점에 파일을 해시 경로로 옮기고 preload 링크와
 * font-display 를 자동으로 붙인다. 외부 요청이 0이 된다.
 *
 * ── 용량 ────────────────────────────────────────────────
 * 원본 OTF 는 한글 전체 글리프 때문에 한 벌에 1.5MB, 5벌이면 7.5MB 다.
 * 그대로 넣으면 첫 로딩이 눈에 띄게 느려진다.
 *
 * KS X 1001 상용 한글 2,350자 + 저장소에서 실제로 쓰는 글자 + 기호로
 * 서브셋해 woff2 로 변환했다. 5벌 합쳐 876KB 다.
 *   scripts/build-fonts.md 에 재현 절차를 적어 두었다.
 *
 * 서브셋에 없는 희귀 음절(드문 도로명 등)은 tofu 로 깨지지 않는다.
 * fallback 스택의 시스템 한글 폰트가 그 글자만 대신 그린다.
 *
 * ── 가중치 ──────────────────────────────────────────────
 * 400 본문 · 500 강조 본문 · 600 라벨 · 700 제목 · 800 큰 제목.
 * Thin/ExtraLight/Light/Black 은 디자인에서 쓰지 않아 넣지 않았다.
 */
export const pretendard = localFont({
  src: [
    { path: '../../public/fonts/Pretendard-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Pretendard-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/Pretendard-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/Pretendard-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../../public/fonts/Pretendard-ExtraBold.woff2', weight: '800', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-pretendard',
  // 서브셋에 없는 글자가 나와도 자연스럽게 이어지도록
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'Segoe UI',
    'Apple SD Gothic Neo',
    'Malgun Gothic',
    'sans-serif',
  ],
});
