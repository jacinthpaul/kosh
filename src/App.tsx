import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { calc, missingItems, type CalcResult } from './engine/calc';
import { blank, sample } from './engine/data';
import { cmp, inr } from './engine/format';
import type { Plan } from './engine/types';
import { Explore, type Tab } from './explore';
import { HaveOwe, Monthly, Yearly, YouAndGoals } from './steps';
import { clearLocal, decryptBackup, exportBackup, loadLocal, parseBackup, saveLocal, type ParsedFile } from './storage/storage';
import { Field, Sheet, Toggle } from './ui';

const STEPS: [string, string][] = [
  ['You and your goals', 'Family, retirement, goals'], ['Monthly money', 'Income, spends, investments, insurance'],
  ['Yearly and one-time', 'Bonuses, fees, one-off items'], ['What I have and owe', 'Savings, property, loans'],
  ['Your plan', 'What’s needed and options'], ['Save and revisit', 'Editable backup file'],
];
const HEAD: [string, string][] = [
  ['What are you planning for?', 'Start with your family and goals: when you’d like to retire, what you’ll need, and what else matters. Approximate figures are fine.'],
  ['What comes in and goes out each month?', 'Use take-home pay. Add regular spends, EMIs, monthly investments like SIPs, EPF or crypto, and insurance premiums.'],
  ['What happens once a year, or just once?', 'Yearly items are spread across 12 months so your balance is realistic. One-time items happen in a specific year.'],
  ['What do you have, and what do you owe?', 'Savings, investments and property at today’s value, and the loans against them.'],
  ['Your plan', 'How much more your goals need, what’s missing, and options to explore. All figures are estimates before tax.'],
  ['Save and revisit', 'Download an editable backup file to pick up where you left off, on this or another device.'],
];
const JOURNEY = [
  'Family, when you’d like to retire, what you’ll need, and goals like education or a home.',
  'Income, spends, EMIs, monthly investments and insurance, ending with your monthly balance.',
  'Bonuses, school fees and other yearly items, plus one-off income or spends.',
  'Savings, investments, property and loans, and what each one is for.',
  'How much more is needed, what’s missing, and options to close the gap.',
  'Save an editable backup to pick up later.',
];
const NEXT = ['Continue to monthly money', 'Continue to yearly items', 'Continue to what I have', 'See my plan', 'Save and revisit', ''];
const COMING_SOON = [
  'Downloadable A4 PDF report, with an option to hide names',
  'Stress test: lower returns, higher inflation, lower income, retiring earlier',
  'Interactive “What if…” sliders to combine several options',
  'Life timeline showing when goals arrive and family ages',
  'Tax-aware estimates',
  'Separate retirement timeline for a partner',
  'Install on your phone and use offline',
];

const thisYear = () => new Date().getFullYear();

export default function App() {
  const [plan, setPlan] = useState<Plan>(() => sample(thisYear()));
  const [screen, setScreen] = useState<'welcome' | 'app'>('welcome');
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [tab, setTab] = useState<Tab>('summary');
  const [keepLocal, setKeepLocal] = useState(false);
  const [sheet, setSheet] = useState<null | 'privacy' | 'steps' | 'snapshot'>(null);
  const [toast, setToast] = useState('');
  const [pw, setPw] = useState('');
  const [pending, setPending] = useState<Extract<ParsedFile, { kind: 'encrypted' }>['file'] | null>(null);
  const [pendingPw, setPendingPw] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const say = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3200);
  }, []);

  // Resume a plan saved on this device (only if the user turned saving on earlier).
  useEffect(() => {
    const saved = loadLocal();
    if (saved) { setPlan(saved.plan); setStep(saved.step); setMaxStep(6); setScreen('app'); setKeepLocal(true); }
  }, []);
  useEffect(() => { if (keepLocal && screen === 'app') saveLocal(plan, step); }, [plan, step, keepLocal, screen]);

  const update = useCallback((fn: (p: Plan) => void) => setPlan(prev => { const next = structuredClone(prev); fn(next); return next; }), []);
  const c: CalcResult = useMemo(() => calc(plan, { year: thisYear() }), [plan]);
  const missing = useMemo(() => missingItems(plan), [plan]);

  const top = () => { try { window.scrollTo(0, 0); } catch { /* ignore */ } };
  const go = (n: number) => { setStep(n); setMaxStep(m => Math.max(m, n)); setSheet(null); top(); };
  const start = (p: Plan, atStep = p.sample ? 5 : 1) => { setPlan(p); setScreen('app'); setStep(atStep); setMaxStep(p.sample ? 6 : atStep); setTab('summary'); top(); };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 2_000_000) { say('That file is too large to be a Kosh backup'); return; }
    f.text().then(text => {
      const r = parseBackup(text);
      if (r.kind === 'encrypted') { setPending(r.file); setPendingPw(''); }
      else if (r.kind === 'plan') { start(r.plan, 5); setMaxStep(6); say('Plan restored from backup'); }
      else say('That file isn’t a Kosh backup');
    });
  };
  const unlock = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const p = await decryptBackup(pending, pendingPw);
      if (!p) throw new Error('bad');
      setPending(null); setPendingPw(''); start(p, 5); setMaxStep(6); say('Plan restored from backup');
    } catch { say('Wrong password, or the file is damaged'); }
    setBusy(false);
  };
  const doExport = async () => {
    setBusy(true);
    try { await exportBackup(plan, pw); say(pw ? 'Encrypted backup saved' : 'Backup saved without a password'); }
    catch { say('Could not create the backup in this browser'); }
    setBusy(false);
  };
  const toggleSave = (on: boolean) => {
    setKeepLocal(on);
    if (on) { saveLocal(plan, step); say('Plan will be saved in this browser'); } else { clearLocal(); say('Saving turned off and removed from this browser'); }
  };
  const deletePlan = () => {
    clearLocal(); setKeepLocal(false); setSheet(null); setPlan(sample(thisYear())); setScreen('welcome'); setStep(1); setMaxStep(1);
    say('Your plan was deleted from this device');
  };

  const fileInput = <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />;
  const header = (
    <header className="header">
      <button className="brand" onClick={() => { setScreen('welcome'); setSheet(null); }} aria-label="Kosh home"><b>Kosh</b><span>Personal Wealth Calculator</span></button>
      <div className="header-right">
        {screen === 'app' && plan.sample && <div className="sample-chip"><span>Sample</span><button onClick={() => start(blank())}>Use my numbers</button></div>}
        <button className="pill" onClick={() => setSheet('privacy')}>
          <span className="dot" style={{ background: keepLocal ? 'var(--amber)' : 'var(--green)' }} />{keepLocal ? 'Saved here' : 'Session only'}
        </button>
      </div>
    </header>
  );
  const privacySheet = sheet === 'privacy' && (
    <Sheet title="Your numbers stay on this device" onClose={() => setSheet(null)}>
      <p className="desc">Kosh runs entirely in your browser. There is no server, no account, no analytics and no tracking. Nothing you enter is sent anywhere, and no PAN, Aadhaar or bank details are asked for.</p>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', padding: '14px 0', borderTop: '1px solid var(--divider)', borderBottom: '1px solid var(--divider)' }}>
        <div><b style={{ fontSize: 14 }}>Save on this device</b><p className="hint">Off by default. On a shared computer, others using this browser could open your plan.</p></div>
        <Toggle on={keepLocal} onChange={toggleSave} label="Save on this device" />
      </div>
      <button className="btn btn-danger" onClick={deletePlan}>Delete my saved plan</button>
    </Sheet>
  );
  const toastEl = toast && <div className="toast" role="status">{toast}</div>;
  const passwordSheet = pending && (
    <Sheet title="This backup is password-protected" onClose={() => setPending(null)}>
      <Field label="Password"><input className="input" type="password" autoFocus value={pendingPw} onChange={e => setPendingPw(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') unlock(); }} /></Field>
      <button className="btn btn-primary" disabled={busy || !pendingPw} onClick={unlock}>{busy ? 'Unlocking…' : 'Unlock and open'}</button>
    </Sheet>
  );
  const disclaimer = <p className="disclaimer">Kosh is a calculator. It does not provide investment, tax or financial advice. All figures are estimates before tax.</p>;

  if (screen === 'welcome') {
    return (
      <div className="page welcome-page">
        {header}
        <main className="welcome">
          <div className="stack-lg">
            <div className="eyebrow">Personal Wealth Calculator</div>
            <h1 className="h1">Your family’s wealth management, planned and visualised clearly.</h1>
            <p className="lead">Set your goals, add what comes in and goes out, and see how much more you need, what’s missing and what options you have. No account, no bank connection.</p>
            <div className="stack" style={{ gap: 10 }}>
              <button className="btn btn-primary btn-lg" onClick={() => start(sample(thisYear()))}>Try with a sample family</button>
              <button className="btn btn-lg" onClick={() => start(blank())}>Start with my numbers</button>
              <button className="btn-link" onClick={() => fileRef.current?.click()}>Resume from a backup file</button>
            </div>
            <div className="ticks">
              <div>No account or sign-up</div><div>No bank connection, PAN or Aadhaar</div>
              <div>Calculations run in your browser</div><div>Nothing is collected or measured</div>
            </div>
          </div>
          <div className="stack">
            <section className="card">
              <div className="card-title"><h3 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 21 }}>Your first plan</h3><span className="hint">About 10–15 minutes</span></div>
              {JOURNEY.map((d, i) => (
                <div className="journey" key={i}><div className="n">{i + 1}</div><div><b>{STEPS[i][0]}</b><span>{d}</span></div></div>
              ))}
              <p className="note">Approximate figures are fine. Skip anything and come back to it; the plan is marked provisional until the key numbers are in.</p>
            </section>
            <section className="card card-muted">
              <div className="card-title"><h3>Coming soon</h3><span className="hint">Version 0.2</span></div>
              <div className="soon">{COMING_SOON.map(s => <div key={s}>{s}</div>)}</div>
            </section>
          </div>
        </main>
        {disclaimer}
        {fileInput}{privacySheet}{passwordSheet}{toastEl}
      </div>
    );
  }

  const done = (n: number) => n !== step && n <= maxStep;
  const stepList = STEPS.map(([label, sub], i) => {
    const n = i + 1;
    return (
      <button key={n} className={'stepbtn' + (done(n) ? ' done' : '')} aria-current={n === step ? 'step' : undefined} onClick={() => go(n)}>
        <span className="mark">{done(n) ? '✓' : n}</span><span><b>{label}</b><span>{sub}</span></span>
      </button>
    );
  });
  const completePct = Math.round(((6 - missing.length) / 6) * 100);
  const snapshot = (
    <div className="snapshot">
      <div><small>Monthly balance</small><div className="big" style={{ color: c.balance < 0 ? '#F2A58E' : '#fff' }}>{inr(c.balance)}</div></div>
      <div className="kv"><span>Monthly income</span><span>{inr(c.incomeM)}</span></div>
      <div className="kv"><span>Monthly investments</span><span>{inr(c.invest + c.investPayroll)}</span></div>
      <div className="kv"><span>Net worth</span><span>{cmp(c.netWorth)}</span></div>
      <div className="kv"><span>Goals need each month</span><span>{inr(c.required)}</span></div>
      <div className="kv"><span>Still to find each month</span><span>{c.gapM > 0 ? inr(c.gapM) : 'Nothing'}</span></div>
      {missing.length > 0 && <div className="miss"><b>Results are provisional</b><ul>{missing.map(m => <li key={m}>{m}</li>)}</ul></div>}
    </div>
  );
  const props = { plan, update, c };

  return (
    <div className="page">
      {header}
      <div className="stepbar">
        <div className="stepbar-top">
          <div className="stepbar-title">Step {step} of 6 · <b>{STEPS[step - 1][0]}</b></div>
          <button onClick={() => setSheet('steps')}>All steps</button>
        </div>
        <div className="bar"><div style={{ width: (step / 6) * 100 + '%' }} /></div>
      </div>
      <div className="app">
        <nav className="nav" aria-label="Plan steps">
          {stepList}
          <div className="complete">
            <div className="kv"><b>Plan completeness</b><b>{completePct}%</b></div>
            <div className="bar"><div style={{ width: completePct + '%' }} /></div>
            <span className="hint">{missing.length ? missing.length + ' key item' + (missing.length > 1 ? 's' : '') + ' still to add' : 'All key numbers are in'}</span>
          </div>
        </nav>
        <main className="main">
          <div className="step-head">
            <div className="step-eyebrow">Step {step} of 6</div>
            <h2 className="h2">{HEAD[step - 1][0]}</h2>
            <p className="desc">{HEAD[step - 1][1]}</p>
            {step >= 5 && missing.length > 0 && <button className="chip-warn" style={{ border: 0 }} onClick={() => setSheet('snapshot')}>Provisional · {missing.length} to add</button>}
          </div>
          <div className="cols">
            <div className="content">
              {step === 1 && <YouAndGoals {...props} />}
              {step === 2 && <Monthly {...props} />}
              {step === 3 && <Yearly {...props} />}
              {step === 4 && <HaveOwe {...props} />}
              {step === 5 && <Explore {...props} tab={tab} setTab={setTab} />}
              {step === 6 && (
                <>
                  <section className="card">
                    <h3>Editable backup file</h3>
                    <p className="desc">A file you keep. Open it here later to continue, on this or another device. It is never uploaded.</p>
                    <Field label="Password" hint="Optional, but recommended. Without it, anyone with the file can read it.">
                      <input className="input" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Leave empty for no password" />
                    </Field>
                    <p className="hint">If you forget the password, the file can’t be opened. There is no way to recover it.</p>
                    <div className="row">
                      <button className="btn btn-primary" disabled={busy} onClick={doExport}>{busy ? 'Working…' : 'Download backup'}</button>
                      <button className="btn" onClick={() => fileRef.current?.click()}>Open a backup</button>
                    </div>
                  </section>
                  <section className="card">
                    <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                      <div><h3>Save on this device</h3><p className="hint">Keeps the plan in this browser until you delete it. Off by default.</p></div>
                      <Toggle on={keepLocal} onChange={toggleSave} label="Save on this device" />
                    </div>
                  </section>
                  <section className="card card-muted">
                    <div className="card-title"><h3>Coming soon</h3><span className="hint">Version 0.2</span></div>
                    <div className="soon">{COMING_SOON.map(s => <div key={s}>{s}</div>)}</div>
                  </section>
                </>
              )}
            </div>
            {step <= 4 && <aside className="aside" aria-label="Live snapshot">{snapshot}</aside>}
          </div>
          <div className="bottombar">
            {step <= 4 && (
              <button className="snap-mini" onClick={() => setSheet('snapshot')} aria-label="Open live snapshot">
                <span><small>Monthly balance</small><b style={{ color: c.balance < 0 ? '#F2A58E' : '#fff' }}>{inr(c.balance)}</b></span>
                <span style={{ fontSize: 13, color: '#B9C4BC', whiteSpace: 'nowrap' }}>{missing.length ? missing.length + ' to add · ' : ''}Snapshot ▴</span>
              </button>
            )}
            <div className="navbtns">
              <button className="btn" onClick={() => (step === 1 ? setScreen('welcome') : go(step - 1))}>Back</button>
              {step < 6 && <button className="btn btn-primary" onClick={() => go(step + 1)}>{NEXT[step - 1]}</button>}
            </div>
          </div>
          {disclaimer}
        </main>
      </div>
      {sheet === 'steps' && <Sheet title="Plan steps" onClose={() => setSheet(null)}>{stepList}</Sheet>}
      {sheet === 'snapshot' && <Sheet title="Live snapshot" onClose={() => setSheet(null)}>{snapshot}</Sheet>}
      {fileInput}{privacySheet}{passwordSheet}{toastEl}
    </div>
  );
}
