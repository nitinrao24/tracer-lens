"use client";

import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

export interface TrendPoint { day: string; costUsd: number; calls: number; }

export default function CostTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5eead4" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#5eead4" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#243044" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "#8a9bb4", fontSize: 11 }}
            tickFormatter={(d: string) => d.slice(5)}
            axisLine={{ stroke: "#243044" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#8a9bb4", fontSize: 11 }}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            contentStyle={{
              background: "#131a26", border: "1px solid #243044",
              borderRadius: 8, fontSize: 12, color: "#e6edf7"
            }}
            labelStyle={{ color: "#8a9bb4" }}
            formatter={(v: number, name: string) =>
              name === "costUsd" ? [`$${v.toFixed(4)}`, "Cost"] : [v, "Calls"]
            }
          />
          <Area
            type="monotone" dataKey="costUsd" stroke="#5eead4"
            strokeWidth={2} fill="url(#costFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
