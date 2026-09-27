import type { CalcResult } from '../engine/calc';
import type { Plan } from '../engine/types';

/**
 * Builds the PDF in the browser and saves it. The PDF library is loaded only when needed,
 * so it doesn't slow down the app. Nothing is uploaded.
 */
export async function downloadReport(plan: Plan, c: CalcResult, names: boolean) {
  const [{ pdf }, { ReportPdf }, { buildReport }] = await Promise.all([
    import('@react-pdf/renderer'), import('./ReportPdf'), import('./model'),
  ]);
  const now = new Date();
  const r = buildReport(plan, c, { now, names });
  const blob = await pdf(ReportPdf({ r })).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kosh-plan-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
