import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Users, CreditCard, Landmark, Wallet } from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import StatCard from "../../components/cards/StatCard";
import Loading, { CardSkeleton } from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { getStatistics, getMarketingSegments, getLoanAnalytics } from "../../services/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [segments, setSegments] = useState(null);
  const [loans, setLoans] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    setStats(null);
    try {
      const [s, m, l] = await Promise.all([
        getStatistics(),
        getMarketingSegments(),
        getLoanAnalytics(),
      ]);
      setStats(s);
      setSegments(m);
      setLoans(l);
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
        <PageHeader eyebrow="Admin Control Center" title="Bank Overview" />
        <ErrorState onRetry={load} />
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow="Admin Control Center"
        title="Bank Overview"
        description="Portfolio-wide statistics across customers, accounts, and loans."
      />

      {!stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Users} label="Total Customers" value={stats.total_customers ?? 0} tone="primary" />
          <StatCard icon={CreditCard} label="Active Accounts" value={stats.active_accounts ?? 0} tone="accent" />
          <StatCard icon={Landmark} label="Loan Applications" value={stats.loan_applications ?? 0} tone="success" />
          <StatCard
            icon={Wallet}
            label="Total Deposits"
            value={stats.total_deposits ?? 0}
            tone="warning"
            format={(v) => `₹${v.toLocaleString()}`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-sm mb-4">Loan Portfolio by Type</h3>
          {!loans ? (
            <Loading label="Loading" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loans.type_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="loan_type" tick={{ fill: "#8B95A7", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8B95A7", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#151D2E", border: "1px solid #1F2937", borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-sm mb-4">Risk Distribution</h3>
          {!loans ? (
            <Loading label="Loading" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loans.risk_distribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#8B95A7", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="band" type="category" width={110} tick={{ fill: "#8B95A7", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#151D2E", border: "1px solid #1F2937", borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#EF4444" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-display font-semibold text-sm mb-4">Marketing Intelligence</h3>
        {!segments ? (
          <Loading label="Loading" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              ["High Value Customers", segments.high_value_customers],
              ["Credit Card Prospects", segments.credit_card_prospects],
              ["Loan Prospects", segments.loan_prospects],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-white/[0.02] p-4 text-center">
                <p className="font-display text-2xl font-semibold text-accent">{value?.toLocaleString()}</p>
                <p className="text-xs text-muted mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
