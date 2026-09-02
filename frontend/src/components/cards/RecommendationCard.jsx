import { CreditCard, PiggyBank, Landmark, TrendingUp, Sparkles } from "lucide-react";

const iconFor = (product = "") => {
  const p = product.toLowerCase();
  if (p.includes("card")) return CreditCard;
  if (p.includes("deposit") || p.includes("saving")) return PiggyBank;
  if (p.includes("loan")) return Landmark;
  if (p.includes("invest")) return TrendingUp;
  return Sparkles;
};

export default function RecommendationCard({ product, score, reason = [] }) {
  const Icon = iconFor(product);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-white/[0.02] p-4 hover:bg-white/[0.05] hover:border-primary/30 transition-colors">
      <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{product}</p>
          <span className="text-xs font-semibold text-accent shrink-0">
            {(score * (score <= 1 ? 100 : 1)).toFixed(1)}%
          </span>
        </div>
        {reason?.length > 0 && (
          <p className="text-xs text-muted mt-1 line-clamp-2">{reason.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}
