# Accessibility

Target: WCAG 2.2 AA, checked by machines on every commit and designed for families that
include older adults, people writing in Hindi and people on cheap phones.

## Enforced, not hoped for

- `eslint-plugin-jsx-a11y` **strict** rules are **errors** ([`eslint.config.js`](../eslint.config.js)).
- **axe** runs in jsdom at every step of the client journey tests, and in a **real browser**
  (Playwright + `@axe-core/playwright`) at every step of the place → question → advice journey
  and while editing chips, in **light, dark and a forced (high-contrast) palette**, on desktop and
  at **375 px**, with WCAG 2.2 AA tags including colour contrast ([`journey.spec.ts`](../e2e/journey.spec.ts),
  [`accessibility.spec.ts`](../e2e/accessibility.spec.ts)).
- **Contrast is computed from the design tokens** in both themes, so a palette change that fails
  fails before a browser runs, including states axe never sees: hover, and every banner tone
  ([`tests/quality/accessibility.test.ts`](../tests/quality/accessibility.test.ts)).
- **Structure is checked on every screen**: one `h1`, no skipped heading levels, unique ids, every
  `aria-labelledby`/`aria-describedby`/`for` resolves, every control has a name, no positive
  `tabindex` ([`App.structure.test.tsx`](../packages/client/src/App.structure.test.tsx)).
- **Real-browser geometry**: every button, field, disclosure and theme choice measures at least
  44 × 44 px; with root text at 200% the 375 px page does not scroll sideways.

These caught real problems. During the rebuild: `role="log"` on an `<ol>`, and a second place
picker that repeated the first one's heading and ids. During the audit for this table: the primary
button's hover colour in dark mode left its text at 1.45:1; field borders were 1.39:1 against the
3:1 a control boundary needs; five compact buttons and the theme choices were 24–36 px; and at
200% text the hour strip and the theme switch pushed the page 90 px wider than a phone.

## WCAG 2.2 AA, criterion by criterion

| Criterion                         | How it is met                                                                                                 | Proved by                                          |
| :-------------------------------- | :------------------------------------------------------------------------------------------------------------ | :------------------------------------------------- |
| 1.1.1 Non-text content            | Logo `alt=""` beside the name; AQI bars `aria-hidden` with a text label per hour                              | axe (jsdom, browser)                               |
| 1.3.1 Info and relationships      | Landmarks, labelled sections, lists, a definition list in the advice card, `fieldset`/`legend`                | `App.structure.test.tsx`, axe                      |
| 1.3.5 Identify input purpose      | `autocomplete="email"`, `current-password`, `new-password`                                                    | `App.accounts.test.tsx`                            |
| 1.4.1 Use of colour               | AQI number and category always in text; verdicts are words                                                    | `AirCard.test.tsx`, axe                            |
| 1.4.3 Contrast (minimum)          | Every text token ≥ 4.5:1 on every ground, both themes (table below)                                           | `tests/quality/accessibility.test.ts`, axe         |
| 1.4.4 Resize text                 | rem-based type; zoom never disabled in the viewport meta                                                      | `tests/quality/accessibility.test.ts`, e2e at 200% |
| 1.4.10 Reflow                     | Single column at 375 px with no sideways scroll, also at 200% text                                            | `journey.spec.ts`, `accessibility.spec.ts`         |
| 1.4.11 Non-text contrast          | Control boundaries (`edge`) ≥ 3:1, focus ring ≥ 3:1, both themes                                              | `tests/quality/accessibility.test.ts`              |
| 1.4.12 Text spacing               | No fixed heights on text containers; strip and cards grow with their content                                  | e2e at 200%                                        |
| 2.1.1 Keyboard                    | Native buttons, inputs, `select`, radios, `details`; no custom key handling to get wrong                      | jsx-a11y strict, journey tests with `userEvent`    |
| 2.4.1 Bypass blocks               | Skip link to `main` (`tabindex="-1"`)                                                                         | `App.structure.test.tsx`                           |
| 2.4.3 Focus order                 | DOM order is reading order; no positive `tabindex`                                                            | `App.structure.test.tsx`                           |
| 2.4.6 Headings and labels         | One `h1`, sections labelled by their `h2`, no skipped levels                                                  | `App.structure.test.tsx`                           |
| 2.4.7 / 2.4.13 Focus visible      | 3 px accent outline with offset; `Highlight` in forced colours                                                | `tests/quality/accessibility.test.ts`, e2e         |
| 2.5.3 Label in name               | Accessible names start with the visible text (“Edit Dadi · older adult, asthma”)                              | `App.test.tsx`, `App.structure.test.tsx`           |
| 2.5.8 Target size (and 2.5.5 AAA) | Every control at least 44 × 44 px                                                                             | `accessibility.spec.ts`                            |
| 3.1.1 / 3.1.2 Language            | `lang="en-IN"`; replies follow the family's language and script                                               | `tests/quality/accessibility.test.ts`              |
| 3.3.1 / 3.3.3 Errors              | Messages in `role="alert"`, saying what to do (“Enter a valid email and a password of 10 to 128 characters.”) | `App.accounts.test.tsx`, `App.failures.test.tsx`   |
| 3.3.7 Redundant entry             | Place, people and routines are remembered and shown as chips, never asked again                               | `App.test.tsx`                                     |
| 3.3.8 Accessible authentication   | Plain email and password, paste and password managers allowed; no puzzle                                      | `App.accounts.test.tsx`                            |
| 4.1.2 Name, role, value           | Native elements first; every control named; ids unique and every reference resolves                           | `App.structure.test.tsx`, axe                      |
| 4.1.3 Status messages             | `role="status"` while waiting, `role="alert"` on errors, the chat a polite live log                           | `App.test.tsx`, `App.failures.test.tsx`            |

## Measured contrast (light / dark)

| Pair                                          | Ratio                           | Needs |
| :-------------------------------------------- | :------------------------------ | :---- |
| Body text (`ink`) on page / card              | 16.2 / 16.6, 17.2 / 15.0        | 4.5   |
| Secondary text (`ink-soft`) on page / card    | 10.1 / 12.5, 10.8 / 11.3        | 4.5   |
| Quiet text (`muted`) on page / card / tint    | 6.7 / 9.0, 7.1 / 8.1, 6.3 / 6.5 | 4.5   |
| Links and brand text (`brand`) on page / card | 6.8 / 10.6, 7.3 / 9.6           | 4.5   |
| Primary button text, at rest / on hover       | 7.3 / 10.6, 11.2 / 13.7         | 4.5   |
| Banners (ok, warn, danger, info)              | 7.8–9.4 / 11.2–11.6             | 4.5   |
| Field and button boundaries (`edge`)          | 3.5–3.9 / 3.6–4.9               | 3     |
| Focus ring (`accent`) on page / card          | 5.7 / 10.2, 6.1 / 9.2           | 3     |

The NAQI swatches use CPCB's own colours and are never the only carrier of meaning: each hour has
its number above the bar and a spoken label, so they are exempt from 1.4.11; under forced colours
they keep their colours (`forced-color-adjust: none`) while every boundary turns `CanvasText`.

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
- **Sign-in** is a plain form: labelled email and password fields with the right `autocomplete`
  (`email`, `current-password` or `new-password`), so password managers fill them; the length rule
  is linked to the password field with `aria-describedby`; errors are announced as alerts.
- The theme choice is three radios (light, system, dark) in a `fieldset`; the first paint follows
  the system with no script, because the CSP forbids inline script.

## Language and reading

- Gemini replies in the language and script of the message (English, Hindi or Hinglish); the
  font stack includes Noto Sans Devanagari.
- Engine sentences are short and concrete (“It looks better at 2 pm: Moderate (AQI 184)”).

## Motion and touch

- `prefers-reduced-motion` turns off transitions; nothing auto-plays.
- Every button, field, disclosure and theme choice is at least 44 × 44 px, checked in a real browser.
- Checkboxes and radios use the brand colour and are at least 20 px, inside a larger clickable label.
- Notifications are asked for only when the family switches alerts on, never on load.
