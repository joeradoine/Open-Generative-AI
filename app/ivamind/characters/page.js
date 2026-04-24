'use client';
import { CHARACTERS } from '@/src/data/ivamind-mock';
import { Badge, I } from '@/src/components/studio-chrome';

export default function CharactersPage() {
  return (
    <div style={{ padding: '24px' }}>
      <div className="col gap-3" style={{ marginBottom: 20 }}>
        <span className="section-label gold">Characters · Bible locked</span>
        <h1 className="t-24" style={{ fontWeight: 600 }}>6 personas IVAMIND</h1>
        <span className="t-12 muted">Omar + famille. Bible physique verrouillée. Element IDs Kling pour persistence.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {CHARACTERS.map(c => (
          <div key={c.id} className="card card-hov" style={{ padding: 16 }}>
            <div className="row gap-3" style={{ marginBottom: 12 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: `linear-gradient(135deg, hsl(${c.hue},28%,30%), hsl(${c.hue},18%,18%))`,
                border: '1px solid var(--border-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 22, fontWeight: 700,
              }}>{c.name[0]}</div>
              <div className="col" style={{ gap: 2 }}>
                <span className="t-display t-16">{c.name}</span>
                <span className="t-12 muted">{c.role}</span>
                <span className="t-11 muted-2 t-mono">{c.age} ans</span>
              </div>
            </div>
            <div className="t-12 muted" style={{ marginBottom: 12 }}>{c.outfit}</div>
            <div className="row gap-2" style={{ marginBottom: 10 }}>
              <Badge variant="gold" icon={I.dot}>Bible locked</Badge>
              <span className="t-mono t-11 muted-2">{c.refs} refs · {c.primary} primary</span>
            </div>
            <div className="t-mono t-11 muted-2" style={{ wordBreak: 'break-all' }}>element_id: {c.element}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
