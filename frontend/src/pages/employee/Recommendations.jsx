import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, TrendingUp } from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import RecommendationCard from "../../components/cards/RecommendationCard";
import Loading from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { getRecommendations } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function Recommendations() {
  const { user } = useAuth();
  const isCustomer = user?.role === "customer";

  // For customers, always use their own ID. For employees, use the search box.
  const [id, setId]         = useState(isCustomer ? user.customer_id : "");
  const [data, setData]     = useState(null);
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (targetId) => {
    const cid = (targetId ?? id).trim();
    if (!cid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getRecommendations(cid);
      setData(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load for customers on mount
  useEffect(() => {
    if (isCustomer) load(user.customer_id);
  }, []);

  const recs = data?.recommendations ?? [];

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow={isCustomer ? "My Account" : "Employee Workspace"}
        title="AI Recommendations"
        description={
          isCustomer
            ? `Personalised product matches for you, ${user.name.split(" ")[0]}.`
            : "Personalized banking product matches, ranked by confidence."
        }
      />

      {/* Employee search bar — hidden for customers */}
      {!isCustomer && (
        <form
          onSubmit={(e) => { e.preventDefault(); load(); }}
          className="glass rounded-2xl p-4 flex items-center gap-3 mb-6"
        >
          <Search className="h-4 w-4 text-muted shrink-0" />
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Customer ID, e.g. C100000"
            className="bg-transparent outline-none text-sm w-full placeholder:text-muted/60"
          />
          <button className="rounded-lg bg-primary px-4 py-2 text-xs font-medium shrink-0 hover:bg-primary/80 active:scale-95 transition-all">
            Find matches
          </button>
        </form>
      )}

      {loading && <Loading label="Finding your best matches…" />}
      {error  && <ErrorState error={error} title="Couldn't load recommendations" onRetry={() => load()} />}

      {data && !loading && (
        <>
          {/* Customer summary header */}
          {isCustomer && (
            <div className="glass rounded-2xl p-5 mb-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-display font-semibold">{recs.length} Products Matched</p>
                <p className="text-xs text-muted mt-0.5">
                  Based on your credit score, spending, and financial profile
                </p>
              </div>
              <div className="ml-auto text-right hidden sm:block">
                <p className="text-xs text-muted">Credit Score</p>
                <p className="font-display font-semibold text-accent">{user.credit_score}</p>
              </div>
            </div>
          )}

          {recs.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-muted">
              No recommendations available right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {recs.map((r, i) => (
                <motion.div
                  key={r.product}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <RecommendationCard {...r} />
                </motion.div>
              ))}
            </div>
          )}

          {/* confidence note for customers */}
          {isCustomer && recs.length > 0 && (
            <p className="text-xs text-muted text-center mt-5 flex items-center justify-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Scores show match confidence based on your profile
            </p>
          )}
        </>
      )}

      {!data && !loading && !error && !isCustomer && (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted">
          Search a customer ID above to see their recommended products.
        </div>
      )}
    </AnimatedPage>
  );
}
