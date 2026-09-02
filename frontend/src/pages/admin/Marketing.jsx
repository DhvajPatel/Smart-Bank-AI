import { useEffect, useState } from "react";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import Loading from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { getMarketingSegments, getMarketingProspects } from "../../services/api";

const SEGMENTS = [
  { key: "high_value", label: "High Value" },
  { key: "credit_card", label: "Credit Card Prospects" },
  { key: "loan", label: "Loan Prospects" },
];

export default function Marketing() {
  const [segments, setSegments] = useState(null);
  const [segment, setSegment] = useState("high_value");
  const [prospects, setProspects] = useState(null);
  const [error, setError] = useState(null);

  const loadSummary = async () => {
    try {
      setSegments(await getMarketingSegments());
    } catch (e) {
      setError(e);
    }
  };

  const loadProspects = async (seg) => {
    setProspects(null);
    setError(null);
    try {
      setProspects(await getMarketingProspects({ segment: seg, limit: 20 }));
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadProspects(segment);
  }, [segment]);

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow="Admin Control Center"
        title="AI Marketing Intelligence"
        description="Customer segments and AI-ranked product recommendations for targeting."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {SEGMENTS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSegment(key)}
            className={`glass rounded-2xl p-5 text-left transition-all ${
              segment === key ? "ring-1 ring-primary/50" : "hover:bg-white/[0.03]"
            }`}
          >
            <p className="font-display text-2xl font-semibold text-accent">
              {segments
                ? (key === "high_value"
                    ? segments.high_value_customers
                    : key === "credit_card"
                    ? segments.credit_card_prospects
                    : segments.loan_prospects
                  )?.toLocaleString()
                : "—"}
            </p>
            <p className="text-xs text-muted mt-1">{label}</p>
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-sm">AI Product Recommendation</h3>
        </div>

        {error ? (
          <div className="p-6"><ErrorState onRetry={() => loadProspects(segment)} /></div>
        ) : !prospects ? (
          <div className="p-6"><Loading label="Ranking prospects" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted uppercase tracking-wide text-left">
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">City</th>
                <th className="px-6 py-3 font-medium">Recommended Product</th>
                <th className="px-6 py-3 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {prospects.prospects.map((p) => (
                <tr key={p.customer_id} className="border-t border-border hover:bg-white/[0.02]">
                  <td className="px-6 py-3">
                    <p className="font-medium">{p.name ?? p.customer_id}</p>
                    <p className="text-xs text-muted">{p.customer_id}</p>
                  </td>
                  <td className="px-6 py-3 text-muted">{p.city ?? "—"}</td>
                  <td className="px-6 py-3">{p.recommended_product ?? "—"}</td>
                  <td className="px-6 py-3">
                    {p.confidence != null ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent">
                        {p.confidence}%
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AnimatedPage>
  );
}
