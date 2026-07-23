import type { OptimizationReport } from "@tracerlens/sdk";
import { compactUsd, pct } from "../lib/format";

export default function OptimizerPanel({ report }: { report: OptimizationReport }) {
  return (
    <div className="grid grid-2 section">
      <div className="banner">
        <p className="stat-label">Projected inference cost reduction</p>
        <p className="headline">{pct(report.savingsPct)}</p>
        <p className="stat-note">
          {compactUsd(report.currentCostUsd)} → {compactUsd(report.projectedCostUsd)} over the
          window, saving {compactUsd(report.savingsUsd)}.
        </p>
        <p className="stat-note" style={{ marginTop: 12 }}>
          Model: route {pct(report.eligibleFraction, 0)} of traffic to the cheapest same-family
          model that clears your eval bar; the remainder stays on the current model. Savings are
          priced from observed token counts, not estimates.
        </p>
      </div>

      <div className="card">
        <h2>Routing recommendations</h2>
        <p className="sub">Ranked by absolute savings</p>
        {report.recommendations.length === 0 ? (
          <p className="stat-note">No cheaper same-family fallback found for current traffic.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Downgrade path</th>
                <th className="num">Calls moved</th>
                <th className="num">Saves</th>
              </tr>
            </thead>
            <tbody>
              {report.recommendations.map((r) => (
                <tr key={r.model}>
                  <td className="mono">
                    {r.model.replace(/-\d{8}$/, "").replace(/-\d{4}-\d{2}-\d{2}$/, "")}
                    {" → "}
                    {r.targetModel}
                  </td>
                  <td className="num">{r.eligibleCalls.toLocaleString("en-US")}</td>
                  <td className="num">
                    <span className="pill save">
                      {compactUsd(r.savingsUsd)} · {pct(r.savingsPct, 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
