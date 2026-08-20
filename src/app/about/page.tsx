import type { Metadata } from 'next';
import { PageHeading } from '@/components/layout/PageHeading';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { FOOTER, SITE } from '@/config/site';

export const metadata: Metadata = {
  title: '팀 소개',
  description: '왜 이 문제를 풀기로 했는지, 어떻게 만들었는지 정리했습니다.',
};

/** 기술 구성 — 공공데이터에서 경로 추천까지의 흐름 */
const PIPELINE = [
  {
    step: '공공데이터 수집',
    detail: '기상청 꽃가루·대기정체·단기예보·기상특보, 에어코리아 실시간 측정',
    note: '스냅샷 1회당 21개 호출. 발표 주기에 맞춘 서버 캐시로 하루 호출량을 한도 안에 유지합니다.',
  },
  {
    step: '정규화',
    detail: '단위가 다른 지표를 0~100 같은 눈금으로 변환',
    note: '각 지표의 4단계 경계값이 25 / 50 / 75에 오도록 구간별 선형보간합니다.',
  },
  {
    step: '계절 가중합',
    detail: '이번 계절 핵심 지표에만 가중치를 주고 합산',
    note: '봄 꽃가루 → 여름 폭염·오존 → 가을 잡초 꽃가루 → 겨울 미세먼지·한파',
  },
  {
    step: '대기정체 보정',
    detail: '분지 지형 효과를 보정계수로 곱함 (최대 ×1.35)',
    note: '보정 전 점수와 보정 후 점수를 모두 남겨 화면에 함께 표시합니다.',
  },
  {
    step: '풍향 보정 + 경로 탐색',
    detail: '격자 위 A* 탐색으로 노출량이 가장 적은 경로를 찾음',
    note: '바람이 불어오는 쪽에 더 나쁜 지역이 있으면 그 차이의 일부를 가산합니다.',
  },
];

const ROLES = [
  { role: '기획 · 문제 정의', desc: '대전 계절별 대기 위험 조사, 서비스 구조 설계' },
  { role: '데이터', desc: '공공데이터 API 조사, 지표 선정과 가중치 설계' },
  { role: '개발', desc: '위험도 엔진, 지도·경로 탐색, 화면 구현' },
  { role: '디자인', desc: '정보 구조, 색 체계, 접근성 검토' },
];

export default function AboutPage() {
  return (
    <>
      <PageHeading
        eyebrow={FOOTER.team.name}
        title="팀 소개"
        description="왜 이 문제를 풀기로 했는지, 어떻게 만들었는지 정리했습니다."
      />

      <Container className="py-8 sm:py-10">
        {/* 문제의식 */}
        <section className="max-w-3xl">
          <h2 className="text-[19px] font-bold tracking-tight text-ink-900">
            왜 이 문제를 골랐나
          </h2>
          <div className="mt-3 space-y-3.5 text-[14.5px] leading-relaxed text-ink-700">
            <p>
              대전은 사방이 산으로 둘러싸인 분지입니다. 바람이 잘 빠져나가지 않아 공기가
              한번 나빠지면 오래 갑니다. 그런데 그 정체된 공기 속에 쌓이는 물질은 계절마다
              다릅니다. 봄에는 소나무·참나무 꽃가루와 황사가, 여름에는 폭염과 오존이,
              가을에는 잡초 꽃가루와 미세먼지가, 겨울에는 미세먼지와 한파가 겹칩니다.
            </p>
            <p>
              기존 서비스는 여기까지는 알려줍니다. 기상청 날씨누리는 꽃가루농도위험지수를,
              에어코리아는 미세먼지 예보를 지역 단위로 제공합니다. 그런데 정작{' '}
              <strong className="font-semibold text-ink-900">
                “지금 이 길로 가도 되나”
              </strong>
              에는 아무도 답하지 않습니다. 위험도는 알려주는데 어디로 가라는 말은 없습니다.
            </p>
            <p>
              숨쉬는길은 그 빈칸을 채웁니다. 같은 공공데이터에 실시간 풍향과 분지 지형의
              대기정체를 더해, 같은 목적지라도 상대적으로 덜 위험한 경로를 안내합니다.
            </p>
          </div>
        </section>

        {/* 기술 구성 */}
        <section className="mt-12">
          <h2 className="text-[19px] font-bold tracking-tight text-ink-900">
            공공데이터에서 경로 추천까지
          </h2>
          <ol className="mt-5 space-y-3">
            {PIPELINE.map((item, i) => (
              <li
                key={item.step}
                className="flex gap-4 rounded-xl border border-line bg-surface p-4 sm:p-5"
              >
                <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-bold text-ink-900">{item.step}</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-700">
                    {item.detail}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">
                    {item.note}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 팀 */}
        <section className="mt-12">
          <h2 className="text-[19px] font-bold tracking-tight text-ink-900">팀 구성</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {ROLES.map((member) => (
              <li
                key={member.role}
                className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4"
              >
                {/* 사진 자리 — 팀 사진이 준비되면 이 자리에 넣습니다 */}
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong bg-surface-sunken"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink-300" fill="none">
                    <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink-900">{member.role}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">
                    {member.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-ink-400">
            팀원 사진과 이름은 준비되는 대로 넣을 예정입니다.
          </p>
        </section>

        {/* 앞으로 */}
        <section className="mt-12 rounded-2xl border border-brand-200 bg-brand-50/60 p-5 sm:p-7">
          <h2 className="text-[17px] font-bold text-brand-700">앞으로의 계획</h2>
          <ul className="mt-4 space-y-2.5 text-[13.5px] leading-relaxed text-ink-700">
            <li>
              · 공공데이터포털 인증키를 발급받아 실시간 데이터로 전환합니다. 화면은 그대로
              두고 환경변수 두 줄만 바꾸면 되도록 만들어 두었습니다.
            </li>
            <li>
              · 실제 도로망 경로 API를 붙여 격자 경로를 도로 경로로 바꿉니다. 노출량 계산은
              경로 좌표만 있으면 그대로 동작합니다.
            </li>
            <li>
              · 알레르기성 비염·천식 등 사용자별 민감도를 설정해 같은 상황에서도 다른
              기준으로 안내합니다.
            </li>
            <li>
              · 대전시 자전거도로·산책로 데이터를 붙여 하천변 대안 경로를 실제 이동 경로와
              맞춥니다.
            </li>
          </ul>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Button href="/route" size="lg">
              서비스 사용해 보기
            </Button>
            <Button href="/guide" variant="secondary" size="lg">
              계산 방식 자세히 보기
            </Button>
          </div>
        </section>

        <p className="mt-8 text-[12.5px] text-ink-400">
          {SITE.name} · {FOOTER.team.note} · 문의{' '}
          <a
            href={`mailto:${FOOTER.team.contact}`}
            className="underline underline-offset-2 hover:text-brand-600"
          >
            {FOOTER.team.contact}
          </a>
        </p>
      </Container>
    </>
  );
}
