import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import Loading from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { getSpending } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const COLORS = ["#2563EB", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#8B95A7"];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-xl border border-border">
      <p className="font-medium">{payload[0].name}</p>
      <p style={{ color: payload[0].fill }}>₹{payload[0].value?.toLocaleString()}</p>
    </div>
  );
};

export default function Spending() {
  const { user } = useAuth();
  const isCustomer = user?.role === "customer";

  const [id, setId]         = useState(isCustomer ? user.customer_id : "");
  const [months, setMonths] = useState(3);
  const [data, setData]     = useState(null);
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (targetId, m) => {
    const cid = (targetId ?? id).trim();
    if (!cid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getSpending(cid, m ?? months);
      setData(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load for customers on mount
  useEffect(() => {
    if (isCustomer) load(user.customer_id, months);
  }, []);

  // Reload when months changes (customer mode)
  const handleMonthsChange = (m) => {
    setMonths(m);
    if (isCustomer) load(user.customer_id, m);
  };

  const barData = data?.breakdown?.slice(0, 8).map((b) => ({
    name: b.category.length > 8 ? b.category.slice(0, 8) + "…" : b.category,
    amount: b.amount,
    pct: b.pct_of_total,
  })) ?? [];

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow={isCustomer ? "My Account" : "Employee Workspace"}
        title={isCustomer ? "My Spending" : "Spending Analyzer"}
        description={
          isCustomer
            ? `Your spending breakdown for the last ${months} month${months > 1 ? "s" : ""}.`
            : "Category breakdown and AI-generated insights on spending shifts."
        }
      />

      {/* Period selector — shown for both roles */}
      <div className="flex items-center gap-3 mb-5">
        {!isCustomer && (
          <>
            <div className="flex-1 glass rounded-2xl p-3.5 flex items-center gap-3">
              <Search className="h-4 w-4 text-muted shrink-0" />
              <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="Customer ID, e.g. C100000"
                className="bg-transparent outline-none text-sm w-full placeholder:text-muted/60"
              />
            </div>
          </>
        )}
        <div className="glass rounded-2xl p-1.5 flex items-center gap-1">
          {[1, 3, 6].map((m) => (
            <button
              key={m}
              onClick={() => handleMonthsChange(m)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                months === m
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-text hover:bg-white/5"
              }`}
            >
              {m}M
            </button>
          ))}
        </div>
        {!isCustomer && (
          <button
            onClick={() => load()}
            className="glass rounded-2xl px-4 py-3 text-xs font-medium hover:bg-white/10 active:scale-95 transition-all border border-border"
          >
            Analyze
          </button>
        )}
      </div>

      {loading && <Loading label="Analyzing spending…" />}
      {error   && <ErrorState error={error} title="Couldn't load spending data" onRetry={() => load()} />}

      {data && !loading && (
        <>
          {/* Summary stat */}
          <div className="glass rounded-2xl p-5 mb-4 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted">Total Spent</p>
                <p className="font-display font-semibold text-lg">₹{data.total_spent?.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-xs text-muted">
              Over <span className="text-text font-medium">{data.period_months} month{data.period_months > 1 ? "s" : ""}</span>
              {" "}·{" "}
              <span className="text-text font-medium">{data.breakdown?.length}</span> categories
            </div>
            {isCustomer && (
              <div className="ml-auto text-right hidden sm:block">
                <p className="text-xs text-muted">Avg / Month</p>
                <p className="font-display font-semibold">
                  ₹{Math.round(data.total_spent / data.period_months).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Donut chart */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display font-semibold text-sm mb-4">Category Breakdown</h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={data.breakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx={75} cy={75}
                      innerRadius={44} outerRadius={68}
                      strokeWidth={0}
                    >
                      {data.breakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 min-w-0">
                  {data.breakdown.slice(0, 7).map((b, i) => (
                    <div key={b.category} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-muted flex-1 truncate">{b.category}</span>
                      <span className="text-xs font-medium shrink-0">{b.pct_of_total}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bar chart */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display font-semibold text-sm mb-4">Amount by Category</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#8B95A7", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8B95A7", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insights */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              AI Insights
            </h3>
            <div className="space-y-2.5">
              {data.insights.map((ins, i) => {
                const isUp   = ins.includes("increased") || ins.includes("⚠");
                const isDown = ins.includes("decreased") || ins.includes("✓");
                const isTip  = ins.includes("💡");
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
                      isTip  ? "border-primary/20 bg-primary/5" :
                      isUp   ? "border-warning/20 bg-warning/5" :
                      isDown ? "border-success/20 bg-success/5" :
                               "border-border bg-white/[0.02]"
                    }`}
                  >
                    {isUp   && <TrendingUp   className="h-4 w-4 text-warning shrink-0 mt-0.5" />}
                    {isDown && <TrendingDown className="h-4 w-4 text-success shrink-0 mt-0.5" />}
                    {isTip  && <span className="text-base shrink-0">💡</span>}
                    <span className="text-muted leading-relaxed">{ins.replace(/^[⚠✓💡]\s*/, "")}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!data && !loading && !error && !isCustomer && (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted">
          Enter a customer ID above to see their spending breakdown.
        </div>
      )}
    </AnimatedPage>
  );
}
