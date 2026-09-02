import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight, User, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function Login() {
  const [role, setRole] = useState("customer");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = (r) => {
    setRole(r);
    setError("");
    setUsername("");
    setPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }
    setLoading(true);
    const result = await login(role, username.trim(), password.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const dest =
      result.session.role === "admin"
        ? "/admin"
        : `/employee/customers/${result.session.customer_id}`;
    navigate(dest);
  };

  const hints =
    role === "admin"
      ? { user: "Admin", pass: "admin123", userLabel: "Username", passLabel: "Password" }
      : { user: "e.g. Aarav Sharma", pass: "e.g. C100042", userLabel: "Full Name", passLabel: "Customer ID" };

  return (
    <div className="min-h-screen w-full flex items-stretch bg-bg relative overflow-hidden">
      {/* ambient gradients */}
      <motion.div
        className="pointer-events-none absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-[120px]"
        animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[-10rem] right-[-6rem] h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-[120px]"
        animate={{ x: [0, -30, 0], y: [0, -25, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* left brand panel */}
      <div className="hidden lg:flex flex-col justify-center flex-1 px-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">SmartBank AI</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="font-display text-4xl font-semibold max-w-md leading-tight"
        >
          AI-Powered Banking Intelligence
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
          className="text-muted mt-4 max-w-sm text-sm"
        >
          Finance · Risk · AI Analytics · Insights — a single dashboard for
          customer intelligence, loan risk, and personalized recommendations.
        </motion.p>

        <div className="flex gap-8 mt-12">
          {[
            ["10,000+", "customers modeled"],
            ["0.65+", "loan model ROC-AUC"],
            ["12", "spend categories"],
          ].map(([n, l], i) => (
            <motion.div
              key={l}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
            >
              <p className="font-display text-lg font-semibold text-accent">{n}</p>
              <p className="text-xs text-muted mt-0.5">{l}</p>
            </motion.div>
          ))}
        </div>

        {/* credential hint card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mt-10 glass rounded-2xl p-5 max-w-xs space-y-3"
        >
          <p className="text-xs font-semibold text-accent uppercase tracking-wider">Demo Credentials</p>
          <div className="space-y-1.5 text-xs text-muted">
            <p><span className="text-text font-medium">Admin</span> — username: <code className="text-accent">Admin</code> / password: <code className="text-accent">admin123</code></p>
            <p><span className="text-text font-medium">Customer</span> — username: customer full name / password: Customer ID (e.g. <code className="text-accent">C100000</code>)</p>
          </div>
        </motion.div>
      </div>

      {/* right login card */}
      <div className="flex-1 flex items-center justify-center px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="glass w-full max-w-sm rounded-3xl p-8"
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-semibold">SmartBank AI</span>
          </div>

          <h2 className="font-display text-2xl font-semibold mb-1">Welcome back</h2>
          <p className="text-sm text-muted mb-6">Sign in to your workspace</p>

          {/* role toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/5 border border-border mb-6">
            {["customer", "admin"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleChange(r)}
                className={`py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 ${
                  role === r
                    ? "bg-primary text-white shadow-[0_0_0_1px_rgba(37,99,235,0.4)]"
                    : "text-muted hover:text-text hover:bg-white/5"
                }`}
              >
                {r === "customer" ? "Customer" : "Admin"}
              </button>
            ))}
          </div>

          <motion.form
            variants={container}
            initial="hidden"
            animate="show"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <motion.div variants={item}>
              <label className="text-xs text-muted mb-1.5 block">{hints.userLabel}</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <User className="h-4 w-4 text-muted shrink-0" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={hints.user}
                  autoComplete="username"
                  className="bg-transparent outline-none text-sm w-full placeholder:text-muted/50"
                />
              </div>
            </motion.div>

            <motion.div variants={item}>
              <label className="text-xs text-muted mb-1.5 block">{hints.passLabel}</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Lock className="h-4 w-4 text-muted shrink-0" />
                <input
                  type={role === "admin" ? "password" : "text"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={hints.pass}
                  autoComplete="current-password"
                  className="bg-transparent outline-none text-sm w-full placeholder:text-muted/50"
                />
              </div>
            </motion.div>

            {/* error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg bg-danger/10 border border-danger/20 px-3 py-2.5 text-xs text-danger"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </motion.div>
            )}

            <motion.button
              variants={item}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium mt-2 shadow-[0_0_24px_-6px_rgba(37,99,235,0.6)] hover:shadow-[0_0_32px_-4px_rgba(37,99,235,0.8)] hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              {loading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </motion.button>
          </motion.form>

          <div className="mt-6 space-y-1.5 text-xs text-muted/70 text-center lg:hidden">
            <p>Admin: <span className="text-muted">Admin / admin123</span></p>
            <p>Customer: <span className="text-muted">Full name / Customer ID</span></p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
