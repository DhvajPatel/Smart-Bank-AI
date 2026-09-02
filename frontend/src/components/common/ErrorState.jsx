import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorState({
  title = "Couldn't load this data",
  message,
  onRetry,
  error,
}) {
  // Extract a readable message from an axios error or plain Error
  const detail =
    message ??
    error?.response?.data?.detail ??
    error?.message ??
    "The backend may be offline. Make sure the FastAPI server is running at http://127.0.0.1:8000";

  const status = error?.response?.status;

  return (
    <div className="glass rounded-2xl p-8 flex flex-col items-center text-center gap-3">
      <div className="h-11 w-11 rounded-full bg-danger/10 flex items-center justify-center">
        <AlertTriangle className="h-5 w-5 text-danger" />
      </div>
      <h3 className="font-display font-semibold text-text">{title}</h3>
      <p className="text-sm text-muted max-w-sm">{detail}</p>
      {status && (
        <span className="text-xs font-mono bg-white/5 border border-border px-2 py-1 rounded-lg text-muted">
          HTTP {status}
        </span>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 border border-border px-4 py-2 text-sm transition-colors active:scale-95"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}
