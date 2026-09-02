import { useEffect, useState } from "react";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import StatCard from "../../components/cards/StatCard";
import Loading from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { Landmark, TrendingUp, AlertOctagon, Wallet } from "lucide-react";
import { getLoanAnalytics } from "../../services/api";

export default function LoanAnalytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    setData(null);
    try {
      setData(await getLoanAnalytics());
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <AnimatedPage>
        <PageHeader eyebrow="Admin Control Center" title="Loan Portfolio" />
        <ErrorState onRetry={load} />
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow="Admin Control Center"
        title="Loan Portfolio"
        description="Portfolio value, default rate, and breakdown by loan type."
      />

      {!data ? (
        <Loading label="Loading loan portfolio" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Landmark} label="Total Loans" value={data.total_loans} tone="primary" />
            <StatCard icon={Wallet} label="Portfolio Value" value={data.portfolio_value} tone="accent" format={(v) => `₹${v.toLocaleString()}`} />
            <StatCard icon={TrendingUp} label="Avg Loan Amount" value={data.avg_loan_amount} tone="success" format={(v) => `₹${v.toLocaleString()}`} />
            <StatCard icon={AlertOctagon} label="Default Rate" value={data.overall_default_rate} tone="danger" format={(v) => `${v}%`} />
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-display font-semibold text-sm">Breakdown by Loan Type</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted uppercase tracking-wide text-left">
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Count</th>
                  <th className="px-6 py-3 font-medium">Avg Amount</th>
                  <th className="px-6 py-3 font-medium">Avg Tenure</th>
                  <th className="px-6 py-3 font-medium">Default Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.type_breakdown.map((t) => (
                  <tr key={t.loan_type} className="border-t border-border hover:bg-white/[0.02]">
                    <td className="px-6 py-3 font-medium">{t.loan_type}</td>
                    <td className="px-6 py-3 text-muted">{t.count}</td>
                    <td className="px-6 py-3 text-muted">₹{t.avg_amount.toLocaleString()}</td>
                    <td className="px-6 py-3 text-muted">{t.avg_tenure_months} mo</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        t.default_rate > 15 ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                      }`}>
                        {t.default_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AnimatedPage>
  );
}
