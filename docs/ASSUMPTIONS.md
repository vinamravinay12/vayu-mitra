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

| Assumption                                                                                           | Reason                                                                                                                 |
| :--------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| Highest category that is fine: light or moderate activity — Moderate; vigorous — Satisfactory        | CPCB health statements: discomfort for sensitive groups from Moderate, for most people on prolonged exposure from Poor |
| One category lower for infants, children, older adults, pregnancy and anyone with a listed condition | WHO and CPCB name these groups as most at risk                                                                         |
| One more category is acceptable with precautions                                                     | Short, gentle activity away from traffic with an N95 cuts dose substantially                                           |
| Outdoor windows offered only 06:00–20:00                                                             | Families do not plan walks at night, and night air is usually the worst                                                |
| N95 advice from Poor (Moderate for sensitive people); cloth and surgical masks are not recommended   | Filtration evidence for PM2.5                                                                                          |

The thresholds rank options; they are not a medical judgement, and the app says so.

## Alerts

| Assumption                                           | Reason                                                              |
| :--------------------------------------------------- | :------------------------------------------------------------------ |
| Default threshold Very poor, quiet hours 22:00–07:00 | Alert fatigue: in a Delhi winter Poor is most days                  |
| No repeat within 6 hours unless a category worse     | Enough to cover a morning and an evening decision                   |
| Checked every 30 minutes                             | Stations publish hourly; faster checks would only repeat themselves |
