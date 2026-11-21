# Accessibility

Target: WCAG 2.2 AA, checked by machines on every commit and designed for families that
include older adults, people reading in Hindi and people on cheap phones.

## Enforced, not hoped for

- `eslint-plugin-jsx-a11y` **strict** rules are **errors** ([`eslint.config.js`](../eslint.config.js)).
- **axe** runs in jsdom at every step of the client journey tests and on the form, and in a
  **real browser** (Playwright + `@axe-core/playwright`) on every stage and every tab, in
  **light and dark** themes, on desktop and at **375 px**, with WCAG 2.2 AA tags including
  colour contrast ([`journey.spec.ts`](../e2e/journey.spec.ts)).
- A Playwright check that no stage scrolls sideways at 375 px.

## Structure and semantics

- Landmarks: `header`, `main` (focus target), `footer`; a **skip link** to the main content.
- One `h1` per stage; sections labelled by their headings; health alerts are headings so they
  appear in a screen reader's heading list.
- Native controls throughout: `select`, `input type="number"`, checkboxes, radios, `details`,
  real `table` elements with `caption`, `scope="col"` and `scope="row"`.
- Every field has a visible `label`; grouped fields use `fieldset`/`legend` (each person, the
  home, routines, health conditions, language, theme).
- AI-guessed values carry a visible "Guessed — please check" hint linked with
  `aria-describedby`, so the cue is announced, not only seen.
- Each action's checkbox is described by its impact sentences (`aria-describedby`), so a screen
  reader hears what ticking it will do.

## Dynamic content

- **Focus moves** to the new content on every stage change, and the page scrolls to the top
  ([`use-page-focus.ts`](../packages/client/src/state/use-page-focus.ts)).
- The running impact total is an `aria-live="polite"` region: ticking an action announces the
  new family-wide cut.
- Errors use `role="alert"`; loading and status messages use `role="status"`.
- The coach's explanation and answers are live regions, marked `lang="hi"` when written in Hindi
  so screen readers switch voice.

## Keyboard

- The plan's sections are a WAI-ARIA **tabs** widget: arrow keys, Home and End move between tabs;
  only the active tab is in the tab order ([`Tabs.tsx`](../packages/client/src/components/plan/Tabs.tsx)).
- Place results are buttons with `aria-pressed`; Enter in the search box searches.
- A visible 3 px focus outline on every focusable element.

## Charts with text equivalents

The hourly PM2.5 chart ([`HourlyChart.tsx`](../packages/client/src/components/plan/HourlyChart.tsx))
is an SVG with `role="img"`, labelled by its caption and described by a sentence naming the
worst hour and the cleanest window; the full hourly table is one click away in a `details`
element. Colour is never the only signal: every band is also written in words.

## Colour, contrast and motion

- One palette defined once with `light-dark()` tokens ([`index.css`](../packages/client/src/index.css));
  text tokens chosen for 4.5:1 on both surfaces; verified by axe's contrast rule in both themes.
- Light, dark and system themes, chosen with three radios (a two-state toggle cannot express
  "follow my device"), with no inline script so the first paint is already right.
- `prefers-reduced-motion` disables transitions.

## Language and inclusion

- Descriptions can be written in English, Hindi or Hinglish; the coach answers in English or
  Hindi (Devanagari), with numbers kept as digits.
- Plain language: times as "6 am", choices described by what they mean for the family, costs as
  bands ("Under ₹3,000") rather than jargon.
- A print stylesheet prints every section, so the routine can go on the fridge.
