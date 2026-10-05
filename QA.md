# Release validation

Validated on 2026-10-05.

- `npm run build` produces Vite production output successfully.
- All 16 place records reference existing local photographs; all 7 daily routes reference valid place IDs.
- Desktop visual review at 1440 × 1000 and mobile review at 390 × 844.
- No horizontal page overflow at mobile width.
- Search for 伏见 returns Fushimi Inari; selecting the result opens its details.
- Favorites survive reload via localStorage; saved-place drawer and removal controls work.
- Food map filter displays five food locations; clicking Ippodo updates the detail panel.
- Mobile map point selection updates the selected place; category switching works.
- Three-, five-, and seven-day route navigation renders the appropriate day count.
- Seven days × three people × ¥17,000 = ¥357,000 in the budget estimator.
- Itinerary text download contains the selected seven-day plan and official-site reminder.
- Departure checklist updates and saves its state.
- Three.js model renders in a WebGL canvas; model resources load on demand.
- Production custom domain responds over HTTPS with HTTP 200.

The map, model, walking distances, and budgets are explicitly illustrative. Information requiring fresh confirmation links to official sources. WebGL availability depends on the visitor's device/browser; text information remains available without it.
