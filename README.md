# Kosh: Personal Wealth Calculator

A self-service planner for Indian families. Enter household, monthly money, savings and goals, and see what the goals cost, what the monthly surplus covers, and how retirement and the emergency fund look.

**Privacy:** there is no backend. Everything runs in the browser. A Content Security Policy (`connect-src 'none'`) blocks all network requests after the page loads. There is no analytics or tracking, and fonts are self-hosted. Plans are kept only if the user turns on "Save on this device" (localStorage) or downloads a backup file (optionally AES-GCM encrypted).

**Not advice:** Kosh is a calculator. It shows figures, not recommendations.

## Version 0.1 scope
- Steps 1–4: household, monthly money, assets and loans (earmarked to goals), goals and retirement
- Step 5: overview (affordability, goals in funding order), retirement projection, emergency fund, editable assumptions
- Step 6: editable backup file (optional password), save on this device

**Open assumption, tax:** all figures are before tax. This is stated in the app and will be decided later.

**Coming soon:** PDF report, stress test, "What if…" changes, life timeline, cash-flow breakdown, tax-aware estimates, partner retirement timeline, offline/installable app.

## Develop
```
npm install
npm run dev      # local dev server
npm test         # engine + backup tests
npm run build    # static build in dist/
```

## Layout
- `src/engine/`: pure calculation model (`calc.ts`), ported from the design prototype and checked against its sample-family results
- `src/storage/`: localStorage, backup export/import, input sanitising
- `src/steps.tsx`, `src/explore.tsx`, `src/App.tsx`: UI (mobile-first)

## Deploy
Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`. In the repo settings, set Pages → Source to **GitHub Actions**.
