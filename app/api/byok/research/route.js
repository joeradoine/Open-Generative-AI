import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VAULT_INDEX_PATH = path.join(
  os.homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs/hdidane/hdidane/VAULT_INDEX.md'
);
const VAULT_ROOT = path.join(
  os.homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs/hdidane/hdidane'
);

/**
 * Parse VAULT_INDEX pour trouver les fichiers pertinents au thème (keyword match basique).
 * Retourne {relevant_files: [{path, title, tag, insight}], chars: N}.
 */
async function searchVault(theme) {
  try {
    const index = await fs.readFile(VAULT_INDEX_PATH, 'utf8');
    const themeLower = theme.toLowerCase();
    const themeWords = themeLower.split(/\s+/).filter(w => w.length > 3);

    const lines = index.split('\n');
    const hits = [];
    let current = null;

    for (const line of lines) {
      // Format attendu : - [[NomFichier]] — TAG mot-clé — INSIGHT central
      const m = line.match(/\[\[([^\]]+)\]\]\s*[—-]?\s*(.*)$/);
      if (m) {
        const [, file, rest] = m;
        const fullLine = (file + ' ' + rest).toLowerCase();
        const score = themeWords.reduce((s, w) => s + (fullLine.includes(w) ? 1 : 0), 0);
        if (score > 0) hits.push({ file, excerpt: rest.slice(0, 200), score });
      }
    }

    hits.sort((a, b) => b.score - a.score);
    const top = hits.slice(0, 5);

    // Lire le contenu des top 3 fichiers — chercher le path réel dans le vault
    const contents = [];
    for (const h of top.slice(0, 3)) {
      const candidates = [
        path.join(VAULT_ROOT, h.file + '.md'),             // relative root : Savoir/Religion/...
        path.join(VAULT_ROOT, 'IVAEYES', h.file + '.md'),  // legacy IVAEYES/
        path.join(VAULT_ROOT, h.file.split('/').pop() + '.md'), // basename fallback
      ];
      for (const p of candidates) {
        try {
          const content = await fs.readFile(p, 'utf8');
          contents.push({ file: h.file, excerpt: content.slice(0, 1500) });
          break;
        } catch {}
      }
    }

    return {
      index_hits: top.map(h => ({ file: h.file, excerpt: h.excerpt })),
      contents,
      chars: contents.reduce((s, c) => s + c.excerpt.length, 0),
    };
  } catch (err) {
    return { error: `Vault read failed: ${err.message}`, index_hits: [], contents: [] };
  }
}

/**
 * Perplexity Sonar Pro : recherche web actuelle sur le thème.
 */
async function searchPerplexity(theme) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return { error: 'PERPLEXITY_API_KEY not set' };

  try {
    const resp = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'Tu es un veilleur culture/islam/société pour une série TikTok niche islam francophone. Identifie les angles actuels pertinents, les débats en cours, les données clés. Sois concret, cite les sources.',
          },
          {
            role: 'user',
            content: `Thème : ${theme}\n\nRecherche : quels angles sont discutés en 2026 sur ce sujet dans la sphère islamique francophone ? Données, chiffres, débats, points de friction. Format concis (10-15 bullets).`,
          },
        ],
        max_tokens: 1500,
      }),
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      return { error: `Perplexity ${resp.status}: ${errTxt.slice(0, 200)}` };
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];
    return { findings: content, citations, usage: data.usage };
  } catch (err) {
    return { error: `Perplexity fetch: ${err.message}` };
  }
}

export async function POST(request) {
  try {
    const { theme } = await request.json();
    if (!theme || theme.length < 10) {
      return NextResponse.json({ error: 'theme required (min 10 chars)' }, { status: 400 });
    }

    // Parallèle : Vault + Perplexity
    const [vault, perplexity] = await Promise.all([
      searchVault(theme),
      searchPerplexity(theme),
    ]);

    // TikTok scrap : stub Sprint 1.5 (requires Apify actor + 30s+)
    const tiktok = { status: 'stubbed', note: 'TikTok scraping via Apify — Sprint 1.5' };

    return NextResponse.json({
      status: 'succeeded',
      theme,
      vault,
      perplexity,
      tiktok,
      summary: {
        vault_files_found: vault.index_hits?.length || 0,
        vault_excerpts_loaded: vault.contents?.length || 0,
        perplexity_ok: !perplexity.error,
      },
    });
  } catch (err) {
    console.error('[byok/research]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
