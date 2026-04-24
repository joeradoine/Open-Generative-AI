import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `Tu es le CREATIF IVAMIND, agent scénariste série TikTok islam niche.

STYLE OBLIGATOIRE : Whistledown-Manga (fusion structure Bridgerton omnisciente + gravité seinen 90s Madhouse).
- Narrateur extérieur qui commente ce que les personnages ne voient pas
- Phrases longues descriptives ALTERNÉES avec phrases 3-5 mots gravitaires
- Distance narrative : il/elle/ils/prénoms (JAMAIS "vous/mes chers")
- Révélation spirituelle au climax, pas mondaine
- Rupture de rythme + silence chirurgical avant chaque révélation
- Tags [whispering] + [exhausted, but at peace] sur signature finale

BIBLE PERSONNAGES (non-négociable) :
- Omar : 16 ans franco-marocain, hoodie navy K∞, lunettes rectangulaires, curly hair
- Radoine : 40 ans père, crâne rasé, barbe courte, lunettes noires, thobe charcoal mao
- Soukaina : 37 ans mère, hijab sage khaki, abaya olive
- Imran : 7 ans, hoodie gris K∞ oversize, raie côté
- Issa : 5 ans, lunettes rondes dark-green, hoodie olive dinosaures
- Zayed : 4 ans, cheveux chaotiques, t-shirt kaki

RÈGLES :
- Jamais représenter Prophètes/Anges/Compagnons/Dieu
- Le Coran "dit" / "affirme" (jamais "il dit")
- Chiffres en LETTRES
- Signature finale EXACTE : "[whispering] [exhausted, but at peace] Jusqu'à la prochaine confidence. [/whispering]"
- Durée cible 75-88s audio (475-560 caractères environ)

STRUCTURE OBLIGATOIRE 5 ACTES :
1. Hook 5s (ouverture directe, accroche)
2. Situation 20s (plante le décor, introduit persos)
3. Montée 30s (tension, malentendu, détail qui dérange)
4. Révélation verset 17s (ouverture au sacré, verset ou hadith placé)
5. Chute 13s + signature (retour sur la scène transformée par la révélation)

Tu vas recevoir un THÈME. Sors UNIQUEMENT le script FR brut (pas de markdown, pas de timestamps, pas d'annotations de scène — juste le texte que le narrateur dira).`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { theme, research } = body;

    if (!theme || typeof theme !== 'string' || theme.length < 10) {
      return NextResponse.json({ error: 'theme required (min 10 chars)' }, { status: 400 });
    }

    // Injecte la recherche (Perplexity + Vault) comme contexte éditorial.
    let researchBlock = '';
    if (research) {
      const perp = research.perplexity?.findings ? `\n\n# Veille Perplexity (2026)\n${research.perplexity.findings}` : '';
      const vaultContents = (research.vault?.contents || []).map(c => `## ${c.file}\n${c.excerpt}`).join('\n\n');
      const vaultBlock = vaultContents ? `\n\n# Vault IVAEYES — extraits pertinents\n${vaultContents}` : '';
      if (perp || vaultBlock) {
        researchBlock = `\n\n═══ CONTEXTE RECHERCHE ═══${perp}${vaultBlock}\n═══════════════════════════\n\nUtilise ces insights pour ancrer le script dans la réalité 2026 + la doctrine IVAEYES.`;
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
    }

    const client = new Anthropic({ apiKey });

    const resp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `THÈME : ${theme}${researchBlock}\n\nÉcris le script FR complet (75-88s audio) en respectant Whistledown-Manga + bible persos + structure 5 actes + signature finale.` }],
    });

    const script = resp.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    const inputTokens = resp.usage?.input_tokens || 0;
    const outputTokens = resp.usage?.output_tokens || 0;
    const costUSD = (inputTokens * 3 + outputTokens * 15) / 1_000_000;

    return NextResponse.json({
      status: 'succeeded',
      script,
      meta: {
        model: 'claude-sonnet-4-6',
        theme,
        chars: script.length,
        inputTokens,
        outputTokens,
        costUSD: Number(costUSD.toFixed(4)),
      },
    });
  } catch (err) {
    console.error('[byok/script/generate]', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
