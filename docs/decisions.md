# Decision records

Each decision with what it costs.

## 1. Conversation instead of forms

**Decided:** families talk; what they say becomes editable memory chips. **Why:** the earlier
build asked for a household description and then a review form, and the form was where people
stopped. A chat lets someone start with one question and add detail only when it matters.
**Cost:** understanding needs a model call per message, and a misreading is possible, so every
remembered fact is shown as a chip with Edit and Forget.

## 2. The engine decides, the model words it

**Decided:** verdicts, windows, thresholds and precautions are computed by tested code; Gemini
only reads messages and phrases the engine's facts, and a reply with any unsupported number is
replaced by the engine's sentence. **Why:** advice about someone's lungs must be checkable and
the same tomorrow as today. **Cost:** replies are less free-ranging than a pure chatbot's; two
model calls per turn instead of one.

## 3. Official stations for "now", anchored forecast for later

**Decided:** the nearest fresh CPCB station (data.gov.in), else WAQI, for the current reading;
the CAMS forecast scaled to agree with it and fading back to the model over 24 hours. **Why:**
families compare the app with the CPCB number they see on the news; global models get the shape
of a Delhi day right and the level often wrong by half or double. **Cost:** two more upstream
feeds and keys; readings can be an hour or two old, so the app shows the station, distance and time.

## 4. Everything on India's scale

**Decided:** CPCB values are NAQI sub-indices, converted back to concentrations; WAQI values are
US EPA indices, also converted to concentrations; the engine then computes NAQI. **Why:** an EPA
180 is "poor" in NAQI terms, not "moderate"; showing it raw would mislead. **Cost:** conversion
tables to maintain (WAQI documents the 2016 EPA PM2.5 table; that is the one used).

## 5. Firebase for sign-in, storage and push

**Decided:** Google sign-in, one Firestore document per family, FCM by Firebase Installation ID
(the SDK's current API; registration tokens are deprecated), a 40-line service worker with no
Firebase code. **Why:** memory and alerts need an identity; Firebase gives all three with no
servers to run and works on Android Chrome, where most of the audience is. **Cost:** a Google
account is required in production; ~54 KB of Firebase JS, loaded only when sign-in is on.

## 6. The server alone touches Firestore

**Decided:** the browser calls our API; only the server, with its service account, reads and
writes Firestore; client access is denied by rules. **Why:** one place validates every record
and enforces isolation, and the rules cannot be misconfigured into a leak. **Cost:** every read
goes through Cloud Run rather than straight to Firestore.

## 7. Alerts from Cloud Scheduler with OIDC

**Decided:** a scheduled POST every 30 minutes to a route that answers 404 unless the request
carries a Google-signed token from the scheduler's own service account. **Why:** no always-on
worker, no shared secret to rotate or leak. **Cost:** up to 30 minutes between the air turning
and the alert; checks run whether or not anything changed.

## 8. The conversation is not stored

**Decided:** only the chips, the place and alert settings are kept; the transcript stays in the
tab. **Why:** families mention health; the least data is the safest data, and deletion is total.
**Cost:** reloading the page clears the conversation (memory remains).

## 9. Lazy first paint

**Decided:** the start-up config is validated by hand; the signed-in screen (engine, Zod) and
Firebase load after the first paint. **Why:** first-load JavaScript fell from 106 KB to 72 KB
gzipped on the phones most families use. **Cost:** one hand-written validator to keep in step
with the server's config route (it has its own tests).
