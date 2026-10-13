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

/**
 * 제주돌담체 — 디스플레이 전용.
 *
 * 워드마크와 큰 제목에만 쓴다. 획이 굵고 자폭이 넓어 본문 크기(14px 이하)에서는
 * 읽기 어렵다. 본문은 계속 Pretendard 다.
 *
 * 굵기가 하나뿐인 서체다. font-weight 를 걸면 브라우저가 가짜 볼드(synthetic
 * bold)를 그려 획이 뭉개지므로, 이 서체를 쓰는 자리에서는 weight 를 400 으로
 * 고정한다 (globals.css 의 .display 클래스가 그렇게 한다).
 *
 * 원본 TTF 는 한글 전체 글리프 때문에 2.5MB 다. Pretendard 와 같은 문자 집합
 * (KS X 1001 2,350자 + 저장소 실사용 글자 + 기호)으로 서브셋해 124KB 가 됐다.
 * 재현 절차는 scripts/build-fonts.md 와 같다 — 원본 경로만 바꾸면 된다.
 */
export const jejuDoldam = localFont({
  src: [{ path: '../../public/fonts/JejuDoldam.woff2', weight: '400', style: 'normal' }],
  display: 'swap',
  variable: '--font-jeju-doldam',
  // 서브셋에 없는 글자는 시스템 명조가 대신 그린다 — 세리프 톤이 끊기지 않게
  fallback: ['Nanum Myeongjo', 'Apple SD Gothic Neo', 'Batang', 'ui-serif', 'Georgia', 'serif'],
});
