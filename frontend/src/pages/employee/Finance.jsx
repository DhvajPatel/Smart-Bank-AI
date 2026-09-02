import { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import Loading from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { getFinancialHealth } from "../../services/api";

const ratingColor = {
  Excellent: "text-success stroke-success",
  Good: "text-success stroke-success",
  Fair: "text-warning stroke-warning",
  "Needs Attention": "text-danger stroke-danger",
};

function RadialScore({ score, rating }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const cls = ratingColor[rating] ?? "text-primary stroke-primary";

  return (
    <div className="relative h-36 w-36 mx-auto">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" className="text-white/5" strokeWidth="10" />
        <motion.circle
          cx="64" cy="64" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          className={cls}
          stroke="currentColor"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-semibold">{score}</span>
        <span className="text-[10px] text-muted uppercase tracking-wide">{rating}</span>
      </div>
    </div>
  );
}

export default function Finance() {
  const [id, setId] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getFinancialHealth(id.trim());
      setData(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow="Employee Workspace"
        title="Financial Health"
        description="Income, spending, savings and debt-to-income for any customer."
      />

      <form onSubmit={search} className="glass rounded-2xl p-4 flex items-center gap-3 mb-6">
        <Search className="h-4 w-4 text-muted shrink-0" />
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Customer ID, e.g. C100000"
          className="bg-transparent outline-none text-sm w-full placeholder:text-muted/60"
        />
        <button className="rounded-lg bg-primary px-4 py-2 text-xs font-medium shrink-0">Analyze</button>
      </form>

      {loading && <Loading label="Calculating financial health" />}
      {error && <ErrorState title={`Couldn't find ${id}`} onRetry={search} />}

      {data && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center">
            <RadialScore score={data.financial_health_score} rating={data.rating} />
            <p className="text-xs text-muted mt-4">Financial Health Score</p>
          </div>

          <div className="lg:col-span-2 glass rounded-2xl p-6 grid grid-cols-2 gap-5">
            {[
              ["Income", `₹${data.monthly_income?.toLocaleString()}`],
              ["Spending", `₹${data.monthly_spending?.toLocaleString()}`],
              ["Savings", `₹${data.savings?.toLocaleString()}`],
              ["Savings Ratio", `${(data.savings_ratio * 100).toFixed(1)}%`],
              ["Debt-to-Income", `${(data.debt_to_income * 100).toFixed(1)}%`],
              ["Customer", data.customer_id],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted mb-1">{label}</p>
                <p className="font-display text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted">
          Search a customer ID above to see their financial health breakdown.
        </div>
      )}
    </AnimatedPage>
  );
}
