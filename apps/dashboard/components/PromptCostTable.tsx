import { compactUsd, compactNum } from "../lib/format";

export interface PromptRow {
  prompt_name: string;
  cost_usd: number;
  calls: number;
  avg_cost_usd: number;
  tokens: number;
}

export default function PromptCostTable({ rows }: { rows: PromptRow[] }) {
  const total = rows.reduce((a, r) => a + r.cost_usd, 0);
  return (
    <table>
      <thead>
        <tr>
          <th>Prompt</th>
          <th className="num">Calls</th>
          <th className="num">Tokens</th>
          <th className="num">Avg / call</th>
          <th className="num">Total cost</th>
          <th className="num">Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.prompt_name}>
            <td className="mono">{r.prompt_name}</td>
            <td className="num">{r.calls.toLocaleString("en-US")}</td>
            <td className="num">{compactNum(r.tokens)}</td>
            <td className="num">${r.avg_cost_usd.toFixed(5)}</td>
            <td className="num">{compactUsd(r.cost_usd)}</td>
            <td className="num">{total > 0 ? `${((r.cost_usd / total) * 100).toFixed(1)}%` : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
