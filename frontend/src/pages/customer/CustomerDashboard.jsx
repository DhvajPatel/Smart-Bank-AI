import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  RadialBarChart, RadialBar, PieChart, Pie, Cell, Tooltip,
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Wallet, TrendingUp, CreditCard, ShieldCheck,
  ArrowUpRight, ArrowDownRight, Sparkles, Landmark,
} from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import Loading from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import RecommendationCard from "../../components/cards/RecommendationCard";
import { useAuth } from "../../context/AuthContext";
import { getCustomer360, getSpendingTrend } from "../../services/api";

const COLORS = ["#2563EB", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

const ratingColor = { Excellent: "#10B981", Good: "#06B6D4", Fair: "#F59E0B", "Needs Attention": "#EF4444" };

function HealthGauge({ score, rating }) {
  const data = [{ value: score }, { value: 100 - score }];
  const color = ratingColor[rating] ?? "#2563EB";
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <PieChart width={140} height={80}>
          <Pie
            data={data}
            cx={65} cy={75}
            startAngle={180} endAngle={0}
            innerRadius={44} outerRadius={62}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={color} />
            <Cell fill="rgba(255,255,255,0.05)" />
          </Pie>
        </PieChart>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-1">
          <span className="font-display text-xl font-semibold" style={{ color }}>{score}</span>
          <span className="text-[10px] text-muted">/100</span>
        </div>
      </div>
      <span className="text-xs font-medium mt-1" style={{ color }}>{rating}</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-xl border border-border">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>₹{p.value?.toLocaleString()}</p>
      ))}
    </div>
  );
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const customerId = user?.customer_id;
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const [d, t] = await Promise.all([
        getCustomer360(customerId),
        getSpendingTrend(customerId, 6),
      ]);
      setData(d);
      setTrend(t.trend ?? []);
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => { load(); }, [customerId]);

  if (error) return <AnimatedPage><ErrorState error={error} onRetry={load} /></AnimatedPage>;
  if (!data) return <AnimatedPage><Loading label="Loading your dashboard…" /></AnimatedPage>;

  const { customer, financial_health: h, spending, recommendations } = data;
  const savingsPct = Math.round((h.savings / Math.max(h.monthly_income, 1)) * 100);
  const spendPct   = Math.round((h.monthly_spending / Math.max(h.monthly_income, 1)) * 100);

  const topCategories = spending?.breakdown?.slice(0, 5) ?? [];
  const pieData = topCategories.map((b) => ({ name: b.category, value: b.amount }));

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <AnimatedPage>
      {/* header */}
      <div className="mb-6">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">My Dashboard</p>
        <h1 className="font-display text-2xl font-semibold">{greeting}, {customer.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted mt-1">{customer.customer_id} · {user?.city}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { icon: Wallet, label: "Monthly Income", value: `₹${h.monthly_income?.toLocaleString()}`, tone: "primary", sub: "This month" },
          { icon: TrendingUp, label: "Monthly Spend", value: `₹${h.monthly_spending?.toLocaleString()}`, tone: spendPct > 80 ? "danger" : "warning", sub: `${spendPct}% of income` },
          { icon: ShieldCheck, label: "Credit Score", value: customer.credit_score, tone: customer.credit_score >= 700 ? "success" : customer.credit_score >= 600 ? "warning" : "danger", sub: customer.credit_score >= 750 ? "Excellent" : customer.credit_score >= 650 ? "Good" : "Needs Work" },
          { icon: CreditCard, label: "Savings", value: `₹${h.savings?.toLocaleString()}`, tone: "success", sub: `${savingsPct}% saved` },
        ].map(({ icon: Icon, label, value, tone, sub }, i) => {
          const colors = {
            primary: { bg: "bg-primary/15", text: "text-primary", glow: "from-primary/20" },
            accent:  { bg: "bg-accent/15",  text: "text-accent",  glow: "from-accent/20" },
            success: { bg: "bg-success/15", text: "text-success", glow: "from-success/20" },
            warning: { bg: "bg-warning/15", text: "text-warning", glow: "from-warning/20" },
            danger:  { bg: "bg-danger/15",  text: "text-danger",  glow: "from-danger/20" },
          }[tone];
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass rounded-2xl p-4 relative overflow-hidden"
            >
              <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full blur-2xl opacity-30 bg-gradient-radial ${colors.glow}`} />
              <div className={`h-8 w-8 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center mb-3`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="font-display text-lg font-semibold">{value}</p>
              <p className="text-[11px] text-muted mt-0.5">{label}</p>
              <p className={`text-[10px] mt-1 font-medium ${colors.text}`}>{sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* row 2 — spending trend + health gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Spending trend area chart */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Spending Trend</h3>
            <span className="text-xs text-muted">Last 6 months</span>
          </div>
          {trend?.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "#8B95A7", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8B95A7", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="spending" stroke="#2563EB" strokeWidth={2} fill="url(#spendGrad)" dot={{ fill: "#2563EB", r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <Loading label="Loading trend" />}
        </div>

        {/* Financial Health gauge */}
        <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center">
          <h3 className="font-display font-semibold text-sm mb-4 self-start">Financial Health</h3>
          <HealthGauge score={h.financial_health_score} rating={h.rating} />
          <div className="mt-4 w-full space-y-2">
            {[
              { label: "Savings Ratio", val: `${Math.round(h.savings_ratio * 100)}%`, good: h.savings_ratio >= 0.2 },
              { label: "Debt-to-Income", val: `${Math.round(h.debt_to_income * 100)}%`, good: h.debt_to_income < 0.4 },
            ].map(({ label, val, good }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-muted">{label}</span>
                <span className={good ? "text-success font-medium" : "text-warning font-medium"}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* row 3 — spend donut + recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Spend breakdown donut */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Spending Breakdown</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={pieData} cx={75} cy={75} innerRadius={44} outerRadius={68} dataKey="value" strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} contentStyle={{ background: "#151D2E", border: "1px solid #1F2937", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {topCategories.map((b, i) => (
                <div key={b.category} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-muted flex-1 truncate">{b.category}</span>
                  <span className="text-xs font-medium">{b.pct_of_total}%</span>
                </div>
              ))}
            </div>
          </div>
          {spending?.insights?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border space-y-1.5">
              {spending.insights.slice(0, 2).map((ins, i) => (
                <p key={i} className="text-xs text-muted leading-relaxed">{ins}</p>
              ))}
            </div>
          )}
        </div>

        {/* AI Recommendations */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" /> AI Recommendations
          </h3>
          <div className="space-y-2.5">
            {recommendations?.length ? (
              recommendations.slice(0, 4).map((r) => (
                <RecommendationCard key={r.product} {...r} />
              ))
            ) : (
              <p className="text-sm text-muted">No recommendations yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* income vs spending bar summary */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
          <Landmark className="h-4 w-4 text-accent" /> Income vs Spending
        </h3>
        <div className="space-y-3">
          {[
            { label: "Income", value: h.monthly_income, max: h.monthly_income, color: "bg-primary" },
            { label: "Spending", value: h.monthly_spending, max: h.monthly_income, color: spendPct > 80 ? "bg-danger" : "bg-warning" },
            { label: "Savings", value: h.savings, max: h.monthly_income, color: "bg-success" },
          ].map(({ label, value, max, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted">{label}</span>
                <span className="font-medium">₹{value?.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${color}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnimatedPage>
  );
}
