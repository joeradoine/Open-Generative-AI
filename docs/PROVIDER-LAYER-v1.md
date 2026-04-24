# IVAMIND Studio — Provider Layer v1 (Sprint 1.1)

BYOK (bring-your-own-key) layer that replaces the Muapi-only backend with direct calls to
Gemini / Kling / Seedance / Fish.audio / ElevenLabs / local inference, with Muapi kept as a
fallback for exotic models (Nano Banana 2, Flux Kontext, lipsync).

**Branch:** `test-hyperframes` · **Delivered:** 2026-04-24.

## File tree created

```
src/lib/providers/
  types.js           JSDoc types, BaseAdapter, newJobId()
  registry.js        ProviderRegistry (id -> adapter map, capability lookup)
  router.js          CapabilityRouter.pick(capability, hints) -> adapter
  gemini.js          Gemini 2.5 Flash Image (i2i + t2i, 3 refs max)
  kling.js           Kling v3 / v3-omni (JWT HS256, t2v, i2v, element_ids)
  seedance.js        Stub — returns 'failed' until docs wired
  fish.js            Fish Audio TTS + canonical voice constants + FR guard-rails
  elevenlabs.js      Scribe v1/v2 STT word-level + name patches + backup TTS
  local.js           z-image-turbo / SDXL via http://localhost:8900 (health-probed)
  muapi.js           Legacy Muapi fallback wrapper
  jobStore.js        In-process job map for polling
  index.js           Barrel + buildRegistryFromKeys / buildRegistryFromRequest helpers

src/store/
  settingsStore.js   Zustand (persisted) — BYOK keys in localStorage
  providerStore.js   Zustand (in-memory) — jobs queue, live cost tracker

app/api/byok/
  generate/image/route.js       POST
  generate/video/route.js       POST
  generate/audio/tts/route.js   POST (JSON)
  generate/audio/stt/route.js   POST (JSON or multipart)
  poll/[jobId]/route.js         GET
  settings/keys/route.js        GET / POST (.env.local mirror)

app/studio/
  byok-settings/page.js         6 key slots + "server-configured" status
  byok-image/page.js            Prompt + refs + AR + Generate
  byok-video/page.js            Prompt + startFrame + elementIds + polling
  byok-audio/page.js            TTS + STT (URL or file upload)

scripts/
  smoke-test-providers.js       node scripts/smoke-test-providers.js

public/byok-output/             Generated assets (gemini/kling/fish/elevenlabs/local/muapi/seedance)
```

## API routes exposed

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/byok/generate/image` | Router picks Gemini (≤3 refs) or Muapi (>3). Returns `{jobId,status,assets,providerId,routerReason}`. |
| POST | `/api/byok/generate/video` | Kling (t2v / i2v / character-lock via elementIds). Returns immediately with `status:"running"` and a `jobId` to poll. |
| POST | `/api/byok/generate/audio/tts` | Fish Audio (canonical IVAMIND / Kronos narrators) or ElevenLabs backup. |
| POST | `/api/byok/generate/audio/stt` | ElevenLabs Scribe word-level. JSON (`audioUrl`) or multipart (`file=`). |
| GET  | `/api/byok/poll/[jobId]` | Unified polling. Looks up the internal job record + delegates to adapter. |
| GET  | `/api/byok/settings/keys` | Returns `{configured:{gemini:bool,…}}` (never the key itself). |
| POST | `/api/byok/settings/keys` | Merges provided keys into `.env.local`. |

### Router decision table

| Capability | Hint | Winner | Cost (trial units) |
|---|---|---|---|
| `image.t2i` / `image.i2i` with `refCount ≤ 3` | — | Gemini | 1u |
| `image.t2i` with `refCount > 3` | muapi set | Muapi (Nano Banana 2) | per model |
| `image.t2i` with `maxCostUnits === 0` | local healthy | Local | 0u |
| `video.character-lock` or `elementIds.length > 0` | — | Kling pro `kling-v3-omni` | 10u / 5s |
| `video.t2v` / `video.i2v` | `preferredQuality: standard` | Kling `kling-v3` | 4u / 5s |
| `audio.tts` | `language=fr` or `voice.includes("narrator-fr")` | Fish | — |
| `audio.stt-word-level` | — | ElevenLabs `scribe_v2` | — |

## BYOK key sources (precedence, highest first)

1. POST body `providerKeys: { gemini, klingAccessKey, klingSecretKey, fish, elevenlabs, seedance, muapi }`
2. `process.env.*` (read from `.env.local` on the Next.js server)

Client-side: `useSettingsStore().activeKeys()` returns only non-empty slots, then `.persistToServer()` mirrors them into `.env.local` via the settings route.

## Guard-rails worth noting

- **Fish FR input** (`fish.js`):
  - Rejects `[pause]`, `[short pause]`, `[long pause]` (Twil/Vartor artefacts).
  - Rejects bare digits (must be spelled out).
  - Warns when FR text has zero accents.
- **ElevenLabs STT** (`elevenlabs.js`): auto-patches canonical IVAMIND names in both `text` and `words[]`:
  `Soukaïna` → `Soukaina`, `Radouane` → `Radoine`, `Zahied` → `Zayed`.
- **Kling JWT**: `{iss, exp: now+1800, nbf: now-5}` signed HS256. `element_ids` forces `mode: "pro"` and `kling-v3-omni`.
- **Gemini**: hard limit 3 refs — throws with a clear "use muapi for >3" message.

## Smoke test results (2026-04-24)

Ran against `.env.local` on the Mac Mini workstation. Report:

```
Fish          ✓ 26.7 KB mp3 written      /byok-output/fish/fish_mocrrrff_l7nk2v.mp3
ElevenLabs    ✓ 9 words · captions JSON  /byok-output/elevenlabs/el_mocrrsn4_aptfgr.json
Gemini        ✗ API_KEY_INVALID          (new key from 2026-04-19 has quota=0, see CLAUDE.md)
Kling         ✗ 429 Account balance low  (trial units exhausted)
Seedance      —                          (stub, not implemented)
Local         unhealthy                  (no GPU server at :8900)
Muapi         skipped                    (no MUAPI_API_KEY)
```

Live proxy verification via the running Next.js dev server:

```bash
curl -X POST http://localhost:3000/api/byok/generate/audio/tts \
  -H 'Content-Type: application/json' \
  -d '{"text":"La lumière révèle le cœur.","voice":"ivamind-narrator-fr","language":"fr"}'
# → {"jobId":"fish_…","status":"succeeded","providerId":"fish",
#     "assets":[{"url":"/byok-output/fish/fish_…mp3","kind":"audio"}],
#     "routerReason":"fish canonical TTS"}
```

All 4 BYOK pages render 200 at `/studio/byok-settings|byok-image|byok-video|byok-audio`.

## Known limitations

- **Seedance**: stub only — `SeedanceAdapter.generateVideo()` returns `status:'failed'` with a clear note. Wire Volcano Ark API when docs are available.
- **Local inference**: probes `http://localhost:8900/health`; no-op if unreachable. No streaming; synchronous PNG bytes only.
- **Job store**: in-process Map. Lost on dev-server restart. Fine for Sprint 1.1, swap for Redis or filesystem-backed later.
- **Muapi fallback**: not exercised in smoke test (no key). The adapter matches the legacy `src/lib/muapi.js` shape but re-polls via `/api/v1/predictions/{id}/result` and downloads locally.
- **Legacy studios untouched**: `packages/studio/ImageStudio.js` / `VideoStudio.js` / `CinemaStudio.js` + `app/api/api/v1/[[...path]]/route.js` keep working against Muapi. BYOK lives in parallel routes (`/studio/byok-*`, `/api/byok/*`).

## Example curl commands

```bash
# 0. Check / set keys (server-side mirror).
curl http://localhost:3000/api/byok/settings/keys
curl -X POST http://localhost:3000/api/byok/settings/keys \
  -H 'Content-Type: application/json' \
  -d '{"gemini":"AIza…","klingAccessKey":"…","klingSecretKey":"…","fish":"…","elevenlabs":"…"}'

# 1. Image (Gemini t2i).
curl -X POST http://localhost:3000/api/byok/generate/image \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"a red apple on a white table, cinematic lighting","aspectRatio":"1:1"}'

# 2. Image i2i with ref (Gemini).
curl -X POST http://localhost:3000/api/byok/generate/image \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"same face, new outfit: thobe charcoal, mosque courtyard",
       "aspectRatio":"9:16",
       "refs":[{"url":"https://…/omar-face.png","role":"face"}]}'

# 3. Video t2v (Kling standard, 4u/5s).
curl -X POST http://localhost:3000/api/byok/generate/video \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"slow push-in on an old mosque at dawn, golden light, seinen 90s",
       "duration":5,"aspectRatio":"9:16"}'

# 4. Video character-lock (Kling pro + elementIds, 10u/5s).
curl -X POST http://localhost:3000/api/byok/generate/video \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Omar walks toward the camera in the HLM corridor",
       "startFrameUrl":"https://…/omar-hlm.png",
       "duration":5,"aspectRatio":"9:16","mode":"pro",
       "elementIds":["308527690409318"]}'

# 5. Poll.
curl http://localhost:3000/api/byok/poll/kling_<jobId>

# 6. TTS (Fish, canonical FR narrator).
curl -X POST http://localhost:3000/api/byok/generate/audio/tts \
  -H 'Content-Type: application/json' \
  -d '{"text":"Dans un supermarché ordinaire, une mère cherche les centimes qui lui manquent.",
       "voice":"ivamind-narrator-fr","language":"fr"}'

# 7. STT (ElevenLabs Scribe, word-level, via URL).
curl -X POST http://localhost:3000/api/byok/generate/audio/stt \
  -H 'Content-Type: application/json' \
  -d '{"audioUrl":"/byok-output/fish/fish_<jobId>.mp3","language":"fr","model":"scribe_v1"}'

# 8. STT via file upload (multipart).
curl -X POST http://localhost:3000/api/byok/generate/audio/stt \
  -F 'file=@./sample.mp3' \
  -F 'language=fr' -F 'model=scribe_v1' \
  -F 'providerKeys={"elevenlabs":"sk_…"}'
```

## Next sprints

- Wire Seedance adapter against Volcano Ark once docs land.
- Swap the in-process job store for a filesystem-backed queue (survives restarts).
- Port `packages/studio/ImageStudio.js` + `VideoStudio.js` + `CinemaStudio.js` onto the Provider Layer so BYOK becomes the default and Muapi moves to a feature flag.
- Add a cost dashboard on top of `useProviderStore().totalCostUnits`.
