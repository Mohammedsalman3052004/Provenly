export function PageHead({ eyebrow, title, desc, actions }: { eyebrow?: string; title: string; desc?: string; actions?: React.ReactNode }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {actions && <div className="row wrap">{actions}</div>}
    </header>
  );
}
