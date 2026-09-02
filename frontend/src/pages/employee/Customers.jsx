import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ChevronRight } from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import Loading from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { listCustomers } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const riskStyle = {
  Low: "bg-success/10 text-success",
  Medium: "bg-warning/10 text-warning",
  Elevated: "bg-warning/10 text-warning",
  High: "bg-danger/10 text-danger",
  Unknown: "bg-white/10 text-muted",
};

export default function Customers() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = user?.role === "admin" ? "/admin" : "/employee";

  const load = async (term = "") => {
    setError(null);
    try {
      const res = await listCustomers({ search: term || undefined, limit: 20 });
      setData(res);
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow="Employee Workspace"
        title="Customers"
        description="Search the customer directory and open a full 360° profile."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(search);
        }}
        className="glass rounded-2xl p-4 flex items-center gap-3 mb-6"
      >
        <Search className="h-4 w-4 text-muted shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Customer ID / Name"
          className="bg-transparent outline-none text-sm w-full placeholder:text-muted/60"
        />
        <button className="rounded-lg bg-primary px-4 py-2 text-xs font-medium shrink-0">
          Search
        </button>
      </form>

      {error ? (
        <ErrorState onRetry={() => load(search)} />
      ) : !data ? (
        <Loading label="Loading customers" />
      ) : data.items.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted">
          No customers matched "{search}".
        </div>
      ) : (
        <div className="glass rounded-2xl divide-y divide-border overflow-hidden">
          {data.items.map((c, i) => (
            <motion.button
              key={c.customer_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`${base}/customers/${c.customer_id}`)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors text-left"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold shrink-0">
                  {(c.name ?? c.customer_id)[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name ?? c.customer_id}</p>
                  <p className="text-xs text-muted truncate">
                    {c.customer_id} · {c.city ?? "—"} · Credit {c.credit_score ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full ${riskStyle[c.risk_band] ?? riskStyle.Unknown}`}>
                  {c.risk_band}
                </span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {data && (
        <p className="text-xs text-muted mt-4">
          Showing {data.items.length} of {data.total} customers
        </p>
      )}
    </AnimatedPage>
  );
}
