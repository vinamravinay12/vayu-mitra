# How the AI is used

Gemini does two things it is good at: **reading** what a family says, and **putting facts into
kind, plain words** in their language. It never decides anything about the air or anyone's health.

## The two calls

| Call           | Input                                                                                                                                          | Output (schema-constrained JSON)                                                                                                                                                                                                                         | Temperature |
| :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------- |
| **understand** | the message, the last 8 turns, what is remembered (with ids)                                                                                   | memory changes (remember a person, routine or home feature; forget an id), the activity asked about, the person, the time, the day (today or tomorrow), on/off topic; a follow-up such as “and tomorrow?” keeps the earlier question's activity and time | 0           |
| **reply**      | the message, the last 8 turns, and the engine's facts: the air in words, the verdict in words, what is remembered and what was just remembered | `{ reply }`, 2–5 sentences in the message's language, answering what is asked now and not repeating earlier turns                                                                                                                                        | 0.3         |

An independent **guard** call classifies the message as safe or manipulation, in parallel with
`understand` and the air report, so screening adds no latency.

## What the engine does between them

1. Applies the proposed memory changes itself, after checking each against strict schemas and
   closed vocabularies; anything that does not fit is dropped.
2. Reads the intent: the AI's activity, person, time and day take precedence, then keywords
   (English and common Hinglish, including “kal” and “aaj”), times in the message, the question
   a follow-up refers to, and remembered routines.
3. Decides the advice: the planned hour, the cleanest daylight window, the verdict, the
   precautions, from intensity and who is sensitive.
4. Writes its own sentence for the same facts, used whenever the AI cannot be.

## Guardrails

- **Grounding.** Every number in the reply must appear in the facts (in any rounding), apart
  from small counts; links, contact details and instruction-like text are rejected too. A
  rejected reply is replaced with the engine's sentence and logged.
- **Fencing.** User text and history are wrapped in markers the model is told are data, and
  markers smuggled into the text are stripped first.
- **Fail-safe.** If any call fails or answers off-schema, the turn still completes: no
  understanding means keyword intent and nothing remembered this turn; no reply means the engine's
  sentence. The response says which (`source: ai | engine`).
- **Visible memory.** Every remembered fact is shown as a chip with Edit and Forget, so a wrong
  reading is seen and fixed at once.

## Models

`gemini-3.5-flash-lite` first, then `gemini-flash-lite-latest` and `gemini-3.1-flash-lite`,
10-second timeout per model, two attempts on 5xx, minimal thinking, token ceilings sized to each
schema (guard 120, understand 900, reply 600). Configurable with `GEMINI_MODELS`.

## Without a key

The app still works end to end: replies come from the engine's sentences and activities are read
by keyword, but nothing is remembered from conversation (chips can still be edited). Production
refuses to start without a key.
