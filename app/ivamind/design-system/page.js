export default function DesignSystemPage() {
  const inks = ['--bg-0','--bg-1','--bg-2','--bg-3','--bg-4'];
  const borders = ['--border-700','--border-600','--border-500','--border-400'];
  const golds = ['--gold-lo','--gold','--gold-hi'];
  const pch = ['--pch-0','--pch-1','--pch-2','--pch-3','--pch-4','--pch-5'];
  const semantic = [['--red','Error'],['--green','Success'],['--blue','Info'],['--violet','Review'],['--gold','Primary']];

  return (
    <div style={{ padding: 40 }}>
      <span className="section-label gold">Design system</span>
      <h1 className="t-24" style={{ fontWeight: 600, marginTop: 8, marginBottom: 6 }}>Ink, parchment, gold.</h1>
      <p className="t-13 muted" style={{ maxWidth: 640, marginBottom: 24 }}>
        A production suite for halal manga and anime. Dense like a studio DCC, quiet like a kitab.
        Dark paper, hot-pressed gold for signal, vermilion semantic color. Serif for meaning, sans for control surfaces, mono for machine truth.
      </p>

      <SwatchRow title="Ink · dark neutrals" items={inks} />
      <SwatchRow title="Borders · elevation" items={borders} />
      <SwatchRow title="Gold · accent unique" items={golds} />
      <SwatchRow title="Parchment · manuscript tones" items={pch} />
      <SwatchRow title="Semantic" items={semantic.map(([v]) => v)} labels={semantic.map(([,l]) => l)} />
    </div>
  );
}

function SwatchRow({ title, items, labels }) {
  return (
    <div className="col" style={{ gap: 10, marginBottom: 24 }}>
      <span className="section-label">{title}</span>
      <div className="row gap-3">
        {items.map((v, i) => (
          <div key={v} className="col" style={{ gap: 6, width: 120 }}>
            <div style={{ height: 72, background: `var(${v})`, border: '1px solid var(--border-600)', borderRadius: 6 }} />
            <span className="t-mono t-11 muted-2">{v}</span>
            {labels && <span className="t-11 muted">{labels[i]}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
