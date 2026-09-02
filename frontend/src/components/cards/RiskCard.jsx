const riskStyles = {
  low: { text: "text-success", bg: "bg-success/10", ring: "ring-success/30" },
  medium: { text: "text-warning", bg: "bg-warning/10", ring: "ring-warning/30" },
  high: { text: "text-danger", bg: "bg-danger/10", ring: "ring-danger/30" },
};

export default function RiskCard({ level = "medium", approvalProbability, defaultProbability }) {
  const key = level.toLowerCase().includes("low")
    ? "low"
    : level.toLowerCase().includes("high")
    ? "high"
    : "medium";
  const style = riskStyles[key];

  return (
    <div className={`glass rounded-2xl p-6 text-center ring-1 ${style.ring}`}>
      <p className="text-xs uppercase tracking-wider text-muted mb-3">AI Analysis Complete</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-3xl font-display font-semibold text-success">
            {approvalProbability?.toFixed(2)}%
          </p>
          <p className="text-xs text-muted mt-1">Approval Probability</p>
        </div>
        <div>
          <p className="text-3xl font-display font-semibold text-danger">
            {defaultProbability?.toFixed(2)}%
          </p>
          <p className="text-xs text-muted mt-1">Default Probability</p>
        </div>
      </div>

      <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${style.bg} ${style.text}`}>
        {level}
      </span>
    </div>
  );
}
