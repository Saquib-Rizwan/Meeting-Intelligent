const SectionCard = ({ title, description, children, className = "", actions = null }) => {
  return (
    <section className={`rounded-2xl border border-[var(--panel-border)] bg-white/96 p-6 shadow-[var(--panel-shadow)] ${className}`.trim()}>
      {(title || description || actions) ? (
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            {title ? <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
};

export default SectionCard;
