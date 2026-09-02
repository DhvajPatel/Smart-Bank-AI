import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

function CountUp({ value, format }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => format(Math.round(v)));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 1, ease: "easeOut" });
    return controls.stop;
  }, [value]);

  return <motion.span>{rounded}</motion.span>;
}

// Tailwind can't see class names built with template-string interpolation
// (e.g. `bg-${tone}`) at build time, so every tone variant is spelled out
// here as a static, literal class string.
const TONES = {
  primary: { glow: "bg-primary", chip: "bg-primary/15", icon: "text-primary" },
  accent: { glow: "bg-accent", chip: "bg-accent/15", icon: "text-accent" },
  success: { glow: "bg-success", chip: "bg-success/15", icon: "text-success" },
  warning: { glow: "bg-warning", chip: "bg-warning/15", icon: "text-warning" },
  danger: { glow: "bg-danger", chip: "bg-danger/15", icon: "text-danger" },
};

export default function StatCard({ icon: Icon, label, value, delta, tone = "primary", format = (v) => v.toLocaleString() }) {
  const numeric = typeof value === "number";
  const t = TONES[tone] ?? TONES.primary;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="glass rounded-2xl p-5 relative overflow-hidden group"
    >
      <div
        className={`absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-20 ${t.glow}`}
      />
      <div className="flex items-center justify-between mb-4">
        <div className={`h-9 w-9 rounded-lg ${t.chip} flex items-center justify-center ${t.icon}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        {delta && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              delta.startsWith("-") ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
            }`}
          >
            {delta}
          </span>
        )}
      </div>
      <p className="text-2xl font-display font-semibold tracking-tight">
        {numeric ? <CountUp value={value} format={format} /> : value}
      </p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </motion.div>
  );
}
