import { useEffect, useId, useRef, type ReactNode } from 'react';
import { N, words } from './engine/format';
import type { Num } from './engine/types';

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {hint ? <span className="hint" style={{ marginTop: -4 }}>{hint}</span> : null}
      {children}
    </label>
  );
}

/** Rupee input: digits only, shown with Indian grouping and the amount in words underneath. */
export function MoneyInput({ value, onChange, label, ariaLabel, showWords = true }: { value: number; onChange: (v: number) => void; label?: string; ariaLabel?: string; showWords?: boolean }) {
  return (
    <span className="money" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <input
        className="input" inputMode="numeric" autoComplete="off" aria-label={ariaLabel ?? label}
        value={N(value) ? N(value).toLocaleString('en-IN') : ''} placeholder="0"
        onChange={e => { const d = e.target.value.replace(/[^0-9]/g, '').slice(0, 13); onChange(d === '' ? 0 : Number(d)); }}
      />
      {showWords && <span className="words">{words(value)}</span>}
    </span>
  );
}

export function NumInput({ value, onChange, ariaLabel, placeholder, decimals = false, suffix }: { value: Num; onChange: (v: Num) => void; ariaLabel?: string; placeholder?: string; decimals?: boolean; suffix?: string }) {
  const input = (
    <input
      className="input" inputMode={decimals ? 'decimal' : 'numeric'} autoComplete="off" aria-label={ariaLabel} placeholder={placeholder}
      value={value === '' || value == null ? '' : String(value)}
      onChange={e => {
        const raw = e.target.value.replace(decimals ? /[^0-9.]/g : /[^0-9]/g, '').slice(0, 8);
        // keep a trailing '.' while typing a decimal
        if (decimals && /\.$|\.\d*0$/.test(raw)) { onChange(raw as unknown as Num); return; }
        onChange(raw === '' ? '' : Number(raw));
      }}
    />
  );
  if (!suffix) return input;
  return <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{input}<span className="hint" style={{ flex: 'none' }}>{suffix}</span></span>;
}

export function TextInput({ value, onChange, placeholder, ariaLabel }: { value: string; onChange: (v: string) => void; placeholder?: string; ariaLabel?: string }) {
  return <input className="input" value={value} placeholder={placeholder} aria-label={ariaLabel} maxLength={120} onChange={e => onChange(e.target.value)} />;
}

export function Select<T extends string>({ value, options, onChange, ariaLabel, className = '' }: { value: T; options: { v: T; l: string }[] | T[]; onChange: (v: T) => void; ariaLabel?: string; className?: string }) {
  const opts = (options as (T | { v: T; l: string })[]).map(o => (typeof o === 'string' ? { v: o, l: o } : o));
  return (
    <select className={'select ' + className} value={value} aria-label={ariaLabel} onChange={e => onChange(e.target.value as T)}>
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

export function Segmented<T extends string | number | boolean>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(o => (
        <button key={String(o.v)} type="button" aria-pressed={o.v === value} onClick={() => onChange(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className="toggle" onClick={() => onChange(!on)}><span /></button>;
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} ref={ref} onClick={e => e.stopPropagation()}>
        <div className="sheet-head"><h3 id={id}>{title}</h3><button className="x" aria-label="Close" onClick={onClose}>×</button></div>
        {children}
      </div>
    </div>
  );
}

export const TAG: Record<string, [string, string]> = {
  'Essential': ['#E6EFE7', '#22452F'], 'Important': ['#F3ECDC', '#6B5226'], 'Nice to have': ['#EEEDE8', '#555E57'],
};
export const SEGC: Record<string, string> = { 'Essential': '#2E5C3E', 'Important': '#7FA68A', 'Nice to have': '#C7D6C5' };

export function PriorityTag({ p }: { p: string }) {
  const [bg, fg] = TAG[p] ?? TAG['Important'];
  return <span className="tag" style={{ background: bg, color: fg }}>{p}</span>;
}

/** Legend for the colour code used on every money figure. */
export const CodeKey = () => (
  <div className="codekey" aria-label="Colour key">
    <span><i style={{ background: 'var(--today)' }} />Today’s money</span>
    <span><i style={{ background: 'var(--future)' }} />Future money, after price rises or growth</span>
  </div>
);

export const PreTax =() => <span className="pretax" title="Tax is not yet included in any figure">Before tax</span>;
