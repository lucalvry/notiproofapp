# NotiProof Explainer Video Scripts

Four short (60–90s) explainer videos, one per user persona. **Every label, button, route, and feature in these scripts was verified against the current codebase** — no hallucinated features.

| # | Persona | File | Length |
|---|---------|------|--------|
| 1 | Business owner (Shopify / Woo store) | [01-business-owner.md](./01-business-owner.md) | ~75s |
| 2 | Marketer / content creator | [02-marketer.md](./02-marketer.md) | ~85s |
| 3 | Agency user | [03-agency.md](./03-agency.md) | ~80s |
| 4 | End customer (testimonial submitter) | [04-customer.md](./04-customer.md) | ~60s |

## How to read a script

Each script has three columns of information:

- **VO** — voiceover, written in plain conversational English. Read at a calm, friendly pace (~150 words/min).
- **On-screen** — what the viewer sees. Exact UI labels are in **bold** and come straight from the app.
- **Cues** — director notes (transitions, camera moves, highlight what to point at).

## Brand colors used in the videos

- Primary navy `#0F3460` (matches `--primary` in `src/index.css`)
- Accent sky blue `#0EA5E9` (matches `--accent`)
- Off-white surface `#F8FAFC`, muted grey `#94A3B8`
- Display font: Space Grotesk · Body font: Inter

## What the videos deliberately leave out

These features exist in the UI but are explicitly stubs / "Coming soon" / Beta. They are **not** mentioned in the scripts so the videos stay honest:

- Agency logo upload, Stripe-powered agency billing portal, automated reseller billing (estimation tool only)
- Advanced content engagement analytics (views/clicks on social posts) — UI placeholders
- Widget A/B testing — works but labeled Beta in the app
- Stripe as a *proof source* (Stripe is only used for app billing, not as a data source)
