# Model assumptions and sources

Vayu Mitra computes every number it shows. This page lists every constant those numbers rest
on, where it lives in the code, and where it comes from. All of them are **declarative data**
in [`packages/core/src/catalog/`](../packages/core/src/catalog/), covered by invariant tests in
[`catalog.test.ts`](../packages/core/src/catalog/catalog.test.ts), so a reviewer can challenge a
value in one place and every screen follows.

The figures are **indicative planning values, not measurements**. The UI says so beside every
modelled number ("modelled estimates", "indicative, not a station reading").

---

## Air quality

| Item                      | Value                                                                                                   | Source                                                              | Code                                                        |
| :------------------------ | :------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------ | :---------------------------------------------------------- |
| AQI scale                 | India's National Air Quality Index, PM2.5 and PM10 sub-indices, worse of the two                        | CPCB, _National Air Quality Index_ (2014)                           | [`aqi-bands.ts`](../packages/core/src/catalog/aqi-bands.ts) |
| PM2.5 bands (24 h, µg/m³) | 30 · 60 · 90 · 120 · 250 · 380                                                                          | CPCB; the open top band uses the upper value CPCB's calculator uses | same                                                        |
| PM10 bands (24 h, µg/m³)  | 50 · 100 · 250 · 350 · 430 · 510                                                                        | CPCB                                                                | same                                                        |
| WHO guideline             | 15 µg/m³ (24-hour PM2.5)                                                                                | WHO Global Air Quality Guidelines (2021)                            | same                                                        |
| Cigarette equivalence     | 22 µg/m³ for 24 h ≈ 1 cigarette                                                                         | Berkeley Earth, Muller & Muller (2015)                              | same                                                        |
| Forecast                  | Hourly PM2.5 and PM10 from Open-Meteo's air-quality API (Copernicus CAMS global model, ~11 km in India) | open-meteo.com                                                      | [`open-meteo.ts`](../packages/server/src/air/open-meteo.ts) |
| Missing PM10              | 1.6 × PM2.5                                                                                             | Typical winter PM10/PM2.5 ratio for north Indian cities             | same                                                        |

## Personal exposure model

A typical weekday is a grid of 96 quarter-hours. Each quarter is spent somewhere (asleep, at
home, commuting, at school or work, exercising); the concentration breathed there times the
breathing rate for that activity gives the dose. See
[`build-schedule.ts`](../packages/core/src/exposure/build-schedule.ts) and
[`model-exposure.ts`](../packages/core/src/exposure/model-exposure.ts).

| Item                                        | Value                                                                                                                                                                               | Source                                                                                                                           | Code                                                                                                                              |
| :------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| Breathing rates (m³/h)                      | Adult: sleep 0.3 · rest 0.5 · light 1.1 · moderate 1.9 · vigorous 2.9; children and seniors scaled                                                                                  | US EPA _Exposure Factors Handbook_, ch. 6 (rounded)                                                                              | [`exposure-constants.ts`](../packages/core/src/catalog/exposure-constants.ts)                                                     |
| Infiltration (indoor/outdoor, windows shut) | Leaky 0.8 · average 0.6 · sealed 0.4                                                                                                                                                | Measured I/O ratios in Indian homes in winter range 0.4–0.9                                                                      | same                                                                                                                              |
| Windows open                                | 0.95 of outdoor                                                                                                                                                                     | Near-complete air exchange                                                                                                       | same                                                                                                                              |
| School or office                            | 0.7 of outdoor                                                                                                                                                                      | Unfiltered non-residential buildings                                                                                             | same                                                                                                                              |
| Purifier                                    | HEPA: 60% removal in a closed room; DIY box-fan filter: 45%; an owned purifier as usually run: 50%; 30% of that with windows open                                                   | CADR sizing guidance; Corsi–Rosenthal box studies                                                                                | [`indoor.ts`](../packages/core/src/catalog/actions/indoor.ts), [`from-profile.ts`](../packages/core/src/scenario/from-profile.ts) |
| N95 outdoors                                | 60% reduction (fit leakage assumed), never applied to babies                                                                                                                        | Real-world fit studies (filtration 95%, fit lower)                                                                               | [`routine.ts`](../packages/core/src/catalog/actions/routine.ts)                                                                   |
| Car recirculation                           | 50% of in-cabin exposure                                                                                                                                                            | In-vehicle PM2.5 studies with recirculation                                                                                      | same                                                                                                                              |
| In-transit exposure                         | Walk/cycle 1.2 · two-wheeler 1.3 · auto 1.5 · car 0.9 · bus 1.3 · metro 0.6 × background                                                                                            | Delhi on-road studies (Goel et al. 2015; Kumar et al. 2018)                                                                      | [`commute-modes.ts`](../packages/core/src/catalog/commute-modes.ts)                                                               |
| Commute speeds                              | Walk 5 · cycle 12 · two-wheeler 25 · auto 20 · car 22 · bus 15 · metro 30 km/h                                                                                                      | Typical urban peak-hour speeds                                                                                                   | same                                                                                                                              |
| Indoor sources (added µg/m³ while in use)   | LPG 40 · piped gas 35 · induction 10 · chulha 300 · kerosene stove 120 · coal/wood heater 120 · kerosene heater 60 · incense 80 · mosquito coil 50 · indoor smoking 35 · candles 10 | WHO household air pollution guidelines; Balakrishnan et al. (Indian kitchens); Lee & Wang (incense); Liu et al. (mosquito coils) | [`household-sources.ts`](../packages/core/src/catalog/household-sources.ts)                                                       |
| Hours of use                                | Meals 7–8, 13, 19–20; heaters 18:00–06:00; incense 6–7, 18–19; coils through the night                                                                                              | Common Indian household routines                                                                                                 | same                                                                                                                              |

## Emissions model

Weekly PM2.5 (what feeds the local smog) and CO₂ (the climate side of the same choice) in
[`estimate-emissions.ts`](../packages/core/src/emissions/estimate-emissions.ts).

| Item                                                               | Value                                                                                                                                                                                                       | Source                                                              |
| :----------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------ |
| Vehicles (per vehicle-km for private, per passenger-km for shared) | CO₂ g/km: two-wheeler 45 · auto 60 · petrol car 150 · diesel 140 · CNG 120 · EV 90 (India grid) · bus 25 · metro 20. PM2.5 mg/km (exhaust + brake, tyre and road dust): 25 · 20 · 25 · 60 · 20 · 15 · 8 · 1 | ARAI emission factors; TERI and IIT Kanpur Delhi source inventories |
| Cooking per day                                                    | LPG 1.4 kg CO₂, 0.3 g PM2.5 · chulha 0.6 kg (non-renewable share), 40 g PM2.5 · induction 1.1 kg via grid, 0 g                                                                                              | WHO; India grid factor ~0.71 kg CO₂/kWh (CEA)                       |
| Heating per day                                                    | Coal/wood 6 kg CO₂, 25 g PM2.5 · electric 8.5 kg CO₂ via grid (2 kW × 6 h), 0 g                                                                                                                             | Same sources                                                        |
| Waste burning                                                      | 2 kg a week, 8 g PM2.5 and 1.5 kg CO₂ per kg                                                                                                                                                                | Open burning emission factors (Wiedinmyer et al.)                   |
| Diesel generator                                                   | 0.8 kg CO₂ and 1 g PM2.5 per running hour                                                                                                                                                                   | Small DG set factors                                                |
| Smog season                                                        | 16 weeks (mid-October to mid-February)                                                                                                                                                                      | North Indian winter pollution season                                |

Electric heating and induction cooking can **add** CO₂ on India's grid even as they remove local
smoke. The engine reports this as a trade-off sentence rather than hiding it.

## Ranking and vulnerability

| Item                    | Value                                                                                                                                                          | Code                                                                        |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| Vulnerability weights   | Infant 2 · child 1.6 · teen 1.2 · adult 1 · senior 1.5; plus asthma 0.8 · COPD 1 · heart disease 0.8 · pregnancy 0.8 · diabetes 0.3 · allergies 0.2            | [`vulnerability.ts`](../packages/core/src/catalog/vulnerability.ts)         |
| Score                   | 1 point per % of weighted exposure cut + 1 per g/week of PM2.5 (capped at 30) + 0.1 per kg/week of CO₂, ÷ effort (1 · 1.3 · 1.8) × cost (1 · 1.05 · 1.2 · 1.4) | [`ranking.ts`](../packages/core/src/catalog/ranking.ts)                     |
| Shown only if           | ≥ 1% family exposure cut, or ≥ 2% for one member, or ≥ 0.5 g/week PM2.5 kept out — and not leaving the family breathing more unless it cuts smog               | [`assess-actions.ts`](../packages/core/src/actions/assess-actions.ts)       |
| Starting plan           | Best action of each category (routine, indoor, sustainable), then by score; three in all; never two alternatives                                               | same                                                                        |
| Community participation | No-burning rule 30% · carpool board 20% · clean-air room 10% · reporting 15% of homes                                                                          | [`community-actions.ts`](../packages/core/src/catalog/community-actions.ts) |

The weights only **order** recommendations. They are not a clinical risk score and are never
shown as one.
