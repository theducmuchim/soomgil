import type { RiskSnapshot } from '@/types';
import { Container } from '@/components/layout/Container';
import { MAX_STAGNATION_BOOST } from '@/lib/risk/score';
import { formatDelta } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

interface Item {
  /** 왼쪽에 크게 박히는 수치 */
  stat: string;
  /** 수치가 무엇인지 */
  statLabel: string;
  body: string;
}

const PROBLEMS: Item[] = [
  {
    stat: '3만 명',
    statLabel: '봄철 알레르기성 비염 환자',
    body: '대전 지역 알레르기성 비염 환자는 겨울철 2만 명대에서 봄철 3만 명 수준까지 늘어납니다. 작년 1~8월 누적으로는 약 19만 명입니다.',
  },
  {
    stat: '35도',
    statLabel: '폭염경보 발효 시 체감온도',
    body: '최근 대전에 폭염경보가 발효되며 체감온도 35도, 낮 최고기온 37도까지 오른 사례가 있었습니다.',
  },
  {
    stat: '주의',
    statLabel: '황사 위기경보 단계',
    body: '대전시가 황사 유입으로 공기질이 악화돼 황사 위기경보 ‘주의’ 단계를 발령한 사례가 있었습니다.',
  },
  {
    stat: '없음',
    statLabel: '실시간 경로 안내',
    body: '기존 서비스(기상청 날씨누리, Windy 등)는 “오늘 위험도”만 지역 단위로 알려줄 뿐, 지금 어느 길로 가야 하는지는 안내하지 않습니다.',
  },
];

/**
 * "지금 대전은" ↔ "숨쉬는길은 다르게 합니다" 대비 섹션.
 *
 * 오른쪽 세 번째 항목의 수치는 하드코딩하지 않고 위험도 엔진에서 직접 꺼낸다.
 * 보정 상한(MAX_STAGNATION_BOOST)과 지금 실제 보정값을 함께 보여줘서,
 * 서술이 아니라 계산 결과로 차별점을 말한다.
 */
export function ProblemSolutionSection({ snapshot }: { snapshot: RiskSnapshot }) {
  const maxBoostPct = Math.round(MAX_STAGNATION_BOOST * 100);
  const currentDelta = snapshot.cityAverage.stagnationDeltaPct;

  const solutions: Item[] = [
    {
      stat: '풍향·풍속',
      statLabel: '경로 단위까지 안내',
      body: '실시간 풍향·풍속 데이터를 더해 “지금 이 순간 어느 경로가 상대적으로 안전한지”까지 안내합니다.',
    },
    {
      stat: '사계절',
      statLabel: '핵심 지표 자동 전환',
      body: '계절이 바뀌면 핵심 위험 지표가 자동으로 전환됩니다. 봄 꽃가루 → 여름 폭염·오존 → 가을 잡초 꽃가루 → 겨울 미세먼지·한파로, 사계절 내내 쓸 수 있습니다.',
    },
    {
      stat: `최대 ${maxBoostPct}%`,
      statLabel: '분지 대기정체 보정',
      body: `대전은 산으로 둘러싸인 분지라 같은 배출량에도 공기가 빠져나가지 못합니다. 대기정체만으로 위험도가 최대 ${maxBoostPct}%까지 오르는데, 숨쉬는길은 이 상승분을 따로 분리해 실시간으로 계산합니다. 지금 대전은 ${formatDelta(currentDelta, 1)}입니다.`,
    },
    {
      stat: '공공데이터',
      statLabel: '자체 관측 없이',
      body: '기상청과 에어코리아가 공개한 공공데이터만 사용합니다. 자체 관측 장비 없이도 출처가 분명한 정보를 제공합니다.',
    },
  ];

  return (
    <section className="border-b border-line py-14 sm:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="text-[12.5px] font-semibold tracking-wide text-brand-600">
            숨쉬는길이 푸는 문제
          </p>
          <h2 className="mt-2 text-[26px] leading-tight font-bold tracking-tight text-ink-900 sm:text-[32px]">
            위험도는 알려주는데,
            <br className="sm:hidden" /> 어디로 가라는 말은 없습니다
          </h2>
        </div>

        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-2 lg:gap-10">
          <Column
            eyebrow="지금 대전은"
            tone="problem"
            items={PROBLEMS}
            note="출처: 건강보험심사평가원 진료 통계, 기상청 특보 발표, 대전시 황사 위기경보 발령 사례"
          />
          <Column
            eyebrow="숨쉬는길은 다르게 합니다"
            tone="solution"
            items={solutions}
            note={`대기정체 보정값은 기준 시각의 대기정체지수로 매번 다시 계산됩니다. 보정 전 ${snapshot.cityAverage.baseScore}점 → 보정 후 ${snapshot.cityAverage.score}점.`}
          />
        </div>
      </Container>
    </section>
  );
}

function Column({
  eyebrow,
  tone,
  items,
  note,
}: {
  eyebrow: string;
  tone: 'problem' | 'solution';
  items: Item[];
  note: string;
}) {
  const isSolution = tone === 'solution';

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 sm:p-7',
        isSolution ? 'border-brand-200 bg-brand-50/50' : 'border-line bg-surface-sunken',
      )}
    >
      <h3
        className={cn(
          'text-[15px] font-bold',
          isSolution ? 'text-brand-700' : 'text-ink-700',
        )}
      >
        {eyebrow}
      </h3>

      <ul className="mt-5 space-y-5">
        {items.map((item) => (
          <li
            key={item.stat + item.statLabel}
            className={cn(
              'border-t pt-5 first:border-t-0 first:pt-0',
              isSolution ? 'border-brand-200/70' : 'border-line',
            )}
          >
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span
                className={cn(
                  'tabular text-[22px] leading-none font-bold tracking-tight sm:text-[26px]',
                  isSolution ? 'text-brand-600' : 'text-ink-900',
                )}
              >
                {item.stat}
              </span>
              <span className="text-[13px] font-medium text-ink-500">
                {item.statLabel}
              </span>
            </div>
            <p className="mt-2.5 text-[14px] leading-relaxed text-ink-700">{item.body}</p>
          </li>
        ))}
      </ul>

      <p
        className={cn(
          'mt-6 border-t pt-4 text-[11.5px] leading-relaxed',
          isSolution ? 'border-brand-200/70 text-brand-700/70' : 'border-line text-ink-400',
        )}
      >
        {note}
      </p>
    </div>
  );
}
