export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wider text-accent mb-1">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted mt-1 max-w-xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
