<p align="center">
  <a href="https://jacinthpaul.github.io/kosh/"><img src="docs/banner.png" alt="Kosh — Personal Wealth Calculator" width="880"></a>
</p>

<p align="center">
  <a href="https://jacinthpaul.github.io/kosh/"><b>Try it live</b></a> •
  <a href="#features">Features</a> •
  <a href="docs/sample-report.pdf">Sample report</a> •
  <a href="#privacy">Privacy</a> •
  <a href="#coming-soon">Coming soon</a> •
  <a href="#develop">Develop</a> •
  <a href="LICENSE">License</a>
</p>

<p align="center">
  <a href="https://github.com/jacinthpaul/kosh/actions/workflows/deploy.yml"><img src="https://github.com/jacinthpaul/kosh/actions/workflows/deploy.yml/badge.svg" alt="Deploy"></a>
  <img src="https://img.shields.io/badge/version-v0.4-2E5C3E" alt="Version v0.4">
  <img src="https://img.shields.io/badge/tests-47%20passing-2E5C3E" alt="Tests: 47 passing">
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

**Kosh** is a self-service wealth calculator for Indian families. Enter your household, monthly money, savings and goals. Kosh shows your monthly balance, what each goal will cost, how much more you need, what’s missing, and the options you have. There's no account, no bank connection, and your numbers never leave your device.

<p align="center">
  <img src="docs/screen-welcome.png" alt="Welcome screen" width="260">
  &nbsp;
  <img src="docs/screen-overview.png" alt="Can the surplus cover your goals?" width="260">
  &nbsp;
  <img src="docs/screen-retirement.png" alt="Retirement projection" width="260">
</p>

## Features

| Step | What you do |
|---|---|
| **1 · You and your goals** | Family, when you’d like to retire and what you’ll need, plus goals like education, a home or travel |
| **2 · Monthly money** | Income, regular spends, EMIs, monthly investments (SIPs, stocks, crypto, EPF, NPS, PPF…) linked to goals, and health and life insurance. Ends with your **monthly balance** |
| **3 · Yearly and one-time** | Bonuses and yearly spends like school fees, plus one-off income (a maturity, a sale) or spends in a given year |
| **4 · What I have and owe** | Savings, investments, property and loans at today’s value, each linked to what it’s for |
| **5 · Your plan** | **How much more is needed** each month, **what’s missing** (shortfalls, emergency fund, insurance, unlinked money), **options to explore** with their effect on the gap, and **your current mix** of equity, debt, gold and property |
| **6 · Download and save** | A **PDF report** (A4, 7 sections) that explains every number in plain words, with an option to hide names; plus an editable backup file (optionally password-encrypted), or save on this device |

**Grounded in practice:** the model follows the NSE Academy (NCFM) Wealth Management module wherever it applies:
- Goals up to 3 years away assume a safer return, and goals 7+ years away the full return.
- EMIs count toward goals once the loan ends.
- Surplus savings on one goal carry forward to the next.
- The emergency fund covers needs, not wants.

Its worked examples are reproduced exactly in the tests.

**Colour code:** 🔵 blue is today’s money, 🟣 plum is future money after price rises or growth, used the same way on every screen.

Try it with the built-in **sample family** to see a complete plan in one click, or see a **[sample PDF report](docs/sample-report.pdf)** for that family.

## Privacy

- **No backend.** All calculations run in your browser.
- **Nothing is collected or measured.** No analytics, no tracking, no error reporting. Fonts are self-hosted.
- **Enforced, not just promised.** The page's Content Security Policy blocks every request to a server after the page loads. The only allowances are `connect-src data:` and `'wasm-unsafe-eval'`, which let the PDF engine load its built-in WebAssembly. The PDF is generated on your device, with fonts embedded.
- **You decide what's kept.** Plans are saved only if you turn on *Save on this device*, or download a backup file (AES-GCM 256, PBKDF2-SHA256 with 200k iterations when you set a password).

> [!NOTE]
> **Not advice.** Kosh is a calculator that helps you visualise your finances so you can plan better. It shows figures, not recommendations, and does not provide investment, tax or financial advice. Figures are estimates and may contain errors; Kosh and its makers accept no responsibility or liability for any loss or decision made using it.

> [!IMPORTANT]
> **Open assumption: tax.** All figures are **before tax**. Tax on interest, capital gains and withdrawals is not modelled yet. This is shown clearly in the app and is still to be decided.

## Coming soon

- [ ] Stress test: lower returns, higher inflation, lower income, retiring earlier
- [ ] Interactive “What if…” sliders to combine several options
- [ ] Life timeline showing when goals arrive and family ages
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
