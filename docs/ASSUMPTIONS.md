# Assumptions and sources

## Air data

| Assumption                                                                                                                                                            | Source / reason                                                                                                                                                           |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NAQI breakpoints for PM2.5, PM10, NO₂, O₃ (8 h), SO₂, CO (8 h, mg/m³), NH₃                                                                                            | CPCB National Air Quality Index (2014). The open top band of each uses the upper concentration CPCB's calculator caps at.                                                 |
| NAQI needs at least three pollutants, one of them PM2.5 or PM10                                                                                                       | CPCB's rule; with fewer, the particulate index is used instead                                                                                                            |
| data.gov.in "Real time Air Quality Index from various locations" publishes per-pollutant **sub-indices**, refreshed hourly, timestamps in IST (`DD-MM-YYYY HH:MM:SS`) | Values such as CO = 28 are only plausible as an index. Converted back to concentrations so the engine treats every source alike; the round trip returns CPCB's own index. |
| WAQI `iaqi` values are US EPA sub-indices, 2016 PM2.5 table                                                                                                           | WAQI's documentation; converted to concentrations, then NAQI                                                                                                              |
| A station describes a family's air within 25 km and 3 hours                                                                                                           | Typical CPCB spacing in cities and its publishing delay; beyond that the report says it is forecast-based                                                                 |
| Prefer CPCB over a WAQI station less than 2 km closer                                                                                                                 | WAQI often republishes CPCB stations; CPCB is the official monitor                                                                                                        |
| Forecast correction: station ÷ model, clamped to ⅓–3×, fading linearly to 1 over 24 h                                                                                 | CAMS reproduces the diurnal shape of north Indian winter smog but its level is often off by a factor of two                                                               |
| Missing PM10 in the model ≈ 1.6 × PM2.5                                                                                                                               | Typical winter ratio in the Indo-Gangetic plain                                                                                                                           |

## Advice

| Assumption                                                                                                                                                                           | Reason                                                                                                                                               |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| Highest category that is fine: light or moderate activity — Moderate; vigorous — Satisfactory                                                                                        | CPCB health statements: discomfort for sensitive groups from Moderate, for most people on prolonged exposure from Poor                               |
| A car trip is fine up to Poor for a healthy adult, with windows up and the AC on recirculate                                                                                         | A closed cabin on recirculation keeps PM2.5 well below the road's; the risk is at stops and in queues, hence a mask for stops and avoiding rush hour |
| One category lower for infants, children, older adults, pregnancy and anyone with a listed condition                                                                                 | WHO and CPCB name these groups as most at risk                                                                                                       |
| One more category is acceptable with precautions                                                                                                                                     | Short, gentle activity away from traffic with an N95 cuts dose substantially                                                                         |
| “Tomorrow” with no time is planned at tomorrow's cleanest daylight window; a time already past on the day asked moves to its next occurrence                                         | People asking about tomorrow want its best time; asking at 10 am about a 6:30 walk “today” means the next one                                        |
| Morning is 05:00–11:00, afternoon 12:00–16:00, evening 17:00–20:00, night 21:00–23:00; a part of the day is planned at its cleanest hour, compared with that day's cleanest daylight | How people say “tomorrow morning” or “shaam ko”; the answer is about that part of the day, with a better time pointed out                            |
| Outdoor windows offered only 06:00–20:00                                                                                                                                             | Families do not plan walks at night, and night air is usually the worst                                                                              |
| N95 advice from Poor (Moderate for sensitive people); cloth and surgical masks are not recommended                                                                                   | Filtration evidence for PM2.5                                                                                                                        |

The thresholds rank options; they are not a medical judgement, and the app says so.

## Impact estimates

Every figure below is labelled an estimate wherever the app shows it. They compare choices; they
are not measurements of one family's car or lungs.

| Assumption                                                                                                                                      | Reason                                                                                                                      |
| :---------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| PM2.5 breathed in = hourly PM2.5 × air breathed × minutes; an adult breathes 0.72, 1.56 and 3 m³ an hour at light, moderate and vigorous effort | US EPA Exposure Factors Handbook (2011), chapter 6, adult rates for light, moderate and high activity                       |
| "Less PM2.5 at the cleaner hour" is shown only when it is at least 5% less                                                                      | Smaller differences are within the forecast's error and would overstate the benefit                                         |
| A petrol car emits 150 g of CO₂ and 25 mg of PM2.5 (exhaust, brakes, tyres, road dust) per km; the metro 20 g and 1 mg per passenger-km         | Indicative values from ARAI emission factors and TERI city inventories for Indian cities                                    |
| A trip's distance is its minutes at 22 km/h                                                                                                     | Typical peak-hour car speed in Delhi and other large Indian cities; families tell us how long a trip takes, rarely how far  |
| Sharing the school run between two families halves each family's driving                                                                        | Two families in one car instead of two                                                                                      |
| An idling petrol car burns about 0.8 litres an hour, at 2.31 kg of CO₂ a litre                                                                  | Typical small-car idle consumption, and the standard CO₂ content of petrol                                                  |
| Burning, heating and indoor-air steps carry no number                                                                                           | The app does not know how much a household burns or cooks, so it explains why each step helps instead of inventing a figure |

## Alerts

| Assumption                                           | Reason                                                              |
| :--------------------------------------------------- | :------------------------------------------------------------------ |
| Default threshold Very poor, quiet hours 22:00–07:00 | Alert fatigue: in a Delhi winter Poor is most days                  |
| No repeat within 6 hours unless a category worse     | Enough to cover a morning and an evening decision                   |
| Checked every 30 minutes                             | Stations publish hourly; faster checks would only repeat themselves |
