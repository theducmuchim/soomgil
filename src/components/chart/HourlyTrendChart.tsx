'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HourlyPoint } from '@/lib/api/trend';
import { RISK_LEVELS } from '@/config/indicators';
import { ChartTooltip } from './ChartTooltip';

/**
 * 차트 가장자리에 붙은 점의 라벨 위치.
 * 0~3시나 20~23시에 정점이 오면 기본 위치로는 라벨이 그려지다 잘린다.
 */
function edgeLabelPosition(hour: number, base: 'top' | 'bottom') {
  if (hour <= 2) return base === 'top' ? 'insideTopLeft' : 'insideBottomLeft';
  if (hour >= 21) return base === 'top' ? 'insideTopRight' : 'insideBottomRight';
  return base;
}

/**
 * 오늘 24시간 위험도 추이.
 *
 * 시계열 한 줄이라 범례는 두지 않는다(제목이 곧 계열 이름이다).
 * 대신 등급 경계(25/50/75)를 옅은 기준선으로 깔아, 선의 높이가
 * 어느 등급 구간에 있는지 바로 읽히게 한다.
 *
 * 점 라벨은 "지금"과 "가장 안전한 시각" 두 곳에만 붙인다.
 * 24개 점에 전부 숫자를 붙이면 선을 볼 수 없다.
 */
export function HourlyTrendChart({
  trend,
  safestHour,
}: {
  trend: HourlyPoint[];
  safestHour: number;
}) {
  const now = trend.find((p) => p.isNow);
  const safest = trend.find((p) => p.hour === safestHour);

  const min = Math.min(...trend.map((p) => p.score));
  const max = Math.max(...trend.map((p) => p.score));
  const pad = Math.max(6, (max - min) * 0.35);

  // 축 눈금이 9, 34, 59처럼 나오면 읽기 어렵다. 10 단위로 맞춘다.
  const domain: [number, number] = [
    Math.max(0, Math.floor((min - pad) / 10) * 10),
    Math.min(100, Math.ceil((max + pad) / 10) * 10),
  ];
  const ticks: number[] = [];
  for (let v = domain[0]; v <= domain[1]; v += 10) ticks.push(v);

  return (
    <div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 20, right: 16, bottom: 18, left: -18 }}>
            <CartesianGrid stroke="var(--color-line)" strokeDasharray="2 4" vertical={false} />

            {/* 등급 경계 — 선보다 뒤로 물러나 있어야 한다 */}
            {([25, 50, 75] as const).map((y) => {
              const label =
                y === 25 ? '보통' : y === 50 ? '높음' : '매우높음';
              if (y < domain[0] || y > domain[1]) return null;
              return (
                <ReferenceLine
                  key={y}
                  y={y}
                  stroke="var(--color-line-strong)"
                  strokeDasharray="3 4"
                  label={{
                    value: label,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: 'var(--color-ink-300)',
                  }}
                />
              );
            })}

            <XAxis
              dataKey="hour"
              axisLine={false}
              tickLine={false}
              interval={2}
              tick={{ fill: 'var(--color-ink-400)', fontSize: 11 }}
              tickFormatter={(h: number) => `${h}시`}
            />
            <YAxis
              domain={domain}
              ticks={ticks}
              axisLine={false}
              tickLine={false}
              width={44}
              tick={{ fill: 'var(--color-ink-400)', fontSize: 11 }}
            />

            <Tooltip
              cursor={{ stroke: 'var(--color-line-strong)', strokeWidth: 1 }}
              content={<ChartTooltip kind="hourly" />}
            />

            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--color-brand-600)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
              isAnimationActive={false}
            />

            {safest && (
              <ReferenceDot
                x={safest.hour}
                y={safest.score}
                r={5}
                fill={RISK_LEVELS.low.color}
                stroke="var(--color-surface)"
                strokeWidth={2}
                label={{
                  value: `가장 안전 ${safest.hour}시`,
                  // 화면 끝에 붙은 점은 라벨이 잘리므로 안쪽을 보게 한다
                  position: edgeLabelPosition(safest.hour, 'bottom'),
                  fontSize: 11,
                  fontWeight: 600,
                  fill: RISK_LEVELS.low.color,
                }}
              />
            )}

            {now && (
              <ReferenceDot
                x={now.hour}
                y={now.score}
                r={5}
                fill="var(--color-brand-600)"
                stroke="var(--color-surface)"
                strokeWidth={2}
                label={{
                  value: `지금 ${Math.round(now.score)}`,
                  position: edgeLabelPosition(now.hour, 'top'),
                  fontSize: 11,
                  fontWeight: 700,
                  fill: 'var(--color-brand-700)',
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-3 border-t border-line pt-3">
        <summary className="cursor-pointer text-[12px] font-medium text-ink-500 hover:text-ink-900">
          표로 보기
        </summary>
        <div className="mt-2.5 overflow-x-auto">
          <table className="w-full min-w-[420px] text-[12px]">
            <thead>
              <tr className="border-b border-line text-left text-ink-400">
                <th className="py-1.5 pr-2 font-medium">시각</th>
                {trend
                  .filter((p) => p.hour % 3 === 0)
                  .map((p) => (
                    <th key={p.hour} className="py-1.5 pr-2 font-medium">
                      {p.hour}시
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="tabular">
              <tr>
                <td className="py-1.5 pr-2 font-medium text-ink-900">위험도</td>
                {trend
                  .filter((p) => p.hour % 3 === 0)
                  .map((p) => (
                    <td key={p.hour} className="py-1.5 pr-2 text-ink-700">
                      {Math.round(p.score)}
                    </td>
                  ))}
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
