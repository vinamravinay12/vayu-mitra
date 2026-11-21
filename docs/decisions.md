# Architecture decision records

Each record states the decision, why, and what it cost.

## ADR-1 · The engine owns every number; the AI only reads and writes words

**Decision.** Doses, AQI, hours, rankings, savings and alerts come from the pure engine in
`packages/core`. Gemini extracts a profile and explains the plan.
**Why.** A family deciding whether a grandparent walks at dawn needs numbers that are the same
every time and traceable to a source. A model asked "how much does a purifier help?" will
answer confidently and differently each time.
**Cost.** Every behaviour had to be modelled explicitly (schedule, infiltration, sources,
emissions), which is far more code than a prompt. Advice the catalogue does not contain cannot
be given; the coach can only explain what the engine computed.

## ADR-2 · Impacts are computed by running the model twice, never stored

**Decision.** An action is a list of typed effects on a scenario. Its impact is
`model(after) − model(before)` against today's forecast for this household.
**Why.** "A purifier cuts exposure 60%" is false for a family that is out all day and true for a
grandparent at home. Running the model makes the same action worth different amounts to
different families and on different days, and keeps every explanation consistent with the
assumptions in one place.
**Cost.** ~15 what-if runs per plan. Profiling showed 422 µs per plan for a family of four; after
memoising base days (ADR-7) it is 260 µs, which is still well inside one frame.

## ADR-3 · Knowledge as declarative data, evaluated by one function

**Decision.** Actions, alerts, AQI bands and every factor live in `catalog/` as data with
`when` conditions, evaluated by `evaluateCondition`.
**Why.** New advice is a data entry plus an invariant test, not new branching logic. A reviewer
can audit every assumption without reading code.
**Cost.** Conditions can only read fields `deriveContext` exposes; a catalogue test fails if one
reads a field that does not exist, so new facts must be added in two places.

## ADR-4 · The plan is computed in the browser; the server rebuilds it for the AI

**Decision.** The client runs `buildPlan` locally; the coach and question routes rebuild the plan
on the server from the profile and the server's own forecast.
**Why.** Ticking an action must feel instant (~0.26 ms, no network). But the AI must be grounded
in numbers the server computed, not numbers a browser sent, or a tampered request could make the
model "confirm" invented figures.
**Cost.** The engine ships to the browser (an 18 KB gzipped lazy chunk) and runs twice for AI
requests.

## ADR-5 · Number grounding instead of trusting the model's prose

**Decision.** Every number in an AI answer must appear in the facts it was given (rounded
spellings and small counts allowed). Otherwise the answer is replaced or withheld.
**Why.** Schema constraints stop wrong _fields_; they cannot stop a wrong _number inside a
sentence_, which is exactly the harmful case ("dose falls 90%").
**Cost.** Some legitimate phrasings are rejected (a model that computes "about half" as "50%"
fails if 50 is not in the facts). The engine's summary is then shown instead, which is less warm
but never wrong.

## ADR-6 · Open-Meteo (CAMS model) for forecasts, not station data

**Decision.** Hourly PM2.5/PM10 from Open-Meteo's free, keyless air-quality API.
**Why.** It covers every location with an hourly two-day forecast, which a routine needs ("when
is it cleanest today?"). CPCB station feeds are point readings without a forecast and need a key.
**Cost.** A ~11 km model is smoother than a nearby station and can differ from the AQI on the
news. The UI labels it "indicative, not a station reading".

## ADR-7 · Memoise base days after profiling

**Decision.** The sleep/commute/destination skeleton of a day is built once per shape
(where, how long the trip, when they leave) and shared read-only.
**Why.** A CPU profile showed `baseDay` at 39% of engine time: every what-if rebuilt identical
arrays. Memoising cut a family-of-four plan from 422.7 µs to 259.9 µs p50 (−39%) and an
eight-person plan from 852 µs to 506 µs.
**Cost.** A module-level cache in a "pure" package. It is bounded (256 shapes), keyed on every
input that shapes a day, returns read-only arrays, and is covered by tests that fill and clear it.

## ADR-8 · Review before planning

**Decision.** The AI's reading is shown as an ordinary form with every guessed value flagged;
the plan is built only from what the family confirms.
**Why.** A wrong "asthma" or a missed baby changes the safety advice. Families must see and
correct what was assumed.
**Cost.** One more screen between description and plan.

## ADR-9 · Trade-offs are stated, not optimised away

**Decision.** If an action raises someone's exposure or adds CO₂ elsewhere, the explanation
says so; a smog-cutting change that raises exposure is still offered.
**Why.** The problem asks to explain the direct impact of choices. Walking in smog cuts emissions
but raises the walker's dose; an electric heater clears indoor smoke but adds grid CO₂. Hiding
either would mislead.
**Cost.** Some explanations are longer, and the ranking needs a rule for net harm (ADR-2's
`isMeaningful`).

## ADR-10 · Persistence in the browser, validated on read

**Decision.** The confirmed profile, choices and language are saved in `localStorage`,
re-validated with the server's Zod schema when restored.
**Why.** A refresh must not lose the plan. No account means no personal or health data stored on
a server.
**Cost.** One device per plan; no sharing across devices.

## ADR-11 · Rate limit on the proxy-resolved address

**Decision.** `trust proxy` = 1 hop on Cloud Run; limits key on `request.ip`.
**Why.** The left-most `X-Forwarded-For` is client-controlled; keying on it lets anyone reset
their quota. An HTTP test sends forged headers and is still limited.
**Cost.** The limit is per instance, not global; it protects the model quota, not a billing
guarantee.
