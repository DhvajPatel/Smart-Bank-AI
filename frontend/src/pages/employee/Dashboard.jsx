import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Users, CreditCard, Landmark, AlertTriangle, Search, ChevronRight } from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import StatCard from "../../components/cards/StatCard";
import { CardSkeleton } from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { getStatistics, listCustomers, getMarketingSegments } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const RISK_COLORS = { Low: "#10B981", Medium: "#06B6D4", Elevated: "#F59E0B", High: "#EF4444" };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-xl border border-border">
      {label && <p className="text-muted mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill ?? p.color }}>
          {p.name}: {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const riskBand = (score) =>
  score >= 750 ? "Low" : score >= 650 ? "Medium" : score >= 550 ? "Elevated" : "High";

export default function EmployeeDashboard() {
  const [stats, setStats]       = useState(null);
  const [segments, setSegments] = useState(null);
  const [preview, setPreview]   = useState([]);
  const [riskDist, setRiskDist] = useState([]);
  const [error, setError]       = useState(null);
  const [query, setQuery]       = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = user?.role === "admin" ? "/admin" : "/employee";

  const load = async () => {
    setError(null);
    try {
      const [s, c, seg] = await Promise.all([
        getStatistics(),
        listCustomers({ limit: 6 }),
        getMarketingSegments().catch(() => null),
      ]);
      setStats(s);
      setSegments(seg);

      const items = c.items ?? [];
      setPreview(items);

      // Build risk distribution from the preview sample
      const dist = { Low: 0, Medium: 0, Elevated: 0, High: 0 };
      items.forEach((c) => { dist[riskBand(c.credit_score)] += 1; });
      setRiskDist(Object.entries(dist).map(([name, value]) => ({ name, value })));
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => { load(); }, []);

  const goToCustomer = (id) => { if (id) navigate(`${base}/customers/${id.trim()}`); };

  if (error) {
    return (
      <AnimatedPage>
        <PageHeader eyebrow="Employee Workspace" title="Dashboard" />
        <ErrorState onRetry={load} />
      </AnimatedPage>
    );
  }

  // segment bar data
  const segmentData = segments
    ? [
        { name: "High Value", count: segments.high_value_customers },
        { name: "Card Prospects", count: segments.credit_card_prospects },
        { name: "Loan Prospects", count: segments.loan_prospects },
      ]
    : [];

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow="Employee Workspace"
        title="Good morning"
        description="Your customer portfolio at a glance."
      />

      {/* Quick search */}
      <form
        onSubmit={(e) => { e.preventDefault(); goToCustomer(query.trim()); }}
        className="mb-5"
      >
        <div className="glass rounded-2xl p-3.5 flex items-center gap-3">
          <Search className="h-4 w-4 text-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter Customer ID (e.g. C100042)"
            className="bg-transparent outline-none text-sm w-full placeholder:text-muted/60"
          />
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-xs font-medium shrink-0 hover:bg-primary/80 active:scale-95 transition-all">
            Open 360°
          </button>
        </div>
      </form>

      {/* KPI cards */}
      {!stats ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Users}         label="Total Customers"  value={stats.total_customers ?? 0}    tone="primary" />
          <StatCard icon={CreditCard}    label="Active Accounts"  value={stats.active_accounts ?? 0}    tone="accent" />
          <StatCard icon={Landmark}      label="Loan Applications" value={stats.loan_applications ?? 0} tone="success" />
          <StatCard icon={AlertTriangle} label="High Risk Loans"  value={stats.high_risk_loans ?? 0}    tone="danger" />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Risk Distribution pie */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm mb-1">Risk Distribution</h3>
          <p className="text-xs text-muted mb-4">Based on credit scores</p>
          {riskDist.length ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={riskDist} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" strokeWidth={0}>
                    {riskDist.map((d) => (
                      <Cell key={d.name} fill={RISK_COLORS[d.name]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {riskDist.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: RISK_COLORS[d.name] }} />
                    <span className="text-muted">{d.name}</span>
                    <span className="font-medium ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="h-40 flex items-center justify-center text-muted text-xs">Loading…</div>}
        </div>

        {/* Marketing Segments bar */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm mb-1">Marketing Segments</h3>
          <p className="text-xs text-muted mb-4">Customer opportunity groups</p>
          {segmentData.length ? (
            <ResponsiveContainer width="100%" height={188}>
              <BarChart data={segmentData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#8B95A7", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8B95A7", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Customers" radius={[6, 6, 0, 0]}>
                  {segmentData.map((_, i) => (
                    <Cell key={i} fill={["#2563EB", "#06B6D4", "#10B981"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted text-xs">No data</div>
          )}
        </div>
      </div>

      {/* Recent customers table */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-sm">Recent Customers</h3>
          <button
            onClick={() => navigate(`${base}/customers`)}
            className="text-xs text-primary hover:text-accent transition-colors flex items-center gap-1"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          {preview.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">Loading customers…</div>
          ) : (
            preview.map((c, i) => (
              <motion.button
                key={c.customer_id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => goToCustomer(c.customer_id)}
                className="w-full flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] px-4 py-3 hover:border-primary/30 hover:bg-white/[0.05] active:scale-[0.99] transition-all text-left"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold shrink-0">
                  {c.name?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted">{c.customer_id} · {c.city}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted hidden sm:block">Score: {c.credit_score}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: `${RISK_COLORS[c.risk_band]}20`,
                      color: RISK_COLORS[c.risk_band],
                    }}
                  >
                    {c.risk_band}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </div>
              </motion.button>
            ))
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
