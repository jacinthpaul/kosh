<p align="center">
  <a href="https://jacinthpaul.github.io/kosh/"><img src="docs/banner.png" alt="Kosh — Personal Wealth Calculator" width="880"></a>
</p>

<p align="center">
  <a href="https://jacinthpaul.github.io/kosh/"><b>Try it live</b></a> •
  <a href="#features">Features</a> •
  <a href="#privacy">Privacy</a> •
  <a href="#coming-soon">Coming soon</a> •
  <a href="#develop">Develop</a> •
  <a href="LICENSE">License</a>
</p>

<p align="center">
  <a href="https://github.com/jacinthpaul/kosh/actions/workflows/deploy.yml"><img src="https://github.com/jacinthpaul/kosh/actions/workflows/deploy.yml/badge.svg" alt="Deploy"></a>
  <img src="https://img.shields.io/badge/version-v0.1-2E5C3E" alt="Version v0.1">
  <img src="https://img.shields.io/badge/tests-25%20passing-2E5C3E" alt="Tests: 25 passing">
  <img src="https://img.shields.io/badge/tracking-none-2E5C3E" alt="Tracking: none">
  <img src="https://img.shields.io/badge/data-stays%20in%20your%20browser-2E5C3E" alt="Data stays in your browser">
  <img src="https://img.shields.io/badge/mobile-first-C98A1B" alt="Mobile first">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-C98A1B" alt="License: MIT"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-1E2A22?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-strict-1E2A22?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-8-1E2A22?logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/hosted%20on-GitHub%20Pages-1E2A22?logo=github" alt="GitHub Pages">
</p>

---

**Kosh** is a self-service wealth calculator for Indian families. Enter your household, monthly money, savings and goals. Kosh shows what each goal will cost, what your monthly surplus can cover, and how your retirement and emergency fund look. There's no account, no bank connection, and your numbers never leave your device.

<p align="center">
  <img src="docs/screen-welcome.png" alt="Welcome screen" width="260">
  &nbsp;
  <img src="docs/screen-overview.png" alt="Can the surplus cover your goals?" width="260">
  &nbsp;
  <img src="docs/screen-retirement.png" alt="Retirement projection" width="260">
</p>

## Features

| | |
|---|---|
| **1 · My household** | Ages, partner, children, parents you support, and your retirement age |
| **2 · My monthly money** | Take-home income, regular expenses, EMIs, once-a-year costs |
| **3 · What I own and owe** | Savings, investments, property and loans. Say what each one is for so nothing is counted twice |
| **4 · What I want to achieve** | Goals in today’s prices with future cost and the monthly amount each one needs |
| **5 · Explore my plan** | Can the surplus cover your goals? Goals in funding order, retirement projection, emergency fund, editable assumptions |
| **6 · Save and revisit** | Download an editable backup file (optionally password-encrypted), or save on this device |

Try it with the built-in **sample family** to see a complete plan in one click.

## Privacy

- **No backend.** All calculations run in your browser.
- **Nothing is collected or measured.** No analytics, no tracking, no error reporting. Fonts are self-hosted.
- **Enforced, not just promised.** The page's Content Security Policy (`connect-src 'none'`) blocks all network requests after the page loads.
- **You decide what's kept.** Plans are saved only if you turn on *Save on this device*, or download a backup file (AES-GCM 256, PBKDF2-SHA256 with 200k iterations when you set a password).

> [!NOTE]
> **Not advice.** Kosh is a calculator. It shows figures, not recommendations, and does not provide investment, tax or financial advice.

> [!IMPORTANT]
> **Open assumption: tax.** All figures are **before tax**. Tax on interest, capital gains and withdrawals is not modelled yet. This is shown clearly in the app and is still to be decided.

## Coming soon

- [ ] Downloadable A4 PDF report, with an option to hide names
- [ ] Stress test: lower returns, higher inflation, lower income, retiring earlier
- [ ] “What if…” changes: move a goal date, adjust a budget, raise investments each year
- [ ] Life timeline showing when goals arrive and family ages
- [ ] Where each month’s money goes, month by month and year by year
- [ ] Tax-aware estimates
- [ ] Separate retirement timeline for a partner
- [ ] Install on your phone and use offline

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # engine + backup tests
npm run build    # static build in dist/
```

**Project layout**

| Path | What's there |
|---|---|
| `src/engine/` | Pure calculation model (`calc.ts`), ported from the design prototype and checked against its sample-family results |
| `src/storage/` | Save on this device, backup export/import, checks and clean-up for loaded files |
| `src/steps.tsx` · `src/explore.tsx` · `src/App.tsx` | Mobile-first UI |

**Deploy:** every push to `main` runs the tests, builds, and deploys to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## License

[MIT](LICENSE)
