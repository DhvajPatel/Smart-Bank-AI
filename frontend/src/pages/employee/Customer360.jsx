import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Wallet, TrendingDown, HeartPulse, CreditCard,
  BarChart2, Landmark, ArrowDownLeft, ArrowUpRight, User,
} from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import Loading from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import RecommendationCard from "../../components/cards/RecommendationCard";
import {
  getCustomer360,
  getCustomerTransactions,
  getCustomerLoans,
  getCustomerCreditCards,
} from "../../services/api";

// ── Helpers ────────────────────────────────────────────────────────────────────
const ratingStyle = {
  Excellent: "text-success",
  Good: "text-success",
  Fair: "text-warning",
  "Needs Attention": "text-danger",
};

const ratingBg = {
  Excellent: "bg-success/10 text-success",
  Good: "bg-success/10 text-success",
  Fair: "bg-warning/10 text-warning",
  "Needs Attention": "bg-danger/10 text-danger",
};

const barColor = (i) => ["bg-primary", "bg-accent", "bg-success", "bg-warning", "bg-danger"][i % 5];

const TABS = [
  { id: "overview",      label: "Overview",      icon: User },
  { id: "transactions",  label: "Transactions",  icon: BarChart2 },
  { id: "loans",         label: "Loans",         icon: Landmark },
  { id: "cards",         label: "Credit Cards",  icon: CreditCard },
];

// ── Sub-views ──────────────────────────────────────────────────────────────────

function OverviewTab({ data }) {
  const { customer, financial_health: health, spending, recommendations } = data;

  return (
    <div className="space-y-4">
      {/* Financial health */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-accent" /> Financial Health
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Monthly Income",   value: `₹${health?.monthly_income?.toLocaleString()}` },
            { label: "Monthly Spending", value: `₹${health?.monthly_spending?.toLocaleString()}` },
            { label: "Savings / mo",     value: `₹${health?.savings?.toLocaleString()}` },
            { label: "Savings Rate",     value: `${Math.round((health?.savings_ratio ?? 0) * 100)}%` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-white/[0.02] p-4">
              <p className="text-lg font-display font-semibold">{value}</p>
              <p className="text-xs text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${health?.financial_health_score ?? 0}%` }}
              transition={{ duration: 0.8 }}
              className={`h-full rounded-full ${
                (health?.financial_health_score ?? 0) >= 65 ? "bg-success" :
                (health?.financial_health_score ?? 0) >= 45 ? "bg-warning" : "bg-danger"
              }`}
            />
          </div>
          <span className={`text-sm font-semibold ${ratingStyle[health?.rating] ?? ""}`}>
            {health?.financial_health_score} — {health?.rating}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spending breakdown */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-accent" /> Spending Breakdown
          </h3>
          <div className="space-y-3">
            {spending?.breakdown?.slice(0, 6).map((b, i) => (
              <div key={b.category}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text">{b.category}</span>
                  <span className="text-muted">{b.pct_of_total}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${b.pct_of_total}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    className={`h-full rounded-full ${barColor(i)}`}
                  />
                </div>
              </div>
            ))}
          </div>
          {spending?.total_spent && (
            <p className="text-xs text-muted mt-4">
              Total (last {spending.period_months}mo): ₹{spending.total_spent.toLocaleString()}
            </p>
          )}
        </div>

        {/* Recommendations + insights */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-accent" /> AI Recommendations
          </h3>
          <div className="space-y-2.5 mb-5">
            {recommendations?.length ? (
              recommendations.map((r) => <RecommendationCard key={r.product} {...r} />)
            ) : (
              <p className="text-sm text-muted">No recommendations available.</p>
            )}
          </div>
          {spending?.insights?.length > 0 && (
            <>
              <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" /> Spending Insights
              </h4>
              <ul className="space-y-1.5">
                {spending.insights.map((ins, i) => (
                  <li key={i} className="text-xs text-muted leading-relaxed">{ins}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionsTab({ customerId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const PER_PAGE = 30;

  const load = async (offset = 0) => {
    setError(null);
    try {
      const res = await getCustomerTransactions(customerId, { limit: PER_PAGE, offset });
      setData(res);
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => { load(page * PER_PAGE); }, [customerId, page]);

  if (error) return <ErrorState onRetry={() => load(page * PER_PAGE)} />;
  if (!data)  return <Loading label="Loading transactions" />;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm">
          Transaction History
        </h3>
        <span className="text-xs text-muted">{data.total.toLocaleString()} total</span>
      </div>

      {data.items.length === 0 ? (
        <p className="text-sm text-muted text-center py-10">No transactions found.</p>
      ) : (
        <div className="divide-y divide-border">
          {data.items.map((t) => (
            <div key={t.transaction_id} className="flex items-center gap-4 px-6 py-3 hover:bg-white/[0.02] transition-colors">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                t.transaction_type === "Credit" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}>
                {t.transaction_type === "Credit"
                  ? <ArrowDownLeft className="h-4 w-4" />
                  : <ArrowUpRight className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.merchant || t.category || "—"}</p>
                <p className="text-xs text-muted truncate">
                  {t.category} · {t.payment_method} · {t.location || "—"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${
                  t.transaction_type === "Credit" ? "text-success" : "text-text"
                }`}>
                  {t.transaction_type === "Credit" ? "+" : "-"}₹{t.amount?.toLocaleString()}
                </p>
                <p className="text-xs text-muted">{t.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.total > PER_PAGE && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="text-xs px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-white/5 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs text-muted">
            {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, data.total)} of {data.total}
          </span>
          <button
            disabled={(page + 1) * PER_PAGE >= data.total}
            onClick={() => setPage((p) => p + 1)}
            className="text-xs px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-white/5 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

const loanStatusStyle = {
  Approved:  "bg-success/10 text-success",
  Pending:   "bg-warning/10 text-warning",
  Rejected:  "bg-danger/10 text-danger",
  Closed:    "bg-white/10 text-muted",
};

const riskProbStyle = (p) =>
  p < 0.15 ? "text-success" : p < 0.35 ? "text-warning" : "text-danger";

function LoansTab({ customerId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try { setData(await getCustomerLoans(customerId)); }
    catch (e) { setError(e); }
  };
  useEffect(() => { load(); }, [customerId]);

  if (error) return <ErrorState onRetry={load} />;
  if (!data)  return <Loading label="Loading loans" />;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm">Loan History</h3>
        <span className="text-xs text-muted">{data.total} loan{data.total !== 1 ? "s" : ""}</span>
      </div>
      {data.items.length === 0 ? (
        <p className="text-sm text-muted text-center py-10">No loans on record.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted uppercase tracking-wide text-left border-b border-border">
              <th className="px-6 py-3 font-medium">Loan ID</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Tenure</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Default Risk</th>
              <th className="px-6 py-3 font-medium">Defaulted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.items.map((l) => (
              <tr key={l.loan_id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-3 text-muted text-xs font-mono">{l.loan_id}</td>
                <td className="px-6 py-3 font-medium">{l.loan_type}</td>
                <td className="px-6 py-3 text-muted">₹{l.requested_amount?.toLocaleString()}</td>
                <td className="px-6 py-3 text-muted">{l.tenure_months} mo</td>
                <td className="px-6 py-3">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full ${loanStatusStyle[l.loan_status] ?? "bg-white/10 text-muted"}`}>
                    {l.loan_status}
                  </span>
                </td>
                <td className={`px-6 py-3 font-semibold text-sm ${riskProbStyle(l.default_probability)}`}>
                  {(l.default_probability * 100).toFixed(1)}%
                </td>
                <td className="px-6 py-3">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full ${l.defaulted ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
                    {l.defaulted ? "Yes" : "No"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CardsTab({ customerId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try { setData(await getCustomerCreditCards(customerId)); }
    catch (e) { setError(e); }
  };
  useEffect(() => { load(); }, [customerId]);

  if (error) return <ErrorState onRetry={load} />;
  if (!data)  return <Loading label="Loading cards" />;

  return (
    <div>
      {data.items.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted">
          No credit cards on record.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.items.map((c) => {
            const utilisation = c.credit_limit ? (c.used_amount / c.credit_limit) * 100 : 0;
            return (
              <div key={c.card_id} className="glass rounded-2xl p-5">
                {/* Card header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-semibold text-sm">{c.card_type}</p>
                    <p className="text-xs text-muted font-mono mt-0.5">{c.card_id}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full ${
                    c.status === "Active" ? "bg-success/10 text-success" : "bg-white/10 text-muted"
                  }`}>
                    {c.status}
                  </span>
                </div>

                {/* Utilisation bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted">Credit Used</span>
                    <span className={utilisation > 75 ? "text-danger" : utilisation > 50 ? "text-warning" : "text-success"}>
                      {utilisation.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(utilisation, 100)}%` }}
                      transition={{ duration: 0.7 }}
                      className={`h-full rounded-full ${
                        utilisation > 75 ? "bg-danger" : utilisation > 50 ? "bg-warning" : "bg-success"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-border bg-white/[0.02] p-3">
                    <p className="font-semibold">₹{c.used_amount?.toLocaleString()}</p>
                    <p className="text-muted mt-0.5">Used</p>
                  </div>
                  <div className="rounded-lg border border-border bg-white/[0.02] p-3">
                    <p className="font-semibold">₹{c.available_limit?.toLocaleString()}</p>
                    <p className="text-muted mt-0.5">Available</p>
                  </div>
                  <div className="rounded-lg border border-border bg-white/[0.02] p-3">
                    <p className="font-semibold">₹{c.credit_limit?.toLocaleString()}</p>
                    <p className="text-muted mt-0.5">Limit</p>
                  </div>
                  <div className="rounded-lg border border-border bg-white/[0.02] p-3">
                    <p className="font-semibold">{c.reward_points?.toLocaleString()} pts</p>
                    <p className="text-muted mt-0.5">Reward Points</p>
                  </div>
                </div>

                <p className="text-xs text-muted mt-3">
                  Annual Fee: ₹{c.annual_fee?.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Customer360() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const load = async () => {
    setError(null);
    setData(null);
    try {
      const res = await getCustomer360(id);
      setData(res);
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => {
    load();
    setActiveTab("overview");
  }, [id]);

  if (error) {
    return (
      <AnimatedPage>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-text mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <ErrorState title={`Couldn't load ${id}`} error={error} onRetry={load} />
      </AnimatedPage>
    );
  }

  if (!data) {
    return (
      <AnimatedPage>
        <Loading label={`Loading ${id}`} />
      </AnimatedPage>
    );
  }

  const { customer, financial_health: health } = data;

  return (
    <AnimatedPage>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-text mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* ── Customer header card ──────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: identity */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl font-bold shrink-0">
              {(customer.name ?? customer.customer_id)[0]}
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">{customer.name ?? customer.customer_id}</h2>
              <p className="text-xs text-muted mt-0.5">
                {customer.customer_id} · {customer.city} · {customer.occupation}
              </p>
              <p className="text-xs text-muted">Age {customer.age} · {customer.employment_years} yrs employment</p>
            </div>
          </div>

          {/* Right: credit + risk */}
          <div className="flex items-start gap-4">
            <div className="text-right">
              <p className="text-2xl font-display font-semibold">{customer.credit_score}</p>
              <p className="text-xs text-muted">Credit Score</p>
            </div>
            <div className="flex flex-col gap-1.5 items-end">
              <span className={`text-xs px-2.5 py-1 rounded-full ${
                customer.risk_band === "High"     ? "bg-danger/10 text-danger"   :
                customer.risk_band === "Low"      ? "bg-success/10 text-success" :
                                                    "bg-warning/10 text-warning"
              }`}>
                {customer.risk_band} Risk
              </span>
              {health?.rating && (
                <span className={`text-xs px-2.5 py-1 rounded-full ${ratingBg[health.rating] ?? ""}`}>
                  {health.rating}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick stat strip */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-5 pt-5 border-t border-border text-center">
          {[
            { label: "Income",     value: `₹${health?.monthly_income?.toLocaleString()}` },
            { label: "Spending",   value: `₹${health?.monthly_spending?.toLocaleString()}` },
            { label: "Savings",    value: `₹${health?.savings?.toLocaleString()}` },
            { label: "Health",     value: health?.financial_health_score ?? "—", cls: ratingStyle[health?.rating] },
            { label: "DTI",        value: `${Math.round((health?.debt_to_income ?? 0) * 100)}%` },
            { label: "Savings %",  value: `${Math.round((health?.savings_ratio ?? 0) * 100)}%` },
          ].map(({ label, value, cls }) => (
            <div key={label}>
              <p className={`font-display font-semibold ${cls ?? ""}`}>{value}</p>
              <p className="text-xs text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 glass rounded-xl mb-4 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200
                ${active
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-muted hover:text-text hover:bg-white/5"
                }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === "overview"     && <OverviewTab data={data} />}
          {activeTab === "transactions" && <TransactionsTab customerId={id} />}
          {activeTab === "loans"        && <LoansTab customerId={id} />}
          {activeTab === "cards"        && <CardsTab customerId={id} />}
        </motion.div>
      </AnimatePresence>
    </AnimatedPage>
  );
}
