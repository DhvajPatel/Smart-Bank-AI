import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import Loading from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { getCustomerAnalytics } from "../../services/api";

function MiniBarChart({ data, dataKey, labelKey, color }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
          <XAxis dataKey={labelKey} tick={{ fill: "#8B95A7", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fill: "#8B95A7", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#151D2E", border: "1px solid #1F2937", borderRadius: 10, fontSize: 12 }} />
          <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    setData(null);
    try {
      setData(await getCustomerAnalytics());
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <AnimatedPage>
        <PageHeader eyebrow="Admin Control Center" title="Customer Analytics" />
        <ErrorState onRetry={load} />
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow="Admin Control Center"
        title="Customer Analytics"
        description={data ? `Distributions across ${data.total_customers.toLocaleString()} customers.` : "Loading distributions..."}
      />

      {!data ? (
        <Loading label="Loading analytics" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display font-semibold text-sm mb-4">Credit Score Distribution</h3>
            <MiniBarChart data={data.credit_score_distribution} dataKey="count" labelKey="range" color="#2563EB" />
          </div>
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display font-semibold text-sm mb-4">Income Distribution</h3>
            <MiniBarChart data={data.income_distribution} dataKey="count" labelKey="range" color="#06B6D4" />
          </div>
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display font-semibold text-sm mb-4">Age Distribution</h3>
            <MiniBarChart data={data.age_distribution} dataKey="count" labelKey="range" color="#10B981" />
          </div>
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display font-semibold text-sm mb-4">Top Cities</h3>
            <MiniBarChart data={data.top_cities} dataKey="count" labelKey="city" color="#F59E0B" />
          </div>
        </div>
      )}
    </AnimatedPage>
  );
}
