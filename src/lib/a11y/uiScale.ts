/**
 * UI 크기 조절 (어르신 접근성).
 *
 * ── 왜 무료인가 ─────────────────────────────────────────
 * 이 기능에는 요금제 게이팅을 걸지 않는다. 대기질 경보는 호흡기가 약한
 * 고령층에게 가장 필요한 정보인데, 그 정보를 읽을 수 있게 하는 장치를
 * 유료로 두면 정작 가장 필요한 사람이 못 쓰게 된다.
 * 공공안전 성격의 서비스에서 글자 크기는 기능이 아니라 접근 조건이다.
 *
 * ── 어떻게 적용되나 ─────────────────────────────────────
 * <html data-ui-scale="large"> 를 바꾸면 globals.css 가 루트 글자 크기를
 * 배율만큼 키운다. 이 서비스의 글자 크기(rem)와 Tailwind 간격·높이 유틸리티가
 * 모두 rem 이라 **글자와 터치 영역이 함께** 커진다.
 *
 * 상태는 브라우저에만 저장한다. 서버 렌더 결과는 배율과 무관하므로
 * 페이지 캐시를 배율별로 나눌 필요가 없다.
 */

export type UiScale = 'normal' | 'large' | 'xlarge';

export const UI_SCALE_KEY = 'soomgil:uiScale';

export const UI_SCALES: {
  id: UiScale;
  /** 버튼에 보이는 글자 — 크기 자체를 글자로 보여준다 */
  label: string;
  /** 스크린리더·툴팁용 전체 이름 */
  name: string;
  /** 버튼 안 '가' 글자의 상대 크기 */
  sample: string;
}[] = [
  { id: 'normal', label: '가', name: '기본 크기', sample: '0.8125rem' },
  { id: 'large', label: '가', name: '크게', sample: '0.9375rem' },
  { id: 'xlarge', label: '가', name: '아주 크게', sample: '1.125rem' },
];

export function isUiScale(value: unknown): value is UiScale {
  return value === 'normal' || value === 'large' || value === 'xlarge';
}

/**
 * 하이드레이션 전에 배율을 적용하는 인라인 스크립트.
 *
 * React가 붙기 전에 실행돼야 한다. 그러지 않으면 "기본 크기로 한 번 그려졌다가
 * 커지는" 깜빡임이 매 페이지 이동마다 보인다. 크게 보기를 켜 둔 사람은
 * 글자가 작아서 켠 것이라, 그 깜빡임이 특히 거슬린다.
 *
 * 저장소 접근이 막혀 있어도(사생활 보호 모드) 화면은 그대로 떠야 하므로 감싼다.
 */
export const UI_SCALE_INIT_SCRIPT = `try{var v=JSON.parse(localStorage.getItem(${JSON.stringify(
  UI_SCALE_KEY,
)})||'""');if(v==='large'||v==='xlarge')document.documentElement.dataset.uiScale=v}catch(e){}`;
