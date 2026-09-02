import { useEffect, useState } from "react";
import { Cpu, CheckCircle2, XCircle } from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import Loading from "../../components/common/Loading";
import { getModelMetrics } from "../../services/api";

export default function SystemOverview() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getModelMetrics().then(setData).catch(() => setData({ available: false }));
  }, []);

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow="Admin Control Center"
        title="AI Models & System"
        description="Status and training metrics for the deployed models."
      />

      {!data ? (
        <Loading label="Loading model status" />
      ) : (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sm">{data.model ?? "LoanRiskNet (PyTorch MLP)"}</p>
              <p className="text-xs text-muted flex items-center gap-1.5">
                {data.available ? (
                  <><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Trained & available</>
                ) : (
                  <><XCircle className="h-3.5 w-3.5 text-danger" /> {data.detail ?? "Not available"}</>
                )}
              </p>
            </div>
          </div>

          {data.available && data.metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-border">
              {Object.entries(data.metrics).map(([k, v]) => (
                <div key={k}>
                  <p className="font-display text-lg font-semibold">
                    {typeof v === "number" ? v.toFixed(3) : String(v)}
                  </p>
                  <p className="text-xs text-muted mt-1 capitalize">{k.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AnimatedPage>
  );
}
