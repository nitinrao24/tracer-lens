interface Props {
  label: string;
  value: string;
  note?: string;
  tone?: "good" | "bad";
}

export default function StatCard({ label, value, note, tone }: Props) {
  return (
    <div className="card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {note ? <p className={`stat-note${tone ? ` ${tone}` : ""}`}>{note}</p> : null}
    </div>
  );
}
