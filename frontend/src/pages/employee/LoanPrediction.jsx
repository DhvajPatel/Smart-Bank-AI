import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, CheckCircle2, Lock, Pencil, AlertCircle } from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import RiskCard from "../../components/cards/RiskCard";
import ErrorState from "../../components/common/ErrorState";
import Loading from "../../components/common/Loading";
import { predictLoan, getCustomerLoanProfile } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

// Fields locked for customers (auto-filled from profile)
const LOCKED_FIELDS = ["monthly_income", "credit_score", "employment_years", "existing_debt"];

const FIELDS = [
  { key: "monthly_income",   label: "Monthly Income",      suffix: "₹",  step: 1000 },
  { key: "credit_score",     label: "Credit Score",        suffix: "",   step: 1    },
  { key: "employment_years", label: "Employment",          suffix: "yrs",step: 0.5  },
  { key: "existing_debt",    label: "Existing Debt",       suffix: "₹",  step: 500  },
  { key: "requested_amount", label: "Loan Amount",         suffix: "₹",  step: 10000 },
  { key: "tenure_months",    label: "Tenure",              suffix: "mo", step: 12   },
];

const TENURE_OPTIONS = [12, 24, 36, 60, 84, 120, 180];

const STAGES = [
  "Analyzing financial profile…",
  "Evaluating credit behavior…",
  "Running neural network…",
  "Calculating risk score…",
];

const DEFAULTS = {
  monthly_income: 80000,
  credit_score: 720,
  employment_years: 5,
  existing_debt: 10000,
  requested_amount: 500000,
  tenure_months: 60,
};

export default function LoanPrediction() {
  const { user }      = useAuth();
  const isCustomer    = user?.role === "customer";

  const [form, setForm]       = useState(DEFAULTS);
  const [profileLoading, setProfileLoading] = useState(isCustomer);
  const [profileError, setProfileError]     = useState(null);
  const [stage, setStage]     = useState(-1);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  // Auto-load customer profile data
  useEffect(() => {
    if (!isCustomer) return;
    (async () => {
      try {
        const p = await getCustomerLoanProfile(user.customer_id);
        setForm((f) => ({
          ...f,
          monthly_income:   p.monthly_income,
          credit_score:     p.credit_score,
          employment_years: p.employment_years,
          existing_debt:    p.existing_debt,
        }));
      } catch (e) {
        setProfileError(e);
      } finally {
        setProfileLoading(false);
      }
    })();
  }, []);

  const runAnalysis = async (e) => {
    e.preventDefault();
    setResult(null);
    setError(null);
    setStage(0);

    const stageTimer = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 450);

    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, Number(v)])
      );
      const [res] = await Promise.all([
        predictLoan(payload),
        new Promise((r) => setTimeout(r, STAGES.length * 450 + 200)),
      ]);
      setResult(res);
    } catch (err) {
      setError(err);
    } finally {
      clearInterval(stageTimer);
      setStage(-1);
    }
  };

  if (profileLoading) {
    return (
      <AnimatedPage>
        <PageHeader eyebrow="My Account" title="Loan Calculator" />
        <Loading label="Loading your profile…" />
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow={isCustomer ? "My Account" : "Employee Workspace"}
        title={isCustomer ? "Loan Calculator" : "AI Loan Risk Engine"}
        description={
          isCustomer
            ? `See your approval chances before applying, ${user.name.split(" ")[0]}.`
            : "Deep-learning approval and default probability for a loan application."
        }
      />

      {/* Customer info banner */}
      {isCustomer && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-4 mb-5 flex items-center gap-3 border border-primary/20"
        >
          <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Profile auto-filled from your account</p>
            <p className="text-xs text-muted">
              Income, credit score, employment & existing debt are pulled from your profile.
              Only loan amount and tenure are editable.
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Form */}
        <form onSubmit={runAnalysis} className="glass rounded-2xl p-6 space-y-4">
          {FIELDS.map((f) => {
            const locked = isCustomer && LOCKED_FIELDS.includes(f.key);
            return (
              <div key={f.key}>
                <label className="text-xs text-muted mb-1.5 flex items-center gap-1.5">
                  {f.label}
                  {f.suffix && <span className="text-muted/60">({f.suffix})</span>}
                  {locked && <Lock className="h-3 w-3 text-muted/50 ml-auto" />}
                  {!locked && isCustomer && <Pencil className="h-3 w-3 text-accent/60 ml-auto" />}
                </label>

                {/* Tenure dropdown for both roles */}
                {f.key === "tenure_months" ? (
                  <select
                    value={form[f.key]}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    disabled={locked}
                    className="w-full rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {TENURE_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m} months ({(m / 12).toFixed(0)} yr{m > 12 ? "s" : ""})</option>
                    ))}
                  </select>
                ) : (
                  <div className="relative">
                    <input
                      type="number"
                      value={form[f.key]}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                      step={f.step}
                      disabled={locked}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all
                        ${locked
                          ? "border-border bg-white/[0.01] text-muted cursor-not-allowed opacity-70"
                          : "border-border bg-white/[0.03] focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                        }`}
                    />
                    {locked && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted/50 bg-white/5 px-1.5 py-0.5 rounded">
                        auto
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={stage >= 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium shadow-[0_0_24px_-6px_rgba(37,99,235,0.6)] hover:shadow-[0_0_32px_-4px_rgba(37,99,235,0.8)] hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            <Cpu className="h-4 w-4" />
            {stage >= 0 ? "Analyzing…" : isCustomer ? "Check My Eligibility" : "Analyze Risk"}
          </motion.button>

          {profileError && (
            <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 rounded-lg px-3 py-2 border border-warning/20">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Could not auto-fill profile. Please enter values manually.
            </div>
          )}
        </form>

        {/* Result panel */}
        <div className="glass rounded-2xl p-6 flex flex-col justify-center min-h-[22rem]">
          <AnimatePresence mode="wait">
            {/* Analyzing stages */}
            {stage >= 0 && (
              <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <p className="text-xs text-muted mb-2">Running AI analysis…</p>
                {STAGES.map((s, i) => (
                  <div key={s} className="flex items-center gap-3 text-sm">
                    {i < stage ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : i === stage ? (
                      <span className="h-4 w-4 rounded-full border-2 border-t-accent border-white/10 animate-spin shrink-0" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-border shrink-0" />
                    )}
                    <span className={i <= stage ? "text-text" : "text-muted"}>{s}</span>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Error */}
            {error && stage < 0 && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ErrorState error={error} title="Analysis failed" onRetry={runAnalysis} />
              </motion.div>
            )}

            {/* Result */}
            {result && stage < 0 && !error && (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <RiskCard
                  level={result.risk_level}
                  approvalProbability={result.approval_probability}
                  defaultProbability={result.default_probability}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-white/[0.02] p-3 text-center">
                    <p className="font-display font-semibold">₹{result.recommended_amount?.toLocaleString()}</p>
                    <p className="text-xs text-muted mt-1">Recommended Amount</p>
                  </div>
                  <div className="rounded-xl border border-border bg-white/[0.02] p-3 text-center">
                    <p className="font-display font-semibold">{result.recommended_tenure} months</p>
                    <p className="text-xs text-muted mt-1">Recommended Tenure</p>
                  </div>
                </div>
                {result.explanation?.length > 0 && (
                  <div className="space-y-1.5">
                    {result.explanation.map((exp, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted">
                        <span className="text-accent mt-0.5">•</span>
                        <span>{exp}</span>
                      </div>
                    ))}
                  </div>
                )}
                {isCustomer && (
                  <p className="text-[10px] text-muted/60 text-center pt-2 border-t border-border">
                    This is an AI estimate. Final approval is subject to bank review.
                  </p>
                )}
              </motion.div>
            )}

            {/* Idle */}
            {!result && stage < 0 && !error && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-3">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Cpu className="h-8 w-8 text-primary/60" />
                </div>
                <p className="text-sm text-muted">
                  {isCustomer
                    ? "Your profile is pre-filled. Choose a loan amount and tenure, then check your eligibility."
                    : "Fill in the applicant's details and run the AI analysis."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AnimatedPage>
  );
}
