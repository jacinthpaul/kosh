import { useEffect, useState } from 'react';
import { ASSET_TYPES, CALC_VERSION, RATES } from './engine/data';
import { N, cmp, inr, pct } from './engine/format';
import type { Assumptions } from './engine/types';
import type { StepProps } from './steps';
import { Field, MoneyInput, NumInput, PreTax, PriorityTag, SEGC, Segmented } from './ui';

export type Tab = 'overview' | 'ret' | 'em' | 'assum';
const TABS: [Tab, string][] = [['overview', 'Overview'], ['ret', 'Retirement'], ['em', 'Emergency fund'], ['assum', 'Assumptions']];

export function Explore(props: StepProps & { tab: Tab; setTab: (t: Tab) => void }) {
  const { tab, setTab } = props;
  return (
    <>
      <div className="tabs" role="tablist">
        {TABS.map(([id, l]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{l}</button>)}
      </div>
      {tab === 'overview' && <Overview {...props} />}
      {tab === 'ret' && <Retirement {...props} />}
      {tab === 'em' && <Emergency {...props} />}
      {tab === 'assum' && <AssumptionsTab {...props} />}
    </>
  );
}

function Kpi({ label, value, note, color }: { label: string; value: string; note: string; color?: string }) {
  return <div className="kpi"><small>{label}</small><b style={{ color }}>{value}</b><span>{note}</span></div>;
}

function Overview({ plan, c }: StepProps) {
  const monthsCovered = c.monthCost > 0 ? c.emHave / c.monthCost : 0;
  const scale = Math.max(c.required, c.available, 1);
  return (
    <>
      <div className="kpis">
        <Kpi label="Net worth" value={cmp(c.netWorth)} note="Everything you own minus loans" />
        <Kpi label="Savings for goals" value={cmp(c.forGoals)} note="Excludes emergency fund and items not for goals" />
        <Kpi label="Monthly surplus" value={inr(c.surplus)} note="After expenses, EMIs and yearly costs" color={c.surplus < 0 ? 'var(--danger)' : undefined} />
        <Kpi label="Emergency buffer" value={monthsCovered.toFixed(1) + ' of ' + N(plan.emergency.months) + ' mo'} note={c.emGap > 0 ? cmp(c.emGap) + ' below target' : 'Target reached'} color={c.emGap > 0 ? 'var(--status)' : 'var(--green)'} />
      </div>

      <section className="card">
        <h3>Can the surplus cover your goals?</h3>
        <p className="headline">
          {c.required <= 0 ? 'Add goals to see what the surplus covers.'
            : c.gapM > 0 ? <>Your goals need {inr(c.required)} a month. {inr(c.available)} is available.</>
              : <>All goals fit within the {inr(c.available)} available each month.</>}
        </p>
        {c.required > 0 && <p className="desc">{c.gapM > 0
          ? <>A gap of <b>{inr(c.gapM)}</b> a month. Goals are funded in priority order, then by date, so lower-priority goals show the shortfall first.</>
          : <>{inr(c.available - c.required)} a month is not allocated to any goal.</>}</p>}
        {c.emContrib > 0 && <p className="hint">Available = monthly surplus of {inr(c.surplus)} minus {inr(c.emContrib)} set aside for the emergency fund.</p>}

        <div>
          <div className="barlabel"><span>Needed</span><span>{inr(c.required)}</span></div>
          <div className="stackbar">
            {c.ordered.filter(it => it.sip > 0).map(it => <div key={it.id} title={it.name + ': ' + inr(it.sip)} style={{ width: pct(it.sip, scale), background: SEGC[it.priority], borderRight: '2px solid var(--card)' }} />)}
          </div>
        </div>
        <div>
          <div className="barlabel"><span>Available</span><span>{inr(c.available)}</span></div>
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
      </section>

      <section className="card">
        <div className="card-title"><h3>Goals in funding order</h3><PreTax /></div>
        <div>
          {c.ordered.map(it => (
            <div className="goalrow" key={it.id}>
              <div className="goalrow-top"><b>{it.name}</b><span className="hint">{it.year}</span></div>
              <div><PriorityTag p={it.priority} /></div>
              <div className="kv"><span>Future cost</span><span>{cmp(it.fv)}</span></div>
              <div className="kv"><span>Needs each month</span><span>{inr(it.sip)}</span></div>
              <div className="kv"><span>Allocated from surplus</span><span>{inr(it.alloc)}</span></div>
              <div className="bar" aria-hidden><div style={{ width: (it.pct * 100).toFixed(1) + '%', background: it.funded ? 'var(--green)' : 'var(--amber)' }} /></div>
              <div className="kv">
                <span>Projected {cmp(it.projected)} of {cmp(it.fv)}</span>
                <span style={{ color: it.funded ? 'var(--green)' : 'var(--status)', fontWeight: 600 }}>
                  {it.sip < 1 ? 'Covered by savings' : it.funded ? 'Fully funded' : 'Short ' + inr(it.sip - it.alloc) + '/mo'}
                </span>
              </div>
            </div>
          ))}
        </div>
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
        <Kpi label="Spending at retirement" value={cmp(c.E0 / 12) + '/mo'} note={inr(N(plan.retirement.expense) - N(plan.retirement.pension)) + ' today, grown by inflation'} />
        <Kpi label={'Needed at ' + c.retAge} value={cmp(c.corpus)} note={'To cover spending until ' + c.lifeExp} />
        <Kpi label="Monthly amount needed" value={inr(c.ret.sip)} note={inr(c.ret.alloc) + ' allocated from surplus'} color={c.ret.funded ? 'var(--green)' : 'var(--status)'} />
      </div>
      <section className="card">
        <div className="card-title"><h3>Projected retirement savings</h3><PreTax /></div>
        <p className="headline">{c.lastsTo ? 'With what’s allocated today, money is projected to last until age ' + c.lastsTo + '.' : 'Money is projected to last beyond age ' + c.lifeExp + '.'}</p>
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={'Retirement savings by age, from ' + a0 + ' to ' + a1}>
          <rect x={retX} y={T} width={Math.max(0, W - 12 - retX)} height={B - T} fill="#F1EEE6" />
          {[0, 0.5, 1].map(t => (
            <g key={t}>
              <line x1={L} x2={W - 12} y1={cy((ymax / 1.1) * t)} y2={cy((ymax / 1.1) * t)} stroke="#EFECE4" />
              <text x={L - 6} y={cy((ymax / 1.1) * t) + 4} textAnchor="end" fontSize="12" fill="#6B766E">{cmp((ymax / 1.1) * t)}</text>
            </g>
          ))}
          <path d={area} fill="rgba(46,92,62,0.12)" />
          <path d={line} fill="none" stroke="#2E5C3E" strokeWidth="2.5" />
          <line x1={L} x2={W - 12} y1={cy(c.corpus)} y2={cy(c.corpus)} stroke="#C98A1B" strokeDasharray="5 4" />
          <text x={L + 6} y={cy(c.corpus) - 6} fontSize="12" fill="#7A5210">Needed {cmp(c.corpus)}</text>
          <line x1={retX} x2={retX} y1={T} y2={B} stroke="#1E2A22" strokeDasharray="4 4" />
          <text x={retX + 6} y={T + 14} fontSize="12" fill="#1E2A22">Retire at {c.retAge}</text>
          <line x1={L} x2={W - 12} y1={B} y2={B} stroke="#D3CEC0" />
          {xTicks.map(a => <text key={a} x={cx(a)} y={B + 18} textAnchor="middle" fontSize="12" fill="#6B766E">{a}</text>)}
        </svg>
        <p className="hint">Build-up from savings assigned to retirement, EPF / NPS contributions and the amount allocated from your surplus, then yearly withdrawals from age {c.retAge}. Change inputs in step 4.</p>
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
        <Field label="Target, in months of essentials and EMIs">
          <Segmented label="Months" value={N(plan.emergency.months)} options={[3, 6, 9, 12].map(n => ({ v: n, l: String(n) }))} onChange={v => update(p => { p.emergency.months = v; })} />
        </Field>
        <div>
          <div className="barlabel"><span>{cmp(c.emHave)} of {cmp(c.emTarget)}</span><span>{covered.toFixed(1)} months</span></div>
          <div className="bar" style={{ height: 10 }}><div style={{ width: pct(c.emHave, c.emTarget || 1) }} /></div>
        </div>
        <div className="statgrid">
          <Kpi label="One month costs" value={inr(c.monthCost)} note="Essentials plus EMIs" />
          <Kpi label="Below target" value={c.emGap > 0 ? cmp(c.emGap) : 'None'} note=" " color={c.emGap > 0 ? 'var(--status)' : 'var(--green)'} />
        </div>
        <Field label="Monthly set-aside" hint="Taken from the surplus before goals">
          <MoneyInput value={plan.emergency.monthly} onChange={v => update(p => { p.emergency.monthly = v; })} />
        </Field>
        <div className="kv"><span>Time to reach target at this rate</span><b>{c.emGap <= 0 ? 'Reached' : c.emMonths ? c.emMonths + ' months' : 'Enter a monthly amount'}</b></div>
      </section>
      <section className="card">
        <h3>Assigned to the emergency fund</h3>
        {assets.length === 0 ? <p className="hint">Nothing assigned yet. You can assign savings in step 3.</p>
          : assets.map(a => <div className="kv" key={a.id}><span>{a.label || a.type} · {a.access}</span><span>{inr(N(a.value))}</span></div>)}
      </section>
    </>
  );
}

function AssumptionsTab({ plan, update }: StepProps) {
  const rows: [keyof Assumptions, string, string][] = [
    ['ret', 'Return on new investments', 'Applied to the monthly amounts in this plan'],
    ['retPost', 'Return after retirement', 'Applied to savings during retirement'],
    ['inf', 'General inflation', 'Household spending and most goals'],
    ['eduInf', 'Education inflation', 'Default for new education goals'],
    ['healthInf', 'Healthcare inflation', 'Default for new parents’ care goals'],
    ['epf', 'EPF interest rate', 'Applied to ongoing EPF / NPS contributions'],
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
        <h3>Growth used for existing savings</h3>
        <p className="hint">Fixed yearly rates by type, before tax.</p>
        {ASSET_TYPES.map(k => <div className="kv" key={k}><span>{k}</span><span>{RATES[k]}%</span></div>)}
      </section>
      <section className="card">
        <h3>Simplifications in this version</h3>
        <ul className="hint" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          <li>Tax, fees and exit loads are not included.</li>
          <li>The emergency fund set-aside is treated as ongoing, even after the target is reached.</li>
          <li>Monthly amounts stay flat; yearly increases are not modelled yet.</li>
          <li>Retirement uses the primary earner’s age only.</li>
          <li>Calculation version {CALC_VERSION}.</li>
        </ul>
      </section>
    </>
  );
}
