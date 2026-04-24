'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { I, Kbd } from '@/src/components/studio-chrome';

export default function NewCharacterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [outfit, setOutfit] = useState('');
  const [photos, setPhotos] = useState([]); // [{ name, dataUrl, size }]
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const readFiles = async (files) => {
    const images = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!images.length) return;
    const reads = images.map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, dataUrl: reader.result, size: file.size });
      reader.readAsDataURL(file);
    }));
    const added = await Promise.all(reads);
    setPhotos(prev => [...prev, ...added].slice(0, 20));
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Nom requis'); return; }
    if (photos.length < 1) { setError('Au moins 1 photo requise (10-20 recommandé pour cohérence optimale)'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch('/api/byok/characters/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          outfit,
          photos: photos.map(p => p.dataUrl),
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data.status !== 'succeeded') throw new Error(data.error || 'register failed');

      // Persist côté client pour retrouver cross-sessions sans recharger le filesystem
      try {
        const existing = JSON.parse(localStorage.getItem('ivamind:custom-characters') || '[]');
        const idx = existing.findIndex(c => c.id === data.id);
        if (idx >= 0) existing[idx] = data; else existing.push(data);
        localStorage.setItem('ivamind:custom-characters', JSON.stringify(existing));
      } catch {}

      router.push(`/ivamind/characters?new=${encodeURIComponent(data.id)}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="col" style={{ padding: '28px 40px', gap: 24, maxWidth: 880 }}>
      <div className="col gap-2">
        <div className="row gap-2">
          <Link href="/ivamind/characters" className="t-11 muted" style={{ textDecoration: 'none' }}>← Retour Characters</Link>
        </div>
        <span className="section-label gold">Register new character · Soul ID style</span>
        <h1 className="t-display t-28">Nouveau personnage</h1>
        <span className="t-13 muted">
          Upload 10-20 photos de la personne (différents angles, expressions, lightings).
          L'app sauvegarde les refs localement et les utilise pour Gemini i2i bible.
          Plus tard : création d'un <span className="t-mono gold">element_id Kling</span> pour cohérence vidéo cross-plans.
        </span>
      </div>

      {/* Name / description / outfit */}
      <div className="col gap-3">
        <div className="col gap-1">
          <label className="t-12 muted">Nom du personnage <span style={{color:'var(--red)'}}>*</span></label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ex. Karim, Sarah, Boss Tech, Grand-père..."
            style={{ padding: 10, fontSize: 14 }}
          />
        </div>
        <div className="col gap-1">
          <label className="t-12 muted">Description physique</label>
          <textarea
            className="input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Homme 35 ans, visage anguleux, barbe courte, cheveux noirs courts, yeux marrons..."
            rows={3}
            style={{ padding: 10, fontSize: 13, lineHeight: 1.5 }}
          />
        </div>
        <div className="col gap-1">
          <label className="t-12 muted">Wardrobe / Outfit locked</label>
          <textarea
            className="input"
            value={outfit}
            onChange={e => setOutfit(e.target.value)}
            placeholder="Veste en cuir noire, chemise blanche ouverte, jean denim bleu, baskets blanches..."
            rows={2}
            style={{ padding: 10, fontSize: 13, lineHeight: 1.5 }}
          />
        </div>
      </div>

      {/* Photos dropzone */}
      <div className="col gap-2">
        <div className="row gap-2">
          <span className="section-label gold">Photos de référence</span>
          <div style={{ flex: 1 }} />
          <span className="t-11 muted-2">{photos.length} / 20 · recommandé 10-20</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={e => readFiles(e.target.files)}
          style={{ display: 'none' }}
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={async (e) => {
            e.preventDefault();
            await readFiles(e.dataTransfer.files);
          }}
          style={{
            border: '2px dashed var(--border-500)',
            borderRadius: 'var(--r-3)',
            padding: '28px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'var(--bg-2)',
            transition: 'border-color .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-500)'}
        >
          <div className="col gap-2" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 32 }}>📸</span>
            <div className="t-14">Drop photos ici ou click pour uploader</div>
            <div className="t-11 muted">PNG / JPG / WebP · multiple files · max 20 total</div>
            <div className="t-11 muted-2" style={{ marginTop: 4, maxWidth: 480, lineHeight: 1.5 }}>
              💡 Conseil Soul ID : 10-20 photos avec **différents angles** (front / 3/4 / profil),
              **expressions variées** (neutre / sourire / sérieux), **lighting divers** (jour / nuit / intérieur / extérieur).
              Plus la variété est grande, meilleure est la cohérence cross-scènes.
            </div>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="row gap-2" style={{ flexWrap: 'wrap', marginTop: 6 }}>
            {photos.map((p, i) => (
              <div key={i} style={{
                position: 'relative',
                width: 72, height: 96,
                borderRadius: 'var(--r-2)',
                border: '1px solid var(--border-500)',
                overflow: 'hidden',
                background: 'var(--bg-3)',
              }}>
                <img src={p.dataUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 2, left: 2, padding: '1px 4px', background: 'rgba(10,10,18,.85)', borderRadius: 3 }}>
                  <span className="t-mono" style={{ fontSize: 9, color: 'var(--gold)' }}>{i + 1}</span>
                </div>
                <button
                  onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(229,72,77,0.85)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                  }}
                  title="Supprimer"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card" style={{ padding: 12, borderColor: 'var(--red)', background: 'rgba(229,72,77,0.1)' }}>
          <span className="t-12" style={{ color: 'var(--red)' }}>⚠ {error}</span>
        </div>
      )}

      {/* Submit */}
      <div className="row gap-3" style={{ marginTop: 8 }}>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={submitting || !name.trim() || photos.length < 1}
          style={{ fontSize: 14, padding: '10px 20px', opacity: (submitting || !name.trim() || photos.length < 1) ? 0.5 : 1 }}
        >
          {submitting ? <I.refresh size={13} /> : <span style={{ fontSize: 13 }}>✓</span>}
          {submitting ? 'Enregistrement...' : 'Enregistrer le personnage'}
        </button>
        <Link href="/ivamind/characters" className="btn btn-secondary">
          Annuler
        </Link>
        <div style={{ flex: 1 }} />
        <span className="t-11 muted-2" style={{ alignSelf: 'center' }}>
          Gemini i2i auto · Kling element_id Sprint 1.5
        </span>
      </div>
    </div>
  );
}
