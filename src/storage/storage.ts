import { CALC_VERSION, SCHEMA_VERSION } from '../engine/data';
import type { Plan } from '../engine/types';
import { toPlan } from './validate';

/* Everything here stays in the browser. Nothing is ever sent over the network. */

export const LOCAL_KEY = 'kosh-plan-v1';

export function loadLocal(): { plan: Plan; step: number } | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    const plan = toPlan(d?.plan);
    return plan ? { plan, step: Number(d.step) >= 1 && Number(d.step) <= 6 ? Number(d.step) : 5 } : null;
  } catch {
    return null;
  }
}
export function saveLocal(plan: Plan, step: number) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ plan, step })); } catch { /* storage full or blocked */ }
}
export function clearLocal() {
  try { localStorage.removeItem(LOCAL_KEY); } catch { /* blocked */ }
}

// ---- Backup file: JSON, optionally AES-GCM 256 with a PBKDF2-SHA256 key ----

const ITERATIONS = 200_000;
const b64 = (u: Uint8Array) => { let s = ''; u.forEach(b => (s += String.fromCharCode(b))); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function deriveKey(pw: string, salt: Uint8Array<ArrayBuffer>, use: KeyUsage) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, [use]);
}

function download(obj: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The backup file contents: plain JSON, or AES-GCM encrypted when a password is given. */
export async function buildBackup(plan: Plan, password: string): Promise<object> {
  const payload = { app: 'kosh', schemaVersion: SCHEMA_VERSION, calcVersion: CALC_VERSION, saved: new Date().toISOString(), plan: { ...plan, sample: false } };
  if (!password) return payload;
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, 'encrypt');
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload))));
  return { app: 'kosh', encrypted: true, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(ct) };
}

export async function exportBackup(plan: Plan, password: string) {
  download(await buildBackup(plan, password), 'kosh-plan-' + new Date().toISOString().slice(0, 10) + '.json');
}

export type ParsedFile = { kind: 'plan'; plan: Plan } | { kind: 'encrypted'; file: EncryptedFile } | { kind: 'invalid' };
interface EncryptedFile { salt: string; iv: string; data: string }

export function parseBackup(text: string): ParsedFile {
  try {
    const d = JSON.parse(text);
    if (d?.encrypted && typeof d.salt === 'string' && typeof d.iv === 'string' && typeof d.data === 'string') {
      return { kind: 'encrypted', file: { salt: d.salt, iv: d.iv, data: d.data } };
    }
    const plan = toPlan(d?.plan);
    return plan ? { kind: 'plan', plan } : { kind: 'invalid' };
  } catch {
    return { kind: 'invalid' };
  }
}

/** Throws if the password is wrong. */
export async function decryptBackup(f: EncryptedFile, password: string): Promise<Plan | null> {
  const key = await deriveKey(password, unb64(f.salt), 'decrypt');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(f.iv) }, key, unb64(f.data));
  return toPlan(JSON.parse(new TextDecoder().decode(pt))?.plan);
}
