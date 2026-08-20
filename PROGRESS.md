# 숨쉬는길 — 제작 진행 기록

> 이 파일은 단계별 작업 로그입니다. 아침에 이어서 작업할 때 여기부터 보시면 됩니다.
> 실행: `npm run dev` → http://localhost:3000
> 계절 강제: 모든 페이지에 `?season=spring|summer|autumn|winter`

---

## 현재 상태 한눈에

| 단계 | 내용 | 상태 |
|---|---|---|
| 0 | 프로젝트 초기화 · 타입 · 설정 · 디자인 토큰 · 로고 | ✅ |
| 1 | Header / MobileNav / Footer + 라우팅 12개 | ✅ |
| 2 | mock 데이터 + 위험도 엔진 | ✅ |
| 3 | 홈 히어로 + 문제/해결 대비 섹션 | ✅ |
| 4 | 홈 대시보드 + 기능카드 + 공지 | ✅ |
| 5 | 위험 지도 (Leaflet) | ✅ |
| 6 | 경로 안내 (A* 탐색) | ✅ |
| 7 | 레이어 지도 | ✅ |
| 8 | 통계 (차트 2종) | ✅ |
| 9 | 나머지 페이지 (공지·이용안내·팀소개·로그인·마이페이지) | ✅ |
| 10 | 반응형 점검 + 배포 준비 | ✅ |

**전 단계 완료.** 남은 것은 실제 공공데이터 API 연동뿐이며, 인증키 두 줄만 넣으면 됩니다
(README 참조). 코드 수정은 필요 없습니다.

**최종 상태**: 라우트 14개 · ESLint 0 · 타입체크 통과 · 6개 화면폭에서 가로 오버플로 0건 · 페이지 에러 0건

---

## 0단계 — 초기화

**스택**: Next.js 16.3.1 (App Router) / React 19 / TypeScript / Tailwind v4
**추가 의존성**: leaflet, react-leaflet, recharts, swr, clsx, tailwind-merge

- `src/types/index.ts` — 도메인 타입 전체
- `src/config/indicators.ts` — 지표 10종 (라벨·단위·4단계 경계값·서비스 기간)
- `src/config/seasons.ts` — 계절별 핵심 지표와 가중치
- `src/config/site.ts` — 서비스명·메뉴·푸터
- `src/data/districts.ts` — 자치구 5개 + areaNo + 예보 격자
- `src/lib/utils/time.ts` — KST 전용 시간 처리 (서버 UTC 사고 방지)
- `src/lib/env.ts` — mock/live 스위치 + 캐시 TTL
- `src/app/globals.css` — 디자인 토큰 (브랜드 블루 9단계 + 위험 4색)
- `src/components/ui/Logo.tsx` — SVG 로고

---

## 1단계 — 레이아웃 + 라우팅

- `components/layout/` — Header, MobileNav, Footer, Container, PageHeading
- `components/ui/Button.tsx` — 4변형 × 3크기
- 라우트 12개: `/`, `/route`, `/risk-map`, `/layers`, `/stats`, `/guide`, `/notice`, `/notice/[slug]`, `/about`, `/login`, `/mypage`, 404

**반응형**: `<lg` 로고+경로찾기+햄버거 / `lg` 주메뉴 노출 / `xl` 보조메뉴까지
**Next 16 대응**: `<html data-scroll-behavior="smooth">` — 16부터 라우트 전환 시 CSS smooth scroll을 덮어쓰지 않아 페이지 이동이 느려지는 문제

---

## 2단계 — mock 데이터 + 위험도 엔진

### 계산 흐름
```
지표 원단위값 → ① 0~100 정규화 → ② 계절 가중합(보정 전 점수)
             → ③ 대기정체 보정계수(최대 ×1.35) → ④ 0~100 클램프(최종 점수)
```
②③④를 `ScoreBreakdown`에 전부 남깁니다 (`baseScore` / `stagnationFactor` / `score` / `stagnationDeltaPct` / `contributions`).
`stagnationDeltaPct`는 클램프 **이후** 값으로 역산하므로 화면 숫자와 항상 일치합니다.

### 4계절 mock 실측 결과
| 계절 | 시평균 (보정전→후) | 상황 |
|---|---|---|
| 봄 | 56 → 63.1 (+12.7%) | 참나무 꽃가루 3 + 황사 PM10 141~172 |
| 여름 | 66.5 → 79.1 (+18.9%) | 체감 35~36.5℃ 폭염경보 + O₃ 0.098~0.138 |
| 가을 | 54.4 → 63.0 (+15.8%) | 돼지풀 꽃가루 3 + PM10 66~92 |
| 겨울 | 58.6 → 73.2 (+24.9%) | PM2.5 49~78 + 체감 -13~-16℃ 한파 |

### 주요 파일
- `lib/risk/season.ts` — 계절 판정, carryOver, 가중치 재정규화
- `lib/risk/apparent-temp.ts` — 체감온도 자체 산출 (여름 습구온도식 / 겨울 풍속냉각지수) + 특보 보정
- `lib/risk/score.ts` — 정규화·등급·보정·분해
- `lib/api/` — client(mock/live 스위치) + 소스 6종 + `getRiskSnapshot()` 파사드
- `lib/normalize/` — 원본 응답 → 도메인 타입
- `mocks/raw/` + `mocks/scenarios/` — API 응답 형태를 그대로 재현
- `app/api/risk/route.ts` — 통합 스냅샷 엔드포인트

### 캐시 TTL (호출 예산 계산 결과)
스냅샷 1회 = 21개 호출. 전부 20분 캐시면 기상청만 하루 1,440회로 한도 초과.
발표 주기에 맞춰 분리:

| 대상 | TTL | 일 호출 |
|---|---|---|
| 꽃가루·대기정체 (하루 4회 발표) | 3시간 | 120 |
| 단기예보 (3시간 간격) | 1시간 | 96 |
| 기상특보 | 10분 | 144 |
| **기상청 합계** | | **360** ✅ |
| 에어코리아 (일 500회 한도) | 20분 | 72 ✅ |

단기예보는 격자 중복 제거로 5회 → 4회.

---

## 3단계 — 홈 히어로 + 문제/해결 대비

- `components/home/HeroSection.tsx` — 슬로건 + CTA 2개 + **지금 계산된 실제 위험도 카드**
- `components/home/ProblemSolutionSection.tsx` — "지금 대전은" ↔ "숨쉬는길은 다르게 합니다" 4:4
- `components/risk/RiskBadge.tsx`

대기정체 문구는 하드코딩이 아니라 엔진에서 읽습니다:
- `최대 35%` = `MAX_STAGNATION_BOOST` 상수
- `지금 +24.9%` = 스냅샷의 `cityAverage.stagnationDeltaPct` (계절마다 자동 변경)

---

## 4단계 — 홈 대시보드 + 기능카드 + 공지

- `components/home/LiveDashboardSection.tsx` — 자치구 순위(왼쪽) + 계절 핵심 지표(오른쪽)
- `components/home/FeatureCards.tsx` — 경로 안내 / 위험 지도 / 레이어 지도
- `components/home/NoticePreview.tsx` — 최신 공지 3건
- `components/risk/DistrictRiskBar.tsx`, `IndicatorCard.tsx`
- `lib/risk/color.ts` — **점수 → 연속 색상** (등급 색을 12.5/37.5/62.5/87.5에 고정하고 보간)
- `data/notices.ts` — 공지 5건

**판단 근거**: 지표 카드는 시 평균이 아니라 **가장 위험한 구** 기준으로 표시합니다. 평균을 쓰면 "어디도 그렇게 나쁘진 않다"처럼 읽혀 경고 기능을 잃습니다.

---

## 5단계 — 위험 지도

- `data/geo/districts.ts` (5개) · `data/geo/dong.ts` (78개) — 통계청 SGIS 2013 경계, 좌표 5자리 반올림
- `components/map/DaejeonMap.tsx` — Leaflet 본체 (ssr:false 필수)
- `components/map/MapFrame.tsx` — dynamic 로더
- `components/map/RiskMapView.tsx` — 해상도 토글 + 선택 상태
- `components/map/MapLegend.tsx`, `WindArrow.tsx`
- `components/risk/AreaDetailPanel.tsx` — 보정 전 → 계수 → 보정 후 + 지표별 기여도
- `lib/risk/dong.ts` — 행정동 추정치

**판단 근거 3가지**
1. **색은 등급이 아니라 점수 기준** — 봄·가을은 5개 구가 전부 '높음'이라 등급 색만 쓰면 지도가 한 색이 됨
2. **베이스맵은 라벨 없는 Carto Positron** — 라벨 버전은 지명이 영문(DAEJEON, Bugang-myeon)이라 한국어 서비스에 섞이면 어색함. 지명은 한글로 직접 그림
3. **행정동 라벨은 상위 6개만** — 78개 전부 그리면 겹쳐서 안 읽힘

**행정동 값은 추정치**입니다. 대기질 관측은 측정소 단위(대전 10곳), 예보는 5km 격자라 행정동 78개 직접 관측 데이터가 없습니다. 화면에 이 사실을 명시했습니다.

**검증**: headless Chrome으로 실제 렌더 확인 — 자치구 5개 폴리곤 / 행정동 78개 폴리곤, 타일 로드 정상, 페이지 에러 없음, 가로 오버플로 없음.


---

## 6단계 — 경로 안내 (핵심 기능)

- `data/places.ts` — 대전 주요 지점 24곳 (교통·학교·병원·공공·상업·공원)
- `lib/routing/grid.ts` — 대전 전역 56×56 격자 (약 550m), 노드↔행정동 매핑 캐시
- `lib/routing/astar.ts` — A* 탐색
- `lib/routing/index.ts` — 세 가지 경로안 생성
- `lib/risk/route-score.ts` — 풍향 보정 + 체류시간 가중 노출량
- `lib/risk/corridors.ts` — 하천축 보정
- `components/map/RouteMap.tsx`, `components/route/*`

### 비용 함수
```
비용 = 거리 × (1 + riskWeight × 위험도/100 + straightWeight × 직선이탈거리/1km)
실효속도 = 기본속도 ÷ (1 + 0.34 × 평균 직선이탈거리km)
```

| 경로안 | riskWeight | straightWeight |
|---|---|---|
| 가장 안전한 길 | 9 | 0 |
| 균형 | 2.5 | 0.55 |
| 최단 시간 | 0 | 2.2 |

### 여기서 막혔다가 푼 것 3가지

**① 세 경로가 전부 같은 거리로 나왔다**
8방향 격자에서는 출발→도착 사이의 계단형 경로들이 기하학적으로 **길이가 전부 같습니다**
(대각선이 가로+세로를 한 번에 덮음). 위험 가중치만 바꾸면 A*는 같은 길이의 경로 집합
안에서만 고르기 때문에, 거리는 그대로인데 노출만 줄어드는 결과가 나옵니다.
→ 직선 선호도 항(간선도로 근사)과 이탈거리 기반 속도 저하를 넣어, 실제로 참인
   "우회하면 느려진다"는 성질로 맞바꿈을 만들었습니다.

**② 우회할 이유가 없었다 (개선폭 -2%)**
행정동 위험도를 무작위로 흔들었더니 분포가 너무 매끄러워서 어떤 길로 가도 같은 띠를
지났습니다. 가중치를 30까지 올려도 경로가 안 바뀌었습니다.
→ 실제 공간 분포로 교체했습니다. **도심도 보정**(미세먼지·오존·열섬은 도심이 높고,
   꽃가루는 외곽 산림이 높음 — 그래서 계절마다 지도 패턴이 뒤집힙니다)과
   **하천축 보정**(갑천·유등천·대전천 주변 -22%)을 넣었습니다.

**③ 기준선이 화면에 없는 경로였다**
서로 다른 가중치가 같은 경로를 내놓으면 중복 제거를 하는데, 안전 경로부터 훑다 보니
최단 경로가 지워지고 화면에 없는 경로를 기준으로 "-14%"를 계산하고 있었습니다.
→ 중복 제거를 최단 경로부터 하도록 순서를 뒤집었습니다.

### 결과 (275개 OD 조합 전수 계산)
- 평균 개선 **-2.1%**, 최대 **-15.2%** (서대전역 → 신탄진역)
- 실제 대안 경로가 있는 조합에서만 10% 이상 벌어집니다
- 기본 시연 조합은 **정부대전청사 → 계족산 황톳길** (12분 더 써서 -10.5%)
- 개선 여지가 없는 조합에서는 화면이 "차이가 크지 않습니다"라고 솔직하게 말합니다

---

## 7단계 — 레이어 지도

- `config/layers.ts` — 꽃가루 / 미세먼지 / 폭염·한파 / 오존 4종
- `components/map/LayerMapView.tsx` — 토글, 겹쳐보기, 서비스 기간 자동 비활성

**고친 버그**: 오존은 연중 제공인데 봄·겨울에 "서비스 기간 아님"으로 나왔습니다.
스냅샷이 *계절 핵심 지표만* 담고 있었기 때문입니다.
→ 이번 달에 받을 수 있는 지표를 **전부** 담도록 바꿨습니다. 미세먼지·오존은 에어코리아
   1회 호출에 다 들어 있고 체감온도는 단기예보로 산출하므로 **추가 API 호출이 없습니다.**

---

## 8단계 — 통계

- `lib/api/trend.ts` — 24시간 추이 (계절별 프로파일, "지금" 값은 다른 화면과 정확히 일치)
- `components/chart/DistrictBarChart.tsx` — 가로 막대 + 표 보기
- `components/chart/HourlyTrendChart.tsx` — 선 + 등급 기준선 + 직접 라벨 2개 + 표 보기

**위험 색 팔레트를 고쳤습니다.** 색 검증기를 돌려보니 높음(`#e4692b`)과
매우높음(`#d02f3a`)이 정상 시야 기준 ΔE 12로 붙어 있어, **지도에서 두 등급이
구분되지 않았습니다.** 매우높음을 `#a3132b`로 내려 ΔE 15.2(색각이상 10.3)까지
벌렸습니다. 지도·배지·차트 전체에 반영됩니다.

---

## 9단계 — 나머지 페이지

- `/notice` + `/notice/[slug]` — 공지 5건, 정적 생성
- `/guide` — **위험 4단계 기준표 · 점수 계산 4단계 · 계절 전환 · 데이터 출처 · 추정값과 한계 · 약관 · 개인정보**
- `/about` — 문제의식 · 파이프라인 5단계 · 팀 구성(사진 자리 플레이스홀더) · 향후 계획
- `/login` — 시연용임을 명시, 서버 전송 없음
- `/mypage` — 관심 지역 · 알림 기준 · 자주 쓰는 경로 (전부 localStorage)

`lib/utils/local-store.ts` — `useSyncExternalStore` 기반 저장소 훅.
`useEffect + setState`로 localStorage를 읽으면 React 규칙 위반이고 렌더가 한 번 더
도는데, 이 API는 서버 스냅샷을 따로 줄 수 있어 하이드레이션 불일치도 없습니다.

---

## 10단계 — 반응형 점검 + 배포 준비

**6개 화면폭 × 9개 페이지 자동 점검** (375 / 390 / 412 / 768 / 1280 / 1680)
→ 가로 오버플로 **0건**, 페이지 에러 **0건**

**고친 것**
- 마이페이지 셀렉트가 모바일에서 높이 20px로 찌그러짐 — `flex-col` 안에서 `flex-1`은
  flex-basis를 **높이**에 적용합니다. `w-full sm:flex-1`로 변경
- 푸터 링크 탭 영역 15px → 30px
- 이용안내 목차, 홈 "전체 보기" 링크 탭 영역 확대
- 지도 확대/축소 버튼 모바일에서 30px → 40px

**추가**
- `README.md` — 설치·시연·실데이터 전환·배포 안내
- `app/sitemap.ts`, `app/robots.ts`

---

## 아침에 확인하면 좋을 것

1. `npm run dev` 후 `?season=` 을 바꿔가며 4계절 화면 확인
2. `/guide` 의 "추정값과 한계" — 심사에서 나올 질문에 대한 답을 미리 적어둔 부분입니다
3. `/route` 에서 출발/목적지를 바꿔보세요. 개선폭이 큰 조합:
   - 서대전역 → 신탄진역 (-15.2%)
   - 보문산공원 → 신탄진역 (-14.6%)
   - 을지대학교병원 → 계족산 황톳길 (-10.9%)
4. `/about` 팀 구성 — 사진과 이름은 플레이스홀더로 두었습니다
5. `src/config/site.ts` 의 연락처(`soomgil.team@example.com`)를 실제 주소로 교체

## 남은 작업

- [ ] 공공데이터포털 인증키 발급 → `.env.local` 두 줄 (코드 수정 없음)
- [ ] `TODO(live)` 항목 대조 (`grep -rn "TODO(live)" src/`)
- [ ] 팀 사진·이름 반영, 연락처 교체
- [ ] Vercel 배포 후 `SITE.url` 갱신
