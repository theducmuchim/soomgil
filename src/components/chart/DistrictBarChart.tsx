'use client';

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AreaRisk } from '@/types';
import { INDICATORS, RISK_LEVELS } from '@/config/indicators';
import { scoreColor } from '@/lib/risk/color';
import { formatDelta } from '@/lib/utils/format';
import { ChartTooltip } from './ChartTooltip';

/**
 * 자치구별 위험도 비교.
 *
 * 값의 크기를 비교하는 게 목적이라 막대를 쓴다. 항목이 5개뿐이고 이름이 한글이라
 * 가로 막대가 라벨 읽기에 유리하다.
 *
 * 색은 값에서 계산한다(순서형 램프). 색만으로 등급을 구분하지 않도록
 * 막대 끝에 점수를 직접 붙이고, 툴팁에 등급 이름을 함께 넣는다.
 */
export function DistrictBarChart({ districts }: { districts: AreaRisk[] }) {
  const data = [...districts]
    .sort((a, b) => a.score - b.score) // 가로 막대는 아래에서 위로 그려진다
    .map((d) => ({
      name: d.areaName,
      score: d.score,
      baseScore: d.breakdown.baseScore,
      deltaPct: d.breakdown.stagnationDeltaPct,
      level: RISK_LEVELS[d.level].label,
      dominant: INDICATORS[d.dominantIndicator].shortLabel,
    }));

  return (
    <div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
            barCategoryGap="28%"
          >
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              width={54}
              tick={{ fill: 'var(--color-ink-500)', fontSize: 12.5, fontWeight: 500 }}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-surface-sunken)' }}
              content={<ChartTooltip kind="district" />}
            />
            <Bar
              dataKey="score"
              radius={[4, 4, 4, 4]}
              background={{ fill: 'var(--color-line)', radius: 4 }}
              label={{
                position: 'right',
                fontSize: 12.5,
                fontWeight: 700,
                fill: 'var(--color-ink-700)',
                formatter: (v: unknown) => String(Math.round(Number(v))),
              }}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={scoreColor(d.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 표 — 그래프를 못 읽는 환경에서도 같은 값에 닿게 한다 */}
      <details className="mt-3 border-t border-line pt-3">
        <summary className="cursor-pointer text-[12px] font-medium text-ink-500 hover:text-ink-900">
          표로 보기
        </summary>
        <div className="mt-2.5 overflow-x-auto">
          <table className="w-full min-w-[380px] text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-ink-400">
                <th className="py-1.5 pr-3 font-medium">자치구</th>
                <th className="py-1.5 pr-3 font-medium">보정 전</th>
                <th className="py-1.5 pr-3 font-medium">대기정체</th>
                <th className="py-1.5 pr-3 font-medium">최종</th>
                <th className="py-1.5 font-medium">등급</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {[...data].reverse().map((d) => (
                <tr key={d.name} className="border-b border-line/60">
                  <td className="py-1.5 pr-3 font-medium text-ink-900">{d.name}</td>
                  <td className="py-1.5 pr-3 text-ink-500">{d.baseScore}</td>
                  <td className="py-1.5 pr-3 text-ink-500">
                    {formatDelta(d.deltaPct, 1)}
                  </td>
                  <td className="py-1.5 pr-3 font-bold text-ink-900">
                    {Math.round(d.score)}
                  </td>
                  <td className="py-1.5 text-ink-500">{d.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
