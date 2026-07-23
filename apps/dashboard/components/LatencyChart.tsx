"use client";

import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

export interface LatencyRow { model: string; p50: number; p95: number; p99: number; calls: number; }

const shorten = (m: string) => m.replace(/-\d{8}$/, "").replace(/-\d{4}-\d{2}-\d{2}$/, "");

export default function LatencyChart({ data }: { data: LatencyRow[] }) {
  const rows = data.map((d) => ({ ...d, label: shorten(d.model) }));
  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#243044" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8a9bb4", fontSize: 10 }}
            axisLine={{ stroke: "#243044" }}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fill: "#8a9bb4", fontSize: 11 }}
            tickFormatter={(v: number) => `${Math.round(v)}ms`}
            axisLine={false}
            tickLine={false}
            width={62}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#131a26", border: "1px solid #243044",
              borderRadius: 8, fontSize: 12, color: "#e6edf7"
            }}
            formatter={(v: number, n: string) => [`${Math.round(v)} ms`, n.toUpperCase()]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#8a9bb4" }} />
          <Bar dataKey="p50" fill="#334867" radius={[3, 3, 0, 0]} />
          <Bar dataKey="p95" fill="#5eead4" radius={[3, 3, 0, 0]} />
          <Bar dataKey="p99" fill="#818cf8" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
