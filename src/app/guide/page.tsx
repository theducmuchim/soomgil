import type { Metadata } from 'next';
import { PageHeading } from '@/components/layout/PageHeading';
import { Container } from '@/components/layout/Container';
import { INDICATORS, RISK_LEVELS, RISK_LEVEL_ORDER } from '@/config/indicators';
import { SEASONS, SEASON_ORDER } from '@/config/seasons';
import { MAX_STAGNATION_BOOST } from '@/lib/risk/score';
import { FOOTER } from '@/config/site';
import type { IndicatorId } from '@/types';

export const metadata: Metadata = {
  title: '이용안내',
  description:
    '위험 등급을 어떻게 계산하는지, 어떤 공공데이터를 쓰는지, 어디까지 참고용인지 밝혀둡니다.',
};

/** 목차에 걸 절 */
const SECTIONS = [
  { id: 'levels', label: '위험 4단계 기준' },
  { id: 'score', label: '점수 계산 방식' },
  { id: 'season', label: '계절별 지표 전환' },
  { id: 'sources', label: '데이터 출처와 갱신 주기' },
  { id: 'limits', label: '추정값과 한계' },
  { id: 'terms', label: '이용약관' },
  { id: 'privacy', label: '개인정보처리방침' },
];

const SHOWN_INDICATORS: IndicatorId[] = [
  'pm10',
  'pm25',
  'ozone',
  'yellowDust',
  'heat',
  'cold',
  'oakPollen',
  'weedPollen',
  'stagnation',
];

export default function GuidePage() {
  const maxBoostPct = Math.round(MAX_STAGNATION_BOOST * 100);

  return (
    <>
      <PageHeading
        eyebrow="서비스 안내"
        title="이용안내"
        description="숨쉬는길이 위험도를 어떻게 계산하는지, 어떤 데이터를 쓰는지, 어디까지 믿고 쓰셔도 되는지 밝혀둡니다."
      />

      <Container className="py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
          {/* 목차 */}
          <nav aria-label="이 페이지 목차" className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-[12px] font-semibold text-ink-400">목차</p>
            <ul className="mt-3 space-y-1.5">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block rounded-md py-2 text-[13px] text-ink-500 transition-colors hover:text-brand-600"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0">
            {/* 위험 4단계 */}
            <Section id="levels" title="위험 4단계 기준">
              <p>
                숨쉬는길은 기상청·환경부가 쓰는 4단계 체계를 그대로 따릅니다. 종합
                위험도는 0~100점으로 계산되고, 아래 구간에 따라 등급이 매겨집니다.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-left text-ink-400">
                      <th className="py-2 pr-4 font-medium">등급</th>
                      <th className="py-2 pr-4 font-medium">점수</th>
                      <th className="py-2 font-medium">권장 행동</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RISK_LEVEL_ORDER.map((level, i) => (
                      <tr key={level} className="border-b border-line/60">
                        <td className="py-2.5 pr-4">
                          <span className="inline-flex items-center gap-2 font-semibold">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: RISK_LEVELS[level].color }}
                              aria-hidden="true"
                            />
                            {RISK_LEVELS[level].label}
                          </span>
                        </td>
                        <td className="tabular py-2.5 pr-4 text-ink-500">
                          {[0, 25, 50, 75][i]} ~ {[25, 50, 75, 100][i]}
                        </td>
                        <td className="py-2.5 text-ink-500">
                          {
                            [
                              '평소대로 활동하셔도 됩니다.',
                              '민감군은 장시간 실외 활동을 줄이세요.',
                              '민감군은 실외 활동을 피하고, 일반인도 시간을 줄이세요.',
                              '가급적 실외 활동을 피하고, 나가야 한다면 마스크를 착용하세요.',
                            ][i]
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[12.5px] text-ink-400">
                민감군: 어린이, 노인, 호흡기·심혈관 질환자, 임산부, 알레르기성 비염
                환자
              </p>
            </Section>

            {/* 점수 계산 */}
            <Section id="score" title="점수 계산 방식">
              <p>종합 위험도는 네 단계를 거쳐 나옵니다.</p>
              <ol className="mt-4 space-y-3">
                {[
                  [
                    '지표를 0~100으로 정규화',
                    '미세먼지(µg/m³), 오존(ppm), 체감온도(℃), 꽃가루지수는 단위가 전부 다릅니다. 각 지표의 4단계 경계값이 항상 25 / 50 / 75에 오도록 변환해, 서로 다른 지표를 같은 눈금 위에 올립니다.',
                  ],
                  [
                    '계절 가중치로 합산',
                    '이번 계절의 핵심 지표에만 가중치를 주고 합칩니다. 이 값이 보정 전 점수입니다.',
                  ],
                  [
                    '대기정체 보정',
                    `대전은 산으로 둘러싸인 분지라 같은 배출량에도 공기가 빠져나가지 못합니다. 기상청 대기정체지수에 따라 최대 ${maxBoostPct}%까지 점수를 올립니다.`,
                  ],
                  [
                    '0~100으로 자름',
                    '보정 결과가 100을 넘으면 100으로 맞춥니다. 화면에 표시되는 상승률은 이 처리 이후 값으로 다시 계산하므로, 표시된 숫자끼리 항상 맞아떨어집니다.',
                  ],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-3.5">
                    <span className="tabular mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-700">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-ink-900">{title}</p>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500">
                        {body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 rounded-lg bg-surface-sunken px-4 py-3 text-[13px] leading-relaxed text-ink-500">
                경로 안내에서는 여기에 <strong className="font-semibold">풍향 보정</strong>이
                더해집니다. 바람이 불어오는 쪽에 더 나쁜 지역이 있으면 그 차이의 일부를
                가산합니다. 노출 점수는 단순 평균이 아니라 구간별 체류 시간으로 가중
                평균한 값입니다.
              </p>
            </Section>

            {/* 계절 전환 */}
            <Section id="season" title="계절별 지표 전환">
              <p>
                계절이 바뀌면 종합 위험도를 계산하는 핵심 지표가 자동으로 바뀝니다.
                꽃가루처럼 서비스 기간이 정해진 지표는 기간이 끝나면 화면에서 사라집니다.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {SEASON_ORDER.map((seasonId) => {
                  const season = SEASONS[seasonId];
                  return (
                    <div
                      key={seasonId}
                      className="rounded-xl border border-line bg-surface p-4"
                    >
                      <p className="text-[13.5px] font-bold text-ink-900">
                        {season.label}{' '}
                        <span className="text-[11.5px] font-medium text-ink-400">
                          {season.months.join('·')}월
                        </span>
                      </p>
                      <ul className="mt-2.5 space-y-1">
                        {(Object.entries(season.weights) as [IndicatorId, number][]).map(
                          ([id, weight]) => (
                            <li
                              key={id}
                              className="flex items-baseline justify-between gap-2 text-[12.5px]"
                            >
                              <span className="text-ink-700">
                                {INDICATORS[id].shortLabel}
                              </span>
                              <span className="tabular text-ink-400">
                                {Math.round(weight * 100)}%
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-400">
                6월은 여름 지표(폭염·오존)를 쓰지만, 꽃가루농도위험지수 서비스 기간이
                3월~6월이라 소나무·참나무 꽃가루도 함께 표시합니다. 이때 꽃가루는 참고용
                표시일 뿐 종합 점수에는 반영되지 않습니다. 계절이 넘어가는 시점에 점수가
                갑자기 튀는 것을 막기 위해서입니다.
              </p>
            </Section>

            {/* 데이터 출처 */}
            <Section id="sources" title="데이터 출처와 갱신 주기">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-left text-ink-400">
                      <th className="py-2 pr-4 font-medium">지표</th>
                      <th className="py-2 pr-4 font-medium">단위</th>
                      <th className="py-2 pr-4 font-medium">제공 기간</th>
                      <th className="py-2 font-medium">출처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHOWN_INDICATORS.map((id) => {
                      const meta = INDICATORS[id];
                      return (
                        <tr key={id} className="border-b border-line/60">
                          <td className="py-2.5 pr-4 font-medium text-ink-900">
                            {meta.label}
                          </td>
                          <td className="py-2.5 pr-4 text-ink-500">{meta.unit}</td>
                          <td className="py-2.5 pr-4 text-ink-500">
                            {meta.serviceMonths
                              ? `${meta.serviceMonths[0]}~${meta.serviceMonths[meta.serviceMonths.length - 1]}월`
                              : '연중'}
                          </td>
                          <td className="py-2.5 text-ink-500">{meta.source}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-[13.5px] leading-relaxed text-ink-500">
                갱신 주기는 원본 데이터의 발표 주기에 맞춥니다. 꽃가루·대기정체지수는
                하루 4회(06·12·18·24시) 발표되므로 3시간, 단기예보는 3시간 간격
                발표이므로 1시간, 기상특보는 발효·해제가 빨라 10분, 에어코리아 실시간
                측정은 20분 주기로 다시 받아옵니다.
              </p>
            </Section>

            {/* 한계 */}
            <Section id="limits" title="추정값과 한계">
              <p>
                아래 세 가지는 관측값이 아니라 <strong className="font-semibold">
                숨쉬는길이 계산한 추정값</strong>입니다. 심사·발표 자리에서 그대로
                밝히고 쓰셔도 되도록 여기 적어둡니다.
              </p>

              <ul className="mt-4 space-y-4">
                <li className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-[14px] font-semibold text-ink-900">
                    체감온도는 자체 산출값입니다
                  </p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">
                    기상청 생활기상지수의 체감온도(대상·환경별) 세부 지수는 2026년 5월
                    1일자로 서비스가 종료됐습니다. 그리고 기상청 단기예보에는 체감온도
                    항목이 없고 기온·상대습도·풍속까지만 제공됩니다. 그래서 숨쉬는길은
                    이 세 값으로 체감온도를 직접 계산합니다. 여름철은 습구온도 기반
                    공식을, 겨울철은 풍속냉각지수를 적용하고, 폭염·한파 특보가 발효
                    중이면 특보 기준선까지 값을 보정합니다.{' '}
                    <strong className="font-semibold text-ink-700">
                      기상청이 공식 발표하는 체감온도와 소수점 단위로 다를 수 있습니다.
                    </strong>
                  </p>
                </li>

                <li className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-[14px] font-semibold text-ink-900">
                    행정동 단위 값은 자치구 값에서 추정합니다
                  </p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">
                    대기질 관측은 에어코리아 도시대기 측정소 단위(대전 10곳), 기상
                    예보는 약 5km 격자 단위입니다. 행정동 78곳을 각각 관측한 데이터는
                    존재하지 않습니다. 그래서 자치구 관측값을 기준으로, 도심에 가까울수록
                    미세먼지·오존·열섬이 높고 외곽 산림·하천변일수록 꽃가루가 높다는
                    공간 분포를 적용해 동 단위로 나눕니다.
                  </p>
                </li>

                <li className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-[14px] font-semibold text-ink-900">
                    경로 엔진은 두 가지이고, 화면에 어느 쪽인지 표시합니다
                  </p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">
                    TMAP 앱키가 연결돼 있으면 <strong className="font-semibold">TMAP
                    보행자 경로 API</strong>로 실제 도로를 따라가는 경로를 받아옵니다. 그
                    경로 위를 100m 간격으로 샘플링해 어느 행정동을 지나는지 판정하고,
                    구간마다 위험도와 풍향 보정을 적용합니다. TMAP은 대안 경로를 여러 개
                    주지 않아, 경유지를 다르게 준 후보를 따로 받아 그중 노출이 가장 적은
                    것을 안전 경로로 제시합니다.
                  </p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">
                    앱키가 없거나 호출이 실패하면 대전 전역에 깐 약 550m 격자 위에서 A*
                    탐색으로 만든 <strong className="font-semibold">근사 경로</strong>로
                    자동 전환됩니다. 도로를 정확히 따라가지는 않지만 어느 지역을
                    지나가는지는 정확합니다. 경로 안내 화면 상단에 지금 어느 엔진으로
                    계산된 경로인지 항상 표시합니다.
                  </p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">
                    하천변 보정(갑천·유등천·대전천 주변은 확산이 좋아 농도가 낮음)은 실제
                    물길을 단순화한 근사치를 씁니다.
                  </p>
                </li>
              </ul>

              <p className="mt-4 rounded-lg bg-surface-sunken px-4 py-3 text-[13px] leading-relaxed text-ink-500">
                {FOOTER.disclaimer}
              </p>
            </Section>

            {/* 약관 */}
            <Section id="terms" title="이용약관">
              <p>
                숨쉬는길은 고등학생 팀이 만든 공모전 출품용 프로토타입입니다. 영리 목적의
                서비스가 아니며, 제공되는 정보는 참고용입니다.
              </p>
              <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-500">
                <li>
                  · 본 서비스의 정보를 근거로 한 판단과 그 결과에 대해 운영팀은 법적
                  책임을 지지 않습니다.
                </li>
                <li>
                  · 기상·대기질에 관한 공식 정보는 기상청(weather.go.kr)과
                  에어코리아(airkorea.or.kr)의 발표를 따라 주세요.
                </li>
                <li>
                  · 공공데이터는 공공데이터포털 이용약관에 따라 활용하며, 원 저작권은 각
                  제공기관에 있습니다.
                </li>
                <li>
                  · 서비스는 예고 없이 변경되거나 중단될 수 있습니다.
                </li>
              </ul>
            </Section>

            {/* 개인정보 */}
            <Section id="privacy" title="개인정보처리방침">
              <p>
                숨쉬는길은 <strong className="font-semibold">개인정보를 서버에 저장하지
                않습니다.</strong>
              </p>
              <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-500">
                <li>
                  · 회원가입 없이 모든 기능을 쓸 수 있습니다. 로그인 화면은 시연용이며
                  실제 인증 서버에 연결되어 있지 않습니다.
                </li>
                <li>
                  · 관심 지역·자주 쓰는 경로 등 마이페이지 설정은 이용자 브라우저에만
                  저장되며 서버로 전송되지 않습니다.
                </li>
                <li>
                  · 위치 정보를 사용하는 경우 브라우저에서 권한을 물어보며, 받은 좌표는
                  경로 계산에만 쓰이고 저장하지 않습니다.
                </li>
                <li>
                  · 문의: <a
                    href={`mailto:${FOOTER.team.contact}`}
                    className="underline underline-offset-2 hover:text-brand-600"
                  >
                    {FOOTER.team.contact}
                  </a>
                </li>
              </ul>
            </Section>
          </div>
        </div>
      </Container>
    </>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line pt-8 pb-2 first:border-t-0 first:pt-0">
      <h2 className="text-[19px] font-bold tracking-tight text-ink-900">{title}</h2>
      <div className="mt-3 text-[14px] leading-relaxed text-ink-700 [&>p]:text-[14px] [&>p]:leading-relaxed">
        {children}
      </div>
    </section>
  );
}
