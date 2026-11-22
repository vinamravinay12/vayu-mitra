# Accessibility

Target: WCAG 2.2 AA, checked by machines on every commit and designed for families that
include older adults, people writing in Hindi and people on cheap phones.

## Enforced, not hoped for

- `eslint-plugin-jsx-a11y` **strict** rules are **errors** ([`eslint.config.js`](../eslint.config.js)).
- **axe** runs in jsdom at every step of the client journey tests, and in a **real browser**
  (Playwright + `@axe-core/playwright`) at every step of the place → question → advice journey
  and while editing chips, in **light and dark**, on desktop and at **375 px**, with WCAG 2.2 AA
  tags including colour contrast ([`journey.spec.ts`](../e2e/journey.spec.ts)).
- A Playwright check that the page never scrolls sideways at 375 px.

These caught two real problems during the rebuild: `role="log"` on an `<ol>` (not allowed, and it
orphaned the list items), and a second place picker that repeated the first one's heading and ids.

## Structure and semantics

- Landmarks: `header`, `main` (skip-link target), `footer`; every panel is a `section` labelled by
  its heading; one `h1` per screen.
- **The conversation is a live log**: a `role="log"` region with `aria-live="polite"`, each message
  prefixed for screen readers with “You said:” or “Vayu Mitra said:”. Waiting and errors use
  `role="status"` and `role="alert"`.
- **The advice card** is a labelled region (“Walk: OK with precautions”) with a definition list
  (planned, cleanest, extra care) and the precautions as a list, so it reads in order.
- **Memory chips** are a list; each Edit and Forget button names its chip (“Forget Dadi · older
  adult, asthma”). The editors use native `select`, checkboxes in a `fieldset`, `time` and
  `number` inputs, each with a label.
- **The AQI** is never colour alone: the number and category are text, and every bar in the
  12-hour strip has its value above it and a screen-reader label (“2 pm: Moderate”).
- Suggested questions are real buttons in a labelled group; the message box has a label.
- The theme choice is three radios (light, system, dark) in a `fieldset`; the first paint follows
  the system with no script, because the CSP forbids inline script.

## Language and reading

- Gemini replies in the language and script of the message (English, Hindi or Hinglish); the
  font stack includes Noto Sans Devanagari.
- Engine sentences are short and concrete (“It looks better at 2 pm: Moderate (AQI 184)”).

## Motion and touch

- `prefers-reduced-motion` turns off transitions; nothing auto-plays.
- Buttons are at least 44 px tall (36 px for the compact chip buttons, still with clear spacing).
- Notifications are asked for only when the family switches alerts on, never on load.
