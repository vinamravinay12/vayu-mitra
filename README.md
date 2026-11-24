# 🌫️ Vayu Mitra — a clean-air coach you talk to, for families in winter smog

**Ask it what you would ask a friend who knows the air: “Can Dadi go for her 6:30 walk?”,
“When should I open the windows?”, “Is it OK for the kids to play after school?”. It reads the
nearest official air station, answers for your family, remembers who is at home, and can warn
you when the air turns bad.**

📦 **Repository:** https://github.com/vinamravinay12/vayu-mitra
🌐 **Live app:** https://vayu-mitra-632738328636.asia-south1.run.app (Cloud Run, `asia-south1`;
deployed with one script: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))

---

## 🎯 The problem

A GenAI assistant that helps families get through severe winter smog: **low-emission daily
routines**, **indoor air habits** and **safer alternatives**, tailored to **where they live and how
they live**, with the **direct impact of each choice** explained.

“AQI is severe, stay indoors” cannot be acted on. A family needs to know whether _this_ walk, at
_this_ hour, is OK for _this_ person, and what to do instead. Forms that ask twenty questions up
front are abandoned. And an assistant that invents numbers cannot be trusted with someone’s lungs.

## 💬 What it does

- **Conversation, not forms.** The family just talks. Gemini reads each message (English, Hindi
  or Hinglish) into facts: _Dadi, older adult, asthma; walks at 6:30_. Those facts appear as
  **chips** the family can edit or forget. Nothing is remembered silently.
- **Official air, on India’s scale.** “Now” comes from the nearest fresh **CPCB** station
  (data.gov.in) or, failing that, **WAQI**, converted to India’s **National Air Quality Index**.
  The hours ahead are the **Copernicus CAMS** forecast (Open-Meteo), **anchored to that station**
  and fading back to the model over a day.
- **Advice the engine decides, the AI explains.** A tested engine decides _go_, _better later_,
  _OK with care_ or _skip_, finds the cleanest window, and picks precautions (N95, inhaler,
  purifier, recirculation) for who is involved. Gemini only words it, and a reply with any number
  the engine did not produce is rejected and replaced with the engine’s own sentence.
- **Alerts in the background.** Cloud Scheduler runs a check every 30 minutes; families who opted
  in get a standard Web Push notification when their place reaches their chosen category, never in
  their quiet hours, and not twice in six hours unless it gets worse.
- **Its own accounts, and private.** Email and password, hashed with scrypt; the session is an
  HttpOnly cookie no script can read. One Firestore document per family with only the chips, the
  place and alert settings. The conversation itself is never stored. One button deletes
  everything, account included.

## 🧭 How a message flows

```
 "Dadi has asthma and walks at 6:30 every morning. Is it OK today?"
        │
        ├─ injection screen: patterns, then an independent Gemini judge ─┐
        ├─ air report: nearest CPCB/WAQI station + CAMS forecast ────────┤ in parallel
        └─ understand: Gemini → memory changes + "walk, Dadi, 06:30" ────┘
        ▼
 engine (pure, tested): apply changes → read intent → advise
        verdict "better later", 2 pm Moderate (AQI 184), N95 + inhaler
        ▼
 reply: Gemini words the facts → every number checked against them → else engine's sentence
        ▼
 browser: reply + advice card + updated chips + one-tap follow-up questions
```

## 🏗️ Architecture

| Package           | What it is                                                                                                                                                   |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core`   | The engine: NAQI from every pollutant, EPA→NAQI, nearest station, forecast anchoring, memory, advice, alerts. Pure functions, no I/O.                        |
| `packages/server` | Express API: station and forecast adapters, the chat pipeline, accounts and sessions, Firestore, Web Push, the scheduler-only alert route, security headers. |
| `packages/client` | React app: sign-in, air card, chat, memory chips, alert settings, delete-my-data. No third-party SDKs.                                                       |

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · AI design: [docs/AI.md](docs/AI.md) ·
decisions: [docs/decisions.md](docs/decisions.md) · assumptions: [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md)

## 🚀 Run it

Needs Node 22+.

```bash
npm ci
npm run dev            # API on :8099 and the app on :5173, no keys needed
```

With no keys it runs end to end: no sign-in (one local household), replies from the engine’s own
sentences, and live Open-Meteo air without station anchoring. Add keys in `packages/server/.env`
(see [.env.example](.env.example)):

| Variable                                          | Turns on                                                     |
| :------------------------------------------------ | :----------------------------------------------------------- |
| `GEMINI_API_KEY`                                  | Understanding messages (and so memory) and AI-worded replies |
| `DATA_GOV_IN_API_KEY`                             | CPCB official station readings                               |
| `WAQI_TOKEN`                                      | WAQI stations, where CPCB has none nearby                    |
| `SESSION_SECRET`, `STORE=firestore`               | Email-and-password accounts, kept in Firestore               |
| `VAPID_*`                                         | Background push alerts                                       |
| `SCHEDULER_AUDIENCE`, `SCHEDULER_SERVICE_ACCOUNT` | The background alert check                                   |

`AIR_DATA_MODE=fixture` serves a fixed winter day for offline demos; production refuses it.

## ☁️ Deploy

Everything runs on Google Cloud (Cloud Run, Firestore, Secret Manager, Cloud Scheduler). From
Cloud Shell, one command does it all, asking only for the Gemini key:

```bash
bash scripts/deploy-gcp.sh gen-lang-client-0308156900
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for what it creates.

## ✅ Quality gates

```bash
npm run verify   # format → lint → typecheck → dead code (knip) → 318 tests at 100% coverage → build
npm run e2e      # 18 browser runs: desktop + 375 px, light + dark + forced colours, axe, 44 px targets, 200% text
npm run profile  # engine and HTTP latency, heap growth, payload sizes
```

CI runs all of these plus a dependency audit, gitleaks over the whole history, CodeQL, a check
that the client bundle carries no key, and a container build. See [docs/TESTING.md](docs/TESTING.md),
[docs/EFFICIENCY.md](docs/EFFICIENCY.md), [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) and
[docs/CODE_QUALITY.md](docs/CODE_QUALITY.md).

## 🔒 Security and privacy

Every personal route needs a signed session cookie (HttpOnly, Secure, SameSite=Strict), and the
user id comes only from it; passwords are hashed with scrypt. The
alert route accepts only a Google-signed OIDC token from the scheduler’s own service account.
Gemini, data.gov.in and WAQI keys live only on the server. Writes are accepted only as JSON from our own page (no cross-site forms), every body is a strict
schema, and hidden Unicode is stripped before the model reads it. Strict CSP with no inline
script, no third-party hosts and Trusted Types; every CI Action is pinned to a commit. Every model answer is
schema-constrained and re-validated; user text is fenced. Details in [SECURITY.md](SECURITY.md)
and [docs/SECURITY.md](docs/SECURITY.md).

## ⚠️ Limits

Vayu Mitra gives general precautions, not medical advice. Station readings can be an hour or two
old and a few kilometres away; the app says which station and when. Forecasts beyond the next
few hours are a model’s, not a measurement.

## 📄 Licence

MIT, see [LICENSE](LICENSE).
