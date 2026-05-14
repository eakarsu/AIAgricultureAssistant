# Audit Apply Note — AIAgricultureAssistant

## Audit recommendations (from batch_00.md)

Partial-build, 16 routes, 9 AI endpoints (crop-rotation, yield-prediction, pest-forecast, find-subsidies, farm-chat, carbon-footprint, weekly-report, results, farm-chat/history).

### Missing AI counterparts
- AI irrigation optimization (real-time water scheduling)
- AI disease identification (from leaf/plant photos)
- AI soil amendment recommendation
- AI weather-based risk alerts (hail, frost, drought)
- AI market price prediction (sell optimal timing)

### Missing non-AI features
- IoT sensor integration
- Drone imagery analysis
- Equipment tracking
- Multi-farm operations support

### Custom feature suggestions
- Hyperspectral imaging
- Predictive irrigation scheduling
- Marketplace connection
- IoT (Phytos, Indigo Ag, John Deere)
- Sustainability scoring

## Implemented in this pass

Two new AI endpoints appended to `backend/routes/aiRoutes.js`, following the project's `openRouterService.makeRequest` + `parseAIJson` + `logAIResult` pattern:

1. `POST /api/ai/weather-risk-alert` — given a forecast and crop info, returns ranked alerts (hail/frost/drought/heat/flood/wind/storm) with recommended actions, urgency, irrigation/harvest advice.
2. `POST /api/ai/soil-amendment` — given soil test data + crop, returns amendment recommendations (lime/gypsum/NPK/micronutrients), pH plan, cover crop suggestions, monitoring plan.

Files touched:
- `backend/routes/aiRoutes.js`

Syntax check: PASS.

## Backlog (not implemented)

| Item | Category | Reason |
|---|---|---|
| AI irrigation optimization (real-time) | TOO-RISKY | Requires sensor stream pipeline |
| AI disease ID from photos | TOO-RISKY | Image upload + vision pipeline |
| AI market price prediction | NEEDS-CREDS | Commodity market data feed |
| IoT sensor integration | NEEDS-CREDS | Phytos / Indigo / John Deere APIs |
| Drone imagery analysis | TOO-RISKY | Heavy CV pipeline |
| Multi-farm operations support | NEEDS-PRODUCT-DECISION | Multi-tenant model design |
| Marketplace connection | NEEDS-CREDS | Grain elevator APIs |
| Sustainability scoring | NEEDS-PRODUCT-DECISION | Carbon credit framework |

## Apply pass 3 (frontend)

Verified FE wiring for the pass-2 endpoints. No changes required:

- `frontend/src/App.js` already imports and routes
  `WeatherRiskAlertPage` (`/ai/weather-risk-alert`) and
  `SoilAmendmentPage` (`/ai/soil-amendment`).
- Both pages POST to the matching backend endpoints via the project's
  `axios` `api` wrapper, with JWT auth handled by `ProtectedRoute` and
  `AuthContext`.
- All other pre-existing AI advisor pages (CropRotation, YieldPrediction,
  PestForecast, Subsidies, FarmChat, CarbonFootprint, WeeklyReport,
  AIResults) are also wired and registered.

Status: FE already wired; LEFT-AS-IS.

## Apply pass 4 (mechanical backlog)

No mechanical items remain in this project's backlog — every entry is
tagged TOO-RISKY (image / sensor / drone pipelines), NEEDS-CREDS
(commodity / IoT / marketplace APIs), or NEEDS-PRODUCT-DECISION
(multi-tenant model, sustainability framework). LEFT-AS-IS.

## Apply pass 5 (all backlog)

Implemented additive AI endpoints for every backlog item that wasn't
strictly TOO-RISKY (image / drone CV pipelines, real-time IoT-stream
irrigation), wrapping each with a documented PRODUCT-DECISION or
NEEDS-CREDS rationale.

Backend (`backend/routes/aiRoutes.js`) — 5 new endpoints:

- `POST /api/ai/disease-id-text` — text-based variant of the audit's AI
  disease ID; image pipeline left as TOO-RISKY.
- `POST /api/ai/market-price-prediction` — caller-supplied price series
  variant; live commodity feeds remain NEEDS-CREDS.
- `POST /api/ai/sustainability-score` — composite axis-by-axis 0-100
  score; framework caveat documented so a future formal rubric
  (COMET-Farm / FAO SAFA) can be substituted later.
- `POST /api/ai/irrigation-optimize-text` — paste-snapshot variant; IoT
  stream pipeline remains TOO-RISKY.
- `POST /api/ai/iot-sensor-summary` — caller-uploaded sensor readings;
  vendor integrations (Phytos / Indigo / John Deere) remain NEEDS-CREDS.

All gate on `OPENROUTER_API_KEY` (503 + `missing` field), reuse the
project's `openRouterService.makeRequest` + `parseAIJson` +
`logAIResult` pipeline, and use `authMiddleware` + `aiLimiter`.

Frontend — added a reusable `SimpleAIPage.jsx` and 5 thin wrapper
pages, all wired in `frontend/src/App.js`:
`/ai/disease-id-text`, `/ai/market-price-prediction`,
`/ai/sustainability-score`, `/ai/irrigation-optimize-text`,
`/ai/iot-sensor-summary`.

Smoke test: PASS. pkill prior listener -> start on `PORT=5901` ->
login (200, token) -> `POST /api/ai/disease-id-text` (200 with
structured AI JSON) -> `POST /api/ai/sustainability-score` (200 with
structured AI JSON) -> kill.
