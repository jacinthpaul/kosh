import { useEffect, useMemo, useState } from 'react';
import { LONG_YEARS, SHORT_YEARS } from './engine/calc';
import { ASSET_CLASS, ASSET_TYPES, CALC_VERSION, CLASS_COLOR, DEFAULT_RATES, TYPE_LABEL } from './engine/data';
import { N, cmp, inr, pct } from './engine/format';
import { findings, options } from './engine/insights';
import type { Assumptions } from './engine/types';
import type { StepProps } from './steps';
import { CodeKey, Field, MoneyInput, NumInput, PreTax, PriorityTag, SEGC, Segmented } from './ui';

export type Tab = 'summary' | 'goals' | 'ret' | 'em' | 'assum';
const TABS: [Tab, string][] = [['summary', 'Summary'], ['goals', 'Goals'], ['ret', 'Retirement'], ['em', 'Emergency fund'], ['assum', 'Assumptions']];

export function Explore(props: StepProps & { tab: Tab; setTab: (t: Tab) => void }) {
  const { tab, setTab } = props;
  return (
    <>
      <div className="tabs" role="tablist">
        {TABS.map(([id, l]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{l}</button>)}
      </div>
      <CodeKey />
      {tab === 'summary' && <Summary {...props} />}
      {tab === 'goals' && <Goals {...props} />}
      {tab === 'ret' && <Retirement {...props} />}
      {tab === 'em' && <Emergency {...props} />}
      {tab === 'assum' && <AssumptionsTab {...props} />}
    </>
  );
}

function Kpi({ label, value, note, cls, color }: { label: string; value: string; note: string; cls?: 't' | 'f'; color?: string }) {
  return <div className="kpi"><small>{label}</small><b className={cls} style={{ color }}>{value}</b><span>{note}</span></div>;
}

function NeedBars({ c }: StepProps) {
  const scale = Math.max(c.required, c.available, 1);
  return (
    <>
      <div>
        <div className="barlabel"><span>Goals need each month</span><span className="t">{inr(c.required)}</span></div>
        <div className="stackbar">
          {c.ordered.filter(it => it.sip > 0).map(it => <div key={it.id} title={it.name + ': ' + inr(it.sip)} style={{ width: pct(it.sip, scale), background: SEGC[it.priority], borderRight: '2px solid var(--card)' }} />)}
        </div>
      </div>
      <div>
        <div className="barlabel"><span>Available each month</span><span className="t">{inr(c.available)}</span></div>
        <div className="stackbar">
          <div style={{ width: pct(Math.min(c.available, scale), scale), background: 'var(--green)' }} />
          {c.gapM > 0 && <div className="hatch" style={{ width: pct(c.gapM, scale) }} title={'Gap: ' + inr(c.gapM)} />}
        </div>
      </div>
      <div className="legend">
        <span style={{ ['--c' as string]: SEGC['Essential'] }}>Essential</span>
        <span style={{ ['--c' as string]: SEGC['Important'] }}>Important</span>
        <span style={{ ['--c' as string]: SEGC['Nice to have'] }}>Nice to have</span>
        {c.gapM > 0 && <span style={{ ['--c' as string]: 'var(--hatch)' }}>Gap</span>}
      </div>
      {c.items.some(i => i.allocLater > 1) && <p className="hint">Part of what goals need is covered later, by EMIs that end ({c.freed.map(f => f.label + ' in ' + f.year).join(', ')}).</p>}
    </>
  );
}

function Summary(props: StepProps) {
  const { plan, c } = props;
  const facts = useMemo(() => findings(plan, c), [plan, c]);
  const opts = useMemo(() => options(plan, c), [plan, c]);
  const monthsCovered = c.monthCost > 0 ? c.emHave / c.monthCost : 0;
  const futureShort = c.ordered.reduce((t, it) => t + it.short, 0);
  return (
    <>
      <div className="kpis">
        <Kpi label="Monthly balance" value={inr(c.balance)} note="After spends, EMIs, investments, premiums and yearly items" cls={c.balance < 0 ? undefined : 't'} color={c.balance < 0 ? 'var(--danger)' : undefined} />
        <Kpi label="Net worth" value={cmp(c.netWorth)} note="What you have minus what you owe" cls="t" />
        <Kpi label="Goals need more" value={c.gapM > 0 ? inr(c.gapM) + '/mo' : 'Nothing'} note={c.gapM > 0 ? 'Beyond what’s available' : 'All goals funded'} cls={c.gapM > 0 ? 't' : undefined} color={c.gapM > 0 ? undefined : 'var(--green)'} />
        <Kpi label="Emergency buffer" value={monthsCovered.toFixed(1) + ' of ' + N(plan.emergency.months) + ' mo'} note={c.emGap > 0 ? cmp(c.emGap) + ' below target' : 'Target reached'} color={c.emGap > 0 ? 'var(--status)' : 'var(--green)'} />
      </div>

      <section className="card">
        <div className="card-title"><h3>How much more is needed</h3><PreTax /></div>
        {c.required <= 0 ? <p className="headline">Add goals to see what they need.</p>
          : c.gapM > 0 ? (
            <>
              <p className="headline">To meet every goal, you need <span className="t">{inr(c.gapM)}</span> more a month.</p>
              <p className="desc">That’s about <b className="t">{cmp(c.lumpToday)}</b> if invested as one amount today. Without it, goals fall <b className="f">{cmp(futureShort)}</b> short in future money.</p>
            </>
          ) : <p className="headline">Every goal is funded{c.unallocated >= 1 ? <>, with <span className="t">{inr(c.unallocated)}</span> a month to spare</> : ''}.</p>}
        {c.emContrib > 0 && <p className="hint">Available = monthly balance of {inr(c.balance)} minus {inr(c.emContrib)} set aside for the emergency fund.</p>}
        {c.required > 0 && <NeedBars {...props} />}
      </section>

      <section className="card">
        <h3>What’s missing</h3>
        <div>
          {facts.map((f, i) => (
            <div className={'finding ' + f.tone} key={i}>
              <span className="ic" aria-hidden>{f.tone === 'short' ? '!' : f.tone === 'ok' ? '✓' : 'i'}</span>
              <div><b>{f.title}</b>{f.detail && <span>{f.detail}</span>}</div>
            </div>
          ))}
        </div>
      </section>

      {opts.length > 0 && (
        <section className="card">
          <h3>Options to explore</h3>
          <p className="hint">Each option is calculated on its own against your plan. These are calculations, not recommendations.</p>
          <div className="list">
            {opts.map(o => (
              <div className="opt" key={o.id}>
                <div className="opt-top"><b>{o.title}</b><span className="saves">−{inr(o.saves)}/mo</span></div>
                <span className="hint">{o.detail}</span>
                <span className="hint">{o.gap < 1 ? 'Closes the gap: every goal funded.' : <>Gap falls to <span className="t">{inr(o.gap)}</span> a month · {o.funded} of {c.items.length} goals funded</>}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <MixCard {...props} />
    </>
  );
}

function MixCard({ c }: StepProps) {
  if (c.assetsTotal <= 0) return null;
  const rows = [...c.mix.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  return (
    <section className="card">
      <h3>Your current mix</h3>
      <p className="hint">What you have today, by asset class. Mutual funds and NPS are counted as equity.</p>
      <div className="mixbar" role="img" aria-label={rows.map(([k, v]) => k + ' ' + Math.round((v / c.assetsTotal) * 100) + '%').join(', ')}>
        {rows.map(([k, v]) => <div key={k} title={k} style={{ width: pct(v, c.assetsTotal), background: CLASS_COLOR[k] }} />)}
      </div>
      <div>
        {rows.map(([k, v]) => (
          <div className="kv" key={k} style={{ padding: '4px 0' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: CLASS_COLOR[k], marginRight: 8 }} />{k}{k === 'Speculative' ? ' (crypto)' : ''}</span>
            <span><span className="t">{cmp(v)}</span> · {Math.round((v / c.assetsTotal) * 100)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Goals(props: StepProps) {
  const { c } = props;
  return (
    <>
      <section className="card">
        <h3>Can the balance cover your goals?</h3>
        <p className="desc">Goals are funded from the monthly balance in priority order, then by date. Lower-priority goals show any shortfall first.</p>
        <NeedBars {...props} />
      </section>
      <section className="card">
        <div className="card-title"><h3>Goals in funding order</h3><PreTax /></div>
        <div>
          {c.ordered.map(it => (
            <div className="goalrow" key={it.id}>
              <div className="goalrow-top"><b>{it.name}</b><span className="hint">{it.year}</span></div>
              <div><PriorityTag p={it.priority} />{it.kind === 'oneTime' && <span className="hint"> · one-time spend</span>}</div>
              {it.today != null && <div className="kv"><span>{it.kind === 'ret' ? 'Yearly need today' : 'Cost today'}</span><span className="t">{cmp(it.today)}</span></div>}
              <div className="kv"><span>{it.kind === 'ret' ? 'Total needed at retirement' : 'Cost in ' + it.year}</span><span className="f">{cmp(it.fv)}</span></div>
              <div className="kv"><span>Already working toward it</span><span className="f">{cmp(it.grown - it.moved)}</span></div>
              {it.carried > 1 && <div className="kv"><span>Carried from {[...new Set(it.carriedFrom)].join(', ')}</span><span className="f">{cmp(it.carried)}</span></div>}
              <div className="kv"><span>Still needs each month</span><span className="t">{inr(it.sip)}</span></div>
              <div className="kv"><span>Covered by your balance</span><span className="t">{inr(it.alloc)}</span></div>
              {it.allocLater > 1 && <div className="kv"><span>From EMIs that end, later</span><span className="t">{inr(it.allocLater)}/mo</span></div>}
              <div className="kv"><span>Return assumed on new amounts</span><span>{(it.rate * 100).toFixed(1)}%</span></div>
              <div className="bar" aria-hidden><div style={{ width: (it.pct * 100).toFixed(1) + '%', background: it.funded ? 'var(--green)' : 'var(--amber)' }} /></div>
              <div className="kv">
                <span>Projected <span className="f">{cmp(it.projected)}</span> of <span className="f">{cmp(it.fv)}</span></span>
                <span style={{ color: it.paused ? 'var(--ph)' : it.funded ? 'var(--green)' : 'var(--status)', fontWeight: 600 }}>
                  {it.paused ? 'Paused' : it.sip < 1 ? 'Covered already' : it.funded ? 'Fully funded' : 'Short ' + inr(it.factor ? it.short / it.factor : 0) + '/mo'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="hint">“Already working toward it” is what linked savings, monthly investments and one-time income are projected to reach by the goal date. Savings beyond what a goal needs carry forward to later goals.</p>
      </section>
    </>
  );
}

function useNarrow() {
  const q = '(max-width: 559px)';
  const [narrow, setNarrow] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q), on = () => setNarrow(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return narrow;
}

function Retirement({ plan, c }: StepProps) {
  const narrow = useNarrow();
  const a0 = c.youAge, a1 = c.lifeExp + 5;
  const ymax = Math.max(c.corpus, ...c.series.map(s => s.bal), 1) * 1.1;
  const W = narrow ? 360 : 720, H = narrow ? 240 : 260, L = 56, T = 16, B = H - 28;
  const cx = (a: number) => L + ((a - a0) / Math.max(1, a1 - a0)) * (W - L - 12);
  const cy = (v: number) => T + (1 - v / ymax) * (B - T);
  const pts = c.series.filter(s => s.age <= a1).map(s => cx(s.age).toFixed(1) + ',' + cy(s.bal).toFixed(1));
  const line = 'M' + pts.join(' L');
  const lastAge = Math.min(a1, c.series[c.series.length - 1].age);
  const area = line + ` L${cx(lastAge).toFixed(1)},${B} L${L},${B} Z`;
  const step = narrow || a1 - a0 > 40 ? 10 : 5;
  const xTicks: number[] = [];
  for (let a = Math.ceil(a0 / step) * step; a <= a1; a += step) xTicks.push(a);
  const retX = cx(c.retAge);
  return (
    <>
      {c.alreadyRetired && <div className="warn">Your age is at or above the retirement age, so these figures aren’t meaningful yet.</div>}
      <div className="kpis">
        <Kpi label="Retire in" value={String(c.ret.year)} note={'At age ' + c.retAge + ', in ' + c.yrsRet + ' years'} />
        <Kpi label="Monthly need at retirement" value={cmp(c.E0 / 12)} note={cmp(N(plan.retirement.expense) - N(plan.retirement.pension)) + ' today, after price rises'} cls="f" />
        <Kpi label={'Needed at ' + c.retAge} value={cmp(c.corpus)} note={'To cover spending until ' + c.lifeExp} cls="f" />
        <Kpi label="Still needs each month" value={inr(c.ret.sip)} note={inr(c.ret.alloc) + ' covered by your balance'} cls="t" />
      </div>
      <section className="card">
        <div className="card-title"><h3>Projected retirement savings</h3><PreTax /></div>
        <p className="headline">{c.lastsTo ? 'With what’s linked today, money is projected to last until age ' + c.lastsTo + '.' : 'Money is projected to last beyond age ' + c.lifeExp + '.'}</p>
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={'Retirement savings by age, from ' + a0 + ' to ' + a1}>
          <rect x={retX} y={T} width={Math.max(0, W - 12 - retX)} height={B - T} fill="#F1EEE6" />
          {[0, 0.5, 1].map(t => (
            <g key={t}>
              <line x1={L} x2={W - 12} y1={cy((ymax / 1.1) * t)} y2={cy((ymax / 1.1) * t)} stroke="#EFECE4" />
              <text x={L - 6} y={cy((ymax / 1.1) * t) + 4} textAnchor="end" fontSize="12" fill="#6B766E">{cmp((ymax / 1.1) * t)}</text>
            </g>
          ))}
          <path d={area} fill="rgba(123,79,160,0.12)" />
          <path d={line} fill="none" stroke="#7B4FA0" strokeWidth="2.5" />
          <line x1={L} x2={W - 12} y1={cy(c.corpus)} y2={cy(c.corpus)} stroke="#1E2A22" strokeDasharray="5 4" />
          <text x={L + 6} y={cy(c.corpus) - 6} fontSize="12" fill="#1E2A22">Needed {cmp(c.corpus)}</text>
          <line x1={retX} x2={retX} y1={T} y2={B} stroke="#1E2A22" strokeDasharray="4 4" />
          <text x={retX + 6} y={T + 14} fontSize="12" fill="#1E2A22">Retire at {c.retAge}</text>
          <line x1={L} x2={W - 12} y1={B} y2={B} stroke="#D3CEC0" />
          {xTicks.map(a => <text key={a} x={cx(a)} y={B + 18} textAnchor="middle" fontSize="12" fill="#6B766E">{a}</text>)}
        </svg>
        <p className="hint">Values are future money. Build-up from savings and monthly investments linked to retirement, plus what your balance covers, then yearly withdrawals from age {c.retAge}.</p>
      </section>
    </>
  );
}

function Emergency({ plan, update, c }: StepProps) {
  const covered = c.monthCost > 0 ? c.emHave / c.monthCost : 0;
  const assets = plan.assets.filter(a => a.earmark === 'emergency');
  return (
    <>
      <section className="card">
        <p className="headline">{c.emGap > 0 ? `You have ${covered.toFixed(1)} months covered. The target you set is ${N(plan.emergency.months)}.` : `Your emergency fund covers ${covered.toFixed(1)} months.`}</p>
        <Field label="Target, in months of spends, EMIs and premiums">
          <Segmented label="Months" value={N(plan.emergency.months)} options={[3, 6, 9, 12].map(n => ({ v: n, l: String(n) }))} onChange={v => update(p => { p.emergency.months = v; })} />
        </Field>
        <div>
          <div className="barlabel"><span><span className="t">{cmp(c.emHave)}</span> of <span className="t">{cmp(c.emTarget)}</span></span><span>{covered.toFixed(1)} months</span></div>
          <div className="bar" style={{ height: 10 }}><div style={{ width: pct(c.emHave, c.emTarget || 1) }} /></div>
        </div>
        <div className="statgrid">
          <Kpi label="One month costs" value={inr(c.monthCost)} note="Spends, EMIs and premiums" cls="t" />
          <Kpi label="Below target" value={c.emGap > 0 ? cmp(c.emGap) : 'None'} note=" " color={c.emGap > 0 ? 'var(--status)' : 'var(--green)'} />
        </div>
        <Field label="Monthly set-aside" hint="Taken from the balance before goals">
          <MoneyInput value={plan.emergency.monthly} onChange={v => update(p => { p.emergency.monthly = v; })} />
        </Field>
        <div className="kv"><span>Time to reach target at this rate</span><b>{c.emGap <= 0 ? 'Reached' : c.emMonths ? c.emMonths + ' months' : 'Enter a monthly amount'}</b></div>
      </section>
      <section className="card">
        <h3>Linked to the emergency fund</h3>
        {assets.length === 0 ? <p className="hint">Nothing linked yet. You can link savings in step 4.</p>
          : assets.map(a => <div className="kv" key={a.id}><span>{a.label || a.type} · {a.access}</span><span className="t">{inr(N(a.value))}</span></div>)}
      </section>
    </>
  );
}

function AssumptionsTab({ plan, update }: StepProps) {
  const rows: [keyof Assumptions, string, string][] = [
    ['ret', 'Return for goals ' + LONG_YEARS + '+ years away', 'On new monthly amounts toward long-term goals'],
    ['safe', 'Return for goals up to ' + SHORT_YEARS + ' years away', 'Safer, debt-like. Goals in between use a blend'],
    ['retPost', 'Return after retirement', 'Applied to savings during retirement'],
    ['inf', 'General inflation', 'Household spending, most goals, one-time spends'],
    ['eduInf', 'Education inflation', 'Default for new education goals'],
    ['healthInf', 'Healthcare inflation', 'Default for new parents’ care goals'],
  ];
  return (
    <>
      <div className="open-assumption">
        <b>Open assumption: tax</b>
        All returns and results are before tax. Tax on interest, capital gains and withdrawals is not included yet, so real amounts may be lower than shown. This will be addressed in a later version.
      </div>
      <section className="card">
        <h3>Your assumptions</h3>
        <p className="hint">These are yours to change. They are estimates, not predictions.</p>
        <div className="fields">
          {rows.map(([k, label, hint]) => (
            <Field key={k} label={label} hint={hint}>
              <NumInput decimals suffix="% a year" value={plan.a[k]} onChange={v => update(p => { p.a[k] = v; })} />
            </Field>
          ))}
        </div>
      </section>
      <section className="card">
        <h3>Growth of savings and investments</h3>
        <p className="hint">Yearly growth by type, used for what you have and your monthly investments. Before tax.</p>
        <div className="fields">
          {ASSET_TYPES.map(t => (
            <Field key={t} label={(TYPE_LABEL[t] ?? t) + (ASSET_CLASS[t] === 'Speculative' ? ' · speculative' : '')} hint={'Default ' + DEFAULT_RATES[t] + '%'}>
              <NumInput decimals suffix="% a year" value={plan.rates[t]} onChange={v => update(p => { p.rates[t] = v; })} />
            </Field>
          ))}
        </div>
      </section>
      <section className="card">
        <h3>Simplifications in this version</h3>
        <ul className="hint" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          <li>Tax, fees and exit loads are not included.</li>
          <li>Monthly investments and incomes stay flat; yearly increases are not modelled unless explored as an option.</li>
          <li>Near-term goals assume a safer return because market-linked values can fall in the short term.</li>
          <li>The emergency fund set-aside is treated as ongoing, even after the target is reached.</li>
          <li>Retirement uses the primary earner’s age only.</li>
          <li>Calculation version {CALC_VERSION}.</li>
        </ul>
      </section>
    </>
  );
}
